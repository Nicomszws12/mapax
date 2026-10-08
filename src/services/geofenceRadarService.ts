import { Haptics, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { calcularDistancia, type Lugar } from '../data/lugares';
import { solicitarPermisosNotificaciones } from './permissionService';
import { CANAL_TRANSITO_ID, inicializarCanalNotificaciones } from './notificationService';

export interface GeofenceConfig {
  enterRadiusMeters?: number; // Por defecto: 100 metros
  exitRadiusMeters?: number;  // Por defecto: 150 metros (histeresis)
}

export interface GeofenceAlertEvent {
  place: Lugar;
  distanceMeters: number;
}

export const RADIO_ENTRADA_DEFECTO_M = 100;
export const RADIO_SALIDA_DEFECTO_M = 150;

/** Registro reactivo de lugares que ya han emitido alerta mientras el usuario permanece cerca */
const notifiedPlaceIds = new Set<string>();

/**
 * Función de hashing simple para generar identificadores enteros positivos de 32 bits.
 */
function generarIdNumerico(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

/**
 * Emite la respuesta háptica fuerte y programa la notificación local.
 */
export async function emitirAlertaGeocerca(place: Lugar): Promise<void> {
  // 1. Respuesta Háptica
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // ignorar
      }
    }
  }

  // 2. Notificación Local
  try {
    await inicializarCanalNotificaciones();
    const permitido = await solicitarPermisosNotificaciones(false);
    if (permitido) {
      const notifId = generarIdNumerico(`geofence_${place.id}`);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: `📍 ¡Estás cerca de ${place.nombre}!`,
            body: 'Te encuentras a menos de 100 metros de tu lugar guardado.',
            channelId: CANAL_TRANSITO_ID,
            smallIcon: 'ic_launcher',
            iconColor: '#2563EB',
            isExactNotification: false,
          },
        ],
      });
    }
  } catch (error) {
    console.warn('Error al enviar notificación de geocerca:', error);
  }
}

/**
 * Examina todos los lugares registrados contra las coordenadas actuales del GPS.
 * Gestiona automáticamente el enfriamiento (cooldown) y dispara alertas sensoriales.
 */
export async function checkGeofences(
  userLat: number,
  userLng: number,
  places: Lugar[],
  config: GeofenceConfig = {}
): Promise<GeofenceAlertEvent[]> {
  const enterRadius = config.enterRadiusMeters ?? RADIO_ENTRADA_DEFECTO_M;
  const exitRadius = config.exitRadiusMeters ?? RADIO_SALIDA_DEFECTO_M;

  const alertasEmitidas: GeofenceAlertEvent[] = [];

  for (const place of places) {
    const distancia = calcularDistancia(userLat, userLng, place.lat, place.lng);

    // Entrada a la geocerca (<= 100m)
    if (distancia <= enterRadius) {
      if (!notifiedPlaceIds.has(place.id)) {
        notifiedPlaceIds.add(place.id);
        alertasEmitidas.push({ place, distanceMeters: distancia });
        await emitirAlertaGeocerca(place);
      }
    }
    // Salida de la geocerca (> 150m) -> Reseteo de enfriamiento para permitir futuras alertas
    else if (distancia > exitRadius) {
      if (notifiedPlaceIds.has(place.id)) {
        notifiedPlaceIds.delete(place.id);
      }
    }
  }

  return alertasEmitidas;
}

/**
 * Consulta el conjunto actual de IDs notificados (útil para auditoría y testing).
 */
export function getNotifiedPlaceIds(): Set<string> {
  return new Set(notifiedPlaceIds);
}

/**
 * Limpia el registro de enfriamiento de geocercas.
 */
export function resetGeofenceRadar(): void {
  notifiedPlaceIds.clear();
}

export const geofenceRadarService = {
  checkGeofences,
  emitirAlertaGeocerca,
  getNotifiedPlaceIds,
  resetGeofenceRadar,
  RADIO_ENTRADA_DEFECTO_M,
  RADIO_SALIDA_DEFECTO_M,
};

