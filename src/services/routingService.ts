export interface Coordenada {
  lat: number;
  lng: number;
}

export interface TomTomPoint {
  latitude: number;
  longitude: number;
}

export interface TomTomSummary {
  lengthInMeters: number;
  travelTimeInSeconds: number;
  trafficDelayInSeconds: number;
  trafficLengthInMeters?: number;
  departureTime?: string;
  arrivalTime?: string;
}

export interface TomTomLeg {
  summary?: TomTomSummary;
  points: TomTomPoint[];
}

/** Instrucción de guiado tal como la entrega TomTom en `route.guidance.instructions`. */
export interface TomTomGuidanceInstruction {
  routeOffsetInMeters: number;
  travelTimeInSeconds: number;
  point: TomTomPoint;
  pointIndex?: number;
  instructionType?: string;
  street?: string;
  roadNumbers?: string[];
  maneuver?: string;
  /** Texto legible (presente con `instructionsType=text`). */
  message?: string;
  combinedMessage?: string;
  roundaboutExitNumber?: number;
}

export interface TomTomGuidance {
  instructions?: TomTomGuidanceInstruction[];
}

export interface TomTomRoute {
  summary: TomTomSummary;
  legs: TomTomLeg[];
  guidance?: TomTomGuidance;
}

export interface TomTomRouteResponse {
  formatVersion?: string;
  routes?: TomTomRoute[];
  error?: {
    description?: string;
  };
}

export interface NavigationStep {
  instruction: string;       // ej: "Gira a la derecha en Av. Caracas"
  street?: string;           // Nombre de la vía
  maneuver: string;          // TURN_LEFT, TURN_RIGHT, STRAIGHT, REACH_DESTINATION, etc.
  location: [number, number];// [lat, lng] del punto de la maniobra
  distanceFromStart: number; // Offset en metros
  timeFromStart: number;     // Segundos desde el inicio
}

export interface ResultadoRuta {
  distanciaKm: number;
  distanciaTexto: string;
  /** Distancia total sin redondear, en metros. */
  distanciaMetros: number;
  tiempoMinutos: number;
  tiempoTexto: string;
  /** Tiempo total de viaje (con tráfico) sin redondear, en segundos. */
  tiempoSegundos: number;
  retrasoTraficoSegundos: number;
  estadoTrafico: string;
  esTraficoFluido: boolean;
  puntos: [number, number][]; // [lat, lng]
  steps: NavigationStep[];
}

const TOMTOM_BASE_URL = 'https://api.tomtom.com/routing/1/calculateRoute';
const CLAVE_RESPALDO = 'W7281nTfRH5epge8byUQVIRiyxnI5hW7';

/**
 * Obtiene la API Key de TomTom desde las variables de entorno o usa la clave predeterminada.
 */
export function obtenerTomTomApiKey(): string {
  const envKey = import.meta.env.VITE_TOMTOM_API_KEY;
  if (typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return CLAVE_RESPALDO;
}

/**
 * Formatea minutos a una cadena legible (ej. "14 min" o "1 h 15 min").
 */
export function formatearMinutosLegible(minutosTotales: number): string {
  if (minutosTotales <= 0) return '1 min';
  if (minutosTotales < 60) return `${minutosTotales} min`;
  const horas = Math.floor(minutosTotales / 60);
  const mins = minutosTotales % 60;
  return mins > 0 ? `${horas} h ${mins} min` : `${horas} h`;
}

/**
 * Texto de respaldo por si TomTom no entrega `message` para una maniobra.
 */
const TEXTO_MANIOBRA_RESPALDO: Readonly<Record<string, string>> = {
  DEPART: 'Inicia la ruta',
  STRAIGHT: 'Continúa recto',
  TURN_LEFT: 'Gira a la izquierda',
  TURN_RIGHT: 'Gira a la derecha',
  SHARP_LEFT: 'Gira cerrado a la izquierda',
  SHARP_RIGHT: 'Gira cerrado a la derecha',
  BEAR_LEFT: 'Mantente a la izquierda',
  BEAR_RIGHT: 'Mantente a la derecha',
  KEEP_LEFT: 'Mantente a la izquierda',
  KEEP_RIGHT: 'Mantente a la derecha',
  MAKE_UTURN: 'Haz un retorno',
  ARRIVE: 'Has llegado a tu destino',
  ARRIVE_LEFT: 'Has llegado a tu destino, a la izquierda',
  ARRIVE_RIGHT: 'Has llegado a tu destino, a la derecha',
};

function esNumeroFinito(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

/**
 * Convierte `guidance.instructions` de TomTom en pasos de navegación tipados.
 * Descarta instrucciones sin coordenadas válidas y las devuelve ordenadas por offset.
 */
export function extraerPasosNavegacion(guidance?: TomTomGuidance): NavigationStep[] {
  const instrucciones = guidance?.instructions;
  if (!Array.isArray(instrucciones)) return [];

  const pasos: NavigationStep[] = [];
  for (const item of instrucciones) {
    const punto = item?.point;
    if (!punto || !esNumeroFinito(punto.latitude) || !esNumeroFinito(punto.longitude)) continue;

    const maneuver = item.maneuver?.trim() || 'STRAIGHT';
    const street = item.street?.trim() || undefined;
    const instruction =
      item.message?.trim() ||
      item.combinedMessage?.trim() ||
      (street
        ? `${TEXTO_MANIOBRA_RESPALDO[maneuver] ?? 'Continúa'} en ${street}`
        : TEXTO_MANIOBRA_RESPALDO[maneuver] ?? 'Continúa por la ruta');

    pasos.push({
      instruction,
      street,
      maneuver,
      location: [punto.latitude, punto.longitude],
      distanceFromStart: esNumeroFinito(item.routeOffsetInMeters) ? item.routeOffsetInMeters : 0,
      timeFromStart: esNumeroFinito(item.travelTimeInSeconds) ? item.travelTimeInSeconds : 0,
    });
  }

  return pasos.sort((a, b) => a.distanceFromStart - b.distanceFromStart);
}

/**
 * Consume el endpoint oficial de cálculo de ruta con tráfico en vivo de TomTom Routing API.
 * https://api.tomtom.com/routing/1/calculateRoute/{startLat},{startLon}:{endLat},{endLon}/json?key=${apiKey}&traffic=true&instructionsType=text&language=es-ES&computeTravelTimeFor=all
 */
export async function calcularRutaTomTom(
  origen: Coordenada,
  destino: Coordenada
): Promise<ResultadoRuta> {
  const apiKey = obtenerTomTomApiKey();
  const url = `${TOMTOM_BASE_URL}/${origen.lat},${origen.lng}:${destino.lat},${destino.lng}/json?key=${encodeURIComponent(
    apiKey
  )}&traffic=true&instructionsType=text&language=es-ES&computeTravelTimeFor=all`;

  try {
    const respuesta = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!respuesta.ok) {
      const errorBody = await respuesta.text();
      throw new Error(`Error ${respuesta.status} en TomTom API: ${errorBody || respuesta.statusText}`);
    }

    const data: TomTomRouteResponse = await respuesta.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('TomTom no encontró rutas disponibles para las coordenadas especificadas.');
    }

    const ruta = data.routes[0];
    const summary = ruta.summary;

    // Distancia total en km con 1 decimal
    const kmNum = Number((summary.lengthInMeters / 1000).toFixed(1));
    const distanciaTexto = `${kmNum} km`;

    // Tiempo estimado en minutos
    const minutos = Math.max(1, Math.round(summary.travelTimeInSeconds / 60));
    const tiempoTexto = formatearMinutosLegible(minutos);

    // Retraso por tráfico en tiempo real
    const retrasoSeg = summary.trafficDelayInSeconds ?? 0;
    const esFluido = retrasoSeg <= 60; // 1 minuto o menos se considera fluido
    const minutosRetraso = Math.round(retrasoSeg / 60);

    const estadoTrafico = esFluido
      ? 'Tráfico fluido'
      : `+${minutosRetraso} min de congestión`;

    // Extracción de coordenadas [lat, lng] de todos los tramos (legs)
    const puntos: [number, number][] = [];
    if (ruta.legs && ruta.legs.length > 0) {
      for (const leg of ruta.legs) {
        if (leg.points && Array.isArray(leg.points)) {
          for (const p of leg.points) {
            puntos.push([p.latitude, p.longitude]);
          }
        }
      }
    }

    if (puntos.length === 0) {
      throw new Error('La ruta devuelta por TomTom no contiene puntos geométricos.');
    }

    return {
      distanciaKm: kmNum,
      distanciaTexto,
      distanciaMetros: summary.lengthInMeters,
      tiempoMinutos: minutos,
      tiempoTexto,
      tiempoSegundos: summary.travelTimeInSeconds,
      retrasoTraficoSegundos: retrasoSeg,
      estadoTrafico,
      esTraficoFluido: esFluido,
      puntos,
      steps: extraerPasosNavegacion(ruta.guidance),
    };
  } catch (error) {
    console.error('Error calculando ruta con TomTom Routing API:', error);
    throw error;
  }
}

