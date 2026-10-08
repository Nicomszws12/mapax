import { LocalNotifications, type Channel } from '@capacitor/local-notifications';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { solicitarPermisosNotificaciones } from './permissionService';

export const CANAL_TRANSITO_ID = 'transit-alerts';

let canalConfigurado = false;

/**
 * Inicializa el canal de notificaciones para Android con prioridad alta.
 */
export async function inicializarCanalNotificaciones(): Promise<void> {
  if (canalConfigurado) return;

  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      const canal: Channel = {
        id: CANAL_TRANSITO_ID,
        name: 'Alertas de Tránsito',
        description: 'Notificaciones sobre navegación, rutas y llegada al destino en MapX',
        importance: 5, // Alta prioridad (Heads-up / sonido / vibración)
        visibility: 1, // Visible en pantalla de bloqueo
        vibration: true,
        lights: true,
        lightColor: '#2563EB',
      };

      await LocalNotifications.createChannel(canal);
    }
    canalConfigurado = true;
  } catch (error) {
    console.warn('No se pudo configurar el canal de notificaciones:', error);
  }
}

/**
 * Dispara una notificación local al iniciar un trayecto calculado.
 */
export async function notificarInicioRuta(nombreDestino: string, minutosEstimados: number): Promise<void> {
  try {
    await inicializarCanalNotificaciones();

    const permisos = await solicitarPermisosNotificaciones(false);
    if (!permisos) {
      console.info('Notificaciones no concedidas; omitiendo alerta de inicio de ruta.');
      return;
    }

    const idNotificacion = Math.floor(Date.now() % 2147483647);
    const tiempoTexto = minutosEstimados > 0 ? `${minutosEstimados} min` : 'menos de 1 min';

    await LocalNotifications.schedule({
      notifications: [
        {
          id: idNotificacion,
          title: `Ruta iniciada hacia ${nombreDestino}`,
          body: `Tiempo estimado: ${tiempoTexto} con tráfico en vivo.`,
          channelId: CANAL_TRANSITO_ID,
          smallIcon: 'ic_launcher',
          iconColor: '#2563EB',
          isExactNotification: false,
        },
      ],
    });
  } catch (error) {
    console.warn('Error al enviar notificación de inicio de ruta:', error);
  }
}

/**
 * Dispara una notificación local al estar a menos de 50 metros del destino.
 */
export async function notificarLlegadaDestino(nombreDestino: string): Promise<void> {
  try {
    await inicializarCanalNotificaciones();

    const permisos = await solicitarPermisosNotificaciones(false);
    if (!permisos) {
      return;
    }

    const idNotificacion = Math.floor(Date.now() % 2147483647);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: idNotificacion,
          title: '¡Has llegado a tu destino!',
          body: `Te encuentras a menos de 50 metros de ${nombreDestino}.`,
          channelId: CANAL_TRANSITO_ID,
          smallIcon: 'ic_launcher',
          iconColor: '#10B981',
          isExactNotification: false,
        },
      ],
    });
  } catch (error) {
    console.warn('Error al enviar notificación de llegada al destino:', error);
  }
}

/**
 * Vibración háptica de llegada al destino. Usa Haptics nativo y, si no está
 * disponible (web), recurre a la Vibration API. Nunca lanza excepciones.
 */
export async function vibrarAlLlegar(): Promise<void> {
  try {
    await Haptics.notification({ type: NotificationType.Success });
    return;
  } catch (error) {
    console.info('Haptics no disponible, usando navigator.vibrate:', error);
  }

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  } catch (error) {
    console.warn('No se pudo vibrar al llegar al destino:', error);
  }
}

