import { Geolocation, type PermissionStatus as GeoPermissionStatus } from '@capacitor/geolocation';
import { LocalNotifications, type PermissionStatus as NotificationPermissionStatus } from '@capacitor/local-notifications';
import { alertController } from '@ionic/vue';

export interface PermisosEstado {
  ubicacion: boolean;
  notificaciones: boolean;
}

/**
 * Muestra un diálogo amigable en caso de que el usuario haya rechazado un permiso esencial.
 */
export async function mostrarAlertaPermisoRechazado(
  titulo: string,
  mensaje: string
): Promise<void> {
  const alerta = await alertController.create({
    header: titulo,
    subHeader: 'Acceso necesario',
    message: mensaje,
    backdropDismiss: false,
    buttons: [
      {
        text: 'Entendido',
        role: 'cancel',
      },
    ],
  });
  await alerta.present();
}

/**
 * Consulta el estado actual de los permisos de geolocalización.
 */
export async function verificarPermisosUbicacion(): Promise<GeoPermissionStatus> {
  try {
    return await Geolocation.checkPermissions();
  } catch (error) {
    console.warn('Error al verificar permisos de ubicación:', error);
    return { location: 'denied', coarseLocation: 'denied' };
  }
}

/**
 * Solicita los permisos de geolocalización y notifica de forma amigable si fueron denegados.
 * @returns boolean indicando si los permisos están concedidos.
 */
export async function solicitarPermisosUbicacion(mostrarAlertaSiRechaza = true): Promise<boolean> {
  try {
    let estado = await Geolocation.checkPermissions();

    if (estado.location !== 'granted') {
      estado = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
    }

    const concedido = estado.location === 'granted' || estado.coarseLocation === 'granted';

    if (!concedido && mostrarAlertaSiRechaza) {
      await mostrarAlertaPermisoRechazado(
        'Permiso de Ubicación',
        'MapX necesita acceder a tu ubicación precisa para mostrarte en el mapa, calcular distancias y navegar con tráfico en tiempo real. Puedes habilitarlo en Ajustes > Aplicaciones > MapX > Permisos.'
      );
    }

    return concedido;
  } catch (error) {
    console.warn('Error solicitando permisos de ubicación:', error);
    if (mostrarAlertaSiRechaza) {
      await mostrarAlertaPermisoRechazado(
        'Permiso de Ubicación',
        'No se pudo obtener el permiso de geolocalización. Por favor verifica que tu GPS esté encendido.'
      );
    }
    return false;
  }
}

/**
 * Consulta el estado actual de los permisos de notificaciones locales.
 */
export async function verificarPermisosNotificaciones(): Promise<NotificationPermissionStatus> {
  try {
    return await LocalNotifications.checkPermissions();
  } catch (error) {
    console.warn('Error al verificar permisos de notificaciones:', error);
    return { display: 'denied' };
  }
}

/**
 * Solicita los permisos de notificaciones locales y notifica de forma amigable si fueron denegados.
 * @returns boolean indicando si las notificaciones están concedidas.
 */
export async function solicitarPermisosNotificaciones(mostrarAlertaSiRechaza = false): Promise<boolean> {
  try {
    let estado = await LocalNotifications.checkPermissions();

    if (estado.display !== 'granted') {
      estado = await LocalNotifications.requestPermissions();
    }

    const concedido = estado.display === 'granted';

    if (!concedido && mostrarAlertaSiRechaza) {
      await mostrarAlertaPermisoRechazado(
        'Permiso de Notificaciones',
        'MapX utiliza notificaciones locales para avisarte cuando se inicia tu ruta y cuando llegas a menos de 50 metros de tu destino. Puedes activarlas en los Ajustes del sistema.'
      );
    }

    return concedido;
  } catch (error) {
    console.warn('Error solicitando permisos de notificaciones:', error);
    return false;
  }
}

/**
 * Verifica y prepara los permisos requeridos para la navegación completa.
 */
export async function prepararPermisosNavegacion(): Promise<PermisosEstado> {
  const [ubicacionOk, notificacionesOk] = await Promise.all([
    solicitarPermisosUbicacion(true),
    solicitarPermisosNotificaciones(false),
  ]);

  return {
    ubicacion: ubicacionOk,
    notificaciones: notificacionesOk,
  };
}

