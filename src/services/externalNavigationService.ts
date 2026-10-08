import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import {
  actionSheetController,
  toastController,
  type ActionSheetButton,
} from '@ionic/vue';
import {
  carSportOutline,
  closeOutline,
  mapOutline,
  navigateOutline,
} from 'ionicons/icons';

export interface ExternalNavDestination {
  lat: number;
  lng: number;
  name?: string;
}

/**
 * Genera la URL de Google Maps.
 * - Modo nativo Android: URI `google.navigation:q=lat,lng&mode=d` (Inicia navegación paso a paso con voz).
 * - Modo Web / Universal: `https://www.google.com/maps/dir/?api=1&destination=lat,lng`.
 */
export function buildGoogleMapsUrl(lat: number, lng: number, native = false): string {
  if (native) {
    return `google.navigation:q=${lat},${lng}&mode=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Genera el enlace de navegación para Waze.
 * - Modo nativo: URI `waze://?ll=lat,lng&navigate=yes`.
 * - Modo Web / Universal: `https://waze.com/ul?ll=lat,lng&navigate=yes`.
 */
export function buildWazeUrl(lat: number, lng: number, native = false): string {
  if (native) {
    return `waze://?ll=${lat},${lng}&navigate=yes`;
  }
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/**
 * Genera la URL de Apple Maps para dispositivos iOS.
 */
export function buildAppleMapsUrl(lat: number, lng: number): string {
  return `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
}

/**
 * Muestra un aviso en caso de que la aplicación externa no pueda iniciarse.
 */
export async function notificarAppNoDisponible(nombreApp: string): Promise<void> {
  try {
    const toast = await toastController.create({
      message: `No se pudo abrir ${nombreApp}. Verifica que esté instalada en el dispositivo.`,
      duration: 3200,
      position: 'bottom',
      color: 'warning',
    });
    await toast.present();
  } catch (err) {
    console.warn('Error al mostrar toast de app externa no disponible:', err);
  }
}

/**
 * Abre una URL externa utilizando AppLauncher en entornos móviles nativos
 * o window.open en el navegador web.
 */
export async function abrirUrlExterna(url: string): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await AppLauncher.openUrl({ url });
        if (res.completed) return true;
      } catch {
        // Fallback a window.open si openUrl falla
      }
    }

    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    }
  } catch (error) {
    console.warn('Fallo al abrir URL externa:', url, error);
  }
  return false;
}

/**
 * Lanza la navegación hacia el destino en Google Maps.
 */
export async function openInGoogleMaps(lat: number, lng: number): Promise<boolean> {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  if (isNative && platform === 'android') {
    try {
      const nativeUri = buildGoogleMapsUrl(lat, lng, true);
      const canOpen = await AppLauncher.canOpenUrl({ url: nativeUri }).catch(() => ({ value: false }));
      if (canOpen.value) {
        const res = await AppLauncher.openUrl({ url: nativeUri });
        if (res.completed) return true;
      }
    } catch {
      // Fallback a URL universal de Google Maps
    }
  }

  const webUrl = buildGoogleMapsUrl(lat, lng, false);
  return abrirUrlExterna(webUrl);
}

/**
 * Lanza la navegación directa hacia el destino en Waze.
 */
export async function openInWaze(lat: number, lng: number): Promise<boolean> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const nativeUri = buildWazeUrl(lat, lng, true);
      const canOpen = await AppLauncher.canOpenUrl({ url: nativeUri }).catch(() => ({ value: false }));
      if (canOpen.value) {
        const res = await AppLauncher.openUrl({ url: nativeUri });
        if (res.completed) return true;
      }
    } catch {
      // Fallback a enlace universal de Waze
    }
  }

  const webUrl = buildWazeUrl(lat, lng, false);
  return abrirUrlExterna(webUrl);
}

/**
 * Lanza la navegación en Apple Maps (iOS).
 */
export async function openInAppleMaps(lat: number, lng: number): Promise<boolean> {
  const url = buildAppleMapsUrl(lat, lng);
  return abrirUrlExterna(url);
}

/**
 * Despliega un Action Sheet moderno para que el usuario elija
 * su navegador GPS externo preferido (Google Maps, Waze, etc.).
 */
export async function presentNavigationChooser(destination: ExternalNavDestination): Promise<void> {
  const { lat, lng, name } = destination;
  const isIos = Capacitor.getPlatform() === 'ios';

  const buttons: ActionSheetButton[] = [
    {
      text: 'Google Maps',
      icon: navigateOutline,
      handler: () => {
        void (async () => {
          try {
            const exito = await openInGoogleMaps(lat, lng);
            if (!exito) {
              await notificarAppNoDisponible('Google Maps');
            }
          } catch (error) {
            console.error('Error al abrir Google Maps:', error);
            await notificarAppNoDisponible('Google Maps');
          }
        })();
      },
    },
    {
      text: 'Waze',
      icon: carSportOutline,
      handler: () => {
        void (async () => {
          try {
            const exito = await openInWaze(lat, lng);
            if (!exito) {
              await notificarAppNoDisponible('Waze');
            }
          } catch (error) {
            console.error('Error al abrir Waze:', error);
            await notificarAppNoDisponible('Waze');
          }
        })();
      },
    },
  ];

  if (isIos) {
    buttons.push({
      text: 'Apple Maps',
      icon: mapOutline,
      handler: () => {
        void (async () => {
          try {
            const exito = await openInAppleMaps(lat, lng);
            if (!exito) {
              await notificarAppNoDisponible('Apple Maps');
            }
          } catch (error) {
            console.error('Error al abrir Apple Maps:', error);
            await notificarAppNoDisponible('Apple Maps');
          }
        })();
      },
    });
  }

  buttons.push({
    text: 'Cancelar',
    role: 'cancel',
    icon: closeOutline,
  });

  const actionSheet = await actionSheetController.create({
    header: 'Iniciar navegación en app externa',
    subHeader: name || 'Destino seleccionado',
    buttons,
  });

  await actionSheet.present();
}

export const externalNavigationService = {
  presentNavigationChooser,
  openInGoogleMaps,
  openInWaze,
  openInAppleMaps,
  buildGoogleMapsUrl,
  buildWazeUrl,
  buildAppleMapsUrl,
  abrirUrlExterna,
  notificarAppNoDisponible,
};

