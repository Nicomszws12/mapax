import { calcularDistancia } from '../data/lugares';
import type { NavigationStep } from './routingService';

/** Distancia (m) a la que se considera cumplida una maniobra intermedia. */
export const UMBRAL_MANIOBRA_M = 25;
/** Distancia (m) al destino final para considerar la llegada. */
export const UMBRAL_LLEGADA_M = 20;
/** Precisión horizontal máxima (m) con la que se permite avanzar de paso. */
export const PRECISION_MAX_AVANCE_M = 60;

export interface PuntoGeo {
  lat: number;
  lng: number;
}

export interface ResultadoAvance {
  indice: number;
  distanciaAlPaso: number;
  llegada: boolean;
}

export interface MetricasRestantes {
  metros: number;
  segundos: number;
}

/** Distancia Haversine (m) entre un punto y la ubicación [lat, lng] de un paso. */
export function distanciaAPaso(posicion: PuntoGeo, ubicacion: readonly [number, number]): number {
  return calcularDistancia(posicion.lat, posicion.lng, ubicacion[0], ubicacion[1]);
}

/** `true` si la maniobra corresponde a la llegada al destino. */
export function esManiobraFinal(maneuver: string): boolean {
  const m = maneuver.toUpperCase();
  return m.startsWith('ARRIVE') || m === 'REACH_DESTINATION';
}

/**
 * Garantiza que la lista siempre termine en un paso de llegada.
 * Si TomTom no devolvió guiado se crea un único paso hacia el destino, de modo
 * que el HUD y la detección de llegada sigan funcionando.
 */
export function asegurarPasos(
  pasos: readonly NavigationStep[],
  destino: PuntoGeo,
  nombreDestino: string,
  totalMetros: number,
  totalSegundos: number
): NavigationStep[] {
  const ultimo = pasos[pasos.length - 1];
  if (ultimo && esManiobraFinal(ultimo.maneuver)) return [...pasos];

  const llegada: NavigationStep = {
    instruction: `Llegarás a ${nombreDestino}`,
    maneuver: 'ARRIVE',
    location: [destino.lat, destino.lng],
    distanceFromStart: totalMetros,
    timeFromStart: totalSegundos,
  };
  return [...pasos, llegada];
}

/** Rumbo inicial (0° = Norte, sentido horario) del punto `desde` al punto `hasta`. */
export function calcularRumbo(desde: PuntoGeo, hasta: PuntoGeo): number {
  const phi1 = (desde.lat * Math.PI) / 180;
  const phi2 = (hasta.lat * Math.PI) / 180;
  const dLambda = ((hasta.lng - desde.lng) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Evalúa el progreso del usuario sobre la lista de pasos.
 *
 * - Avanza al siguiente paso si está a ≤ 25 m de la maniobra actual, o de la
 *   siguiente (recupera maniobras omitidas tras perder señal GPS).
 * - El último paso nunca se "supera": dispara la llegada a < 20 m. También se
 *   considera llegada si el destino final queda a < 20 m estando en los dos
 *   últimos pasos.
 * - Con `permitirAvance = false` (p. ej. precisión GPS baja) solo se actualiza
 *   la distancia, sin cambiar de paso ni declarar llegada.
 */
export function evaluarAvance(
  posicion: PuntoGeo,
  pasos: readonly NavigationStep[],
  indiceActual: number,
  destino: PuntoGeo,
  permitirAvance = true
): ResultadoAvance {
  if (pasos.length === 0) {
    return { indice: 0, distanciaAlPaso: 0, llegada: false };
  }

  const ultimo = pasos.length - 1;
  let indice = Math.min(Math.max(Math.trunc(indiceActual), 0), ultimo);

  if (permitirAvance) {
    while (indice < ultimo) {
      const alActual = distanciaAPaso(posicion, pasos[indice].location);
      const alSiguiente = distanciaAPaso(posicion, pasos[indice + 1].location);
      if (alActual <= UMBRAL_MANIOBRA_M || alSiguiente <= UMBRAL_MANIOBRA_M) {
        indice += 1;
      } else {
        break;
      }
    }
  }

  const distanciaAlPaso = distanciaAPaso(posicion, pasos[indice].location);
  const distanciaDestino = calcularDistancia(posicion.lat, posicion.lng, destino.lat, destino.lng);
  const enUltimoTramo = indice >= ultimo - 1;
  const llegada =
    permitirAvance &&
    ((indice === ultimo && distanciaAlPaso < UMBRAL_LLEGADA_M) ||
      (enUltimoTramo && distanciaDestino < UMBRAL_LLEGADA_M));

  return { indice, distanciaAlPaso, llegada };
}

/**
 * Distancia y tiempo restantes hasta el destino a partir de la maniobra pendiente
 * y la distancia en línea recta que falta para alcanzarla.
 */
export function calcularMetricasRestantes(
  pasos: readonly NavigationStep[],
  indice: number,
  distanciaAlPaso: number,
  totalMetros: number,
  totalSegundos: number
): MetricasRestantes {
  const paso = pasos[indice];
  if (!paso) return { metros: 0, segundos: 0 };

  const velocidadMedia = totalMetros > 0 && totalSegundos > 0 ? totalMetros / totalSegundos : 0;
  const segundosHastaPaso = velocidadMedia > 0 ? distanciaAlPaso / velocidadMedia : 0;

  return {
    metros: Math.max(0, totalMetros - paso.distanceFromStart) + distanciaAlPaso,
    segundos: Math.max(0, totalSegundos - paso.timeFromStart) + segundosHastaPaso,
  };
}

/**
 * Formatea la distancia a la maniobra con redondeo estable para que el texto
 * no parpadee en cada fix de GPS: múltiplos de 5 m (<100), 10 m (<1000) o 0.1 km.
 */
export function formatearDistanciaManiobra(metros: number): string {
  const m = Math.max(0, metros);
  if (m < 100) return `${Math.round(m / 5) * 5} m`;
  const redondeado = Math.round(m / 10) * 10;
  if (redondeado < 1000) return `${redondeado} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
