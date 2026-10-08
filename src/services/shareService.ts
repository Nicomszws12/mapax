import { Share } from '@capacitor/share';
import { toastController } from '@ionic/vue';

export interface PlaceShareData {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  description?: string;
}

export interface ShareExecutionResult {
  shared: boolean;
  copiedToClipboard: boolean;
  cancelled: boolean;
}

/**
 * Detecta si un error corresponde a la cancelación voluntaria del diálogo
 * de compartir por parte del usuario.
 */
export function esCancelacionUsuario(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object') {
    const err = error as { name?: string; message?: string; code?: string };
    if (err.name === 'AbortError') return true;
    const msg = (err.message ?? '').toLowerCase();
    if (
      msg.includes('cancel') ||
      msg.includes('abort') ||
      msg.includes('dismiss') ||
      msg.includes('descartad') ||
      msg.includes('closed')
    ) {
      return true;
    }
    const code = (err.code ?? '').toLowerCase();
    if (code.includes('cancel') || code.includes('abort')) {
      return true;
    }
  }
  if (typeof error === 'string') {
    const s = error.toLowerCase();
    return s.includes('cancel') || s.includes('abort') || s.includes('dismiss');
  }
  return false;
}

/**
 * Muestra un toast informativo en pantalla usando toastController de Ionic.
 */
export async function mostrarToastCopiado(mensaje = 'Enlace copiado al portapapeles'): Promise<void> {
  try {
    const toast = await toastController.create({
      message: mensaje,
      duration: 2500,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  } catch (error) {
    console.warn('No se pudo mostrar el toast informativo:', error);
  }
}

/**
 * Intenta compartir nativamente; si no es compatible o falla por soporte,
 * copia el enlace al portapapeles y notifica al usuario vía Toast.
 */
export async function ejecutarCompartir(payload: {
  title: string;
  text: string;
  url: string;
  dialogTitle: string;
}): Promise<ShareExecutionResult> {
  // 1. Verificación previa de compatibilidad nativa
  let soporteNativo = false;
  try {
    const can = await Share.canShare();
    soporteNativo = !!can?.value;
  } catch {
    soporteNativo = false;
  }

  if (soporteNativo) {
    try {
      await Share.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
        dialogTitle: payload.dialogTitle,
      });
      return { shared: true, copiedToClipboard: false, cancelled: false };
    } catch (shareError: unknown) {
      // Si el usuario canceló la hoja de compartir, terminamos limpiamente
      if (esCancelacionUsuario(shareError)) {
        return { shared: false, copiedToClipboard: false, cancelled: true };
      }
      console.warn('Fallo en Share.share(), activando fallback:', shareError);
    }
  }

  // 2. Fallback a portapapeles (entorno Web / navegador sin soporte Web Share)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload.url);
      await mostrarToastCopiado('Enlace copiado al portapapeles');
      return { shared: false, copiedToClipboard: true, cancelled: false };
    }
  } catch (clipboardError) {
    console.warn('Fallo al copiar enlace al portapapeles:', clipboardError);
  }

  return { shared: false, copiedToClipboard: false, cancelled: false };
}

/**
 * Construye el enlace universal y el mensaje formateado para un sitio de interés.
 */
export function buildPlaceShareMessage(place: PlaceShareData): {
  title: string;
  text: string;
  url: string;
} {
  const url = `https://maps.google.com/?q=${place.lat},${place.lng}`;
  const direccion = place.address?.trim() || `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`;
  const text = [
    `📍 ¡Mira este lugar en mi mapa!: ${place.name}`,
    `📌 Dirección: ${direccion}`,
    `🗺️ Abrir ubicación: ${url}`,
  ].join('\n');

  return {
    title: place.name,
    text,
    url,
  };
}

/**
 * Comparte un lugar o sitio de interés.
 */
export async function sharePlace(place: PlaceShareData): Promise<boolean> {
  const { title, text, url } = buildPlaceShareMessage(place);
  const res = await ejecutarCompartir({
    title,
    text,
    url,
    dialogTitle: 'Compartir sitio con...',
  });
  return res.shared || res.copiedToClipboard;
}

/**
 * Construye el mensaje amigable para compartir la ubicación actual.
 */
export function buildLocationShareMessage(lat: number, lng: number): {
  title: string;
  text: string;
  url: string;
} {
  const url = `https://maps.google.com/?q=${lat},${lng}`;
  const text = `📍 Mi ubicación actual: ${url}`;
  return {
    title: 'Mi ubicación actual',
    text,
    url,
  };
}

/**
 * Comparte las coordenadas del usuario en tiempo real.
 */
export async function shareCurrentLocation(lat: number, lng: number): Promise<boolean> {
  const { title, text, url } = buildLocationShareMessage(lat, lng);
  const res = await ejecutarCompartir({
    title,
    text,
    url,
    dialogTitle: 'Compartir mi ubicación con...',
  });
  return res.shared || res.copiedToClipboard;
}

/**
 * Construye el mensaje con el resumen del trayecto de una ruta.
 */
export function buildRouteShareMessage(
  originName: string,
  destinationName: string,
  destLat: number,
  destLng: number,
  distanceKm: string,
  etaMin: string
): {
  title: string;
  text: string;
  url: string;
} {
  const url = `https://maps.google.com/?q=${destLat},${destLng}`;
  const text = [
    `🚗 Ruta en camino hacia ${destinationName}`,
    `📏 Distancia: ${distanceKm} | ⏱️ Tiempo estimado: ${etaMin}`,
    `🗺️ Destino: ${url}`,
  ].join('\n');

  return {
    title: `Ruta hacia ${destinationName}`,
    text,
    url,
  };
}

/**
 * Comparte un resumen del trayecto hacia un destino.
 */
export async function shareRoute(
  originName: string,
  destinationName: string,
  destLat: number,
  destLng: number,
  distanceKm: string,
  etaMin: string
): Promise<boolean> {
  const { title, text, url } = buildRouteShareMessage(
    originName,
    destinationName,
    destLat,
    destLng,
    distanceKm,
    etaMin
  );
  const res = await ejecutarCompartir({
    title,
    text,
    url,
    dialogTitle: 'Compartir ruta con...',
  });
  return res.shared || res.copiedToClipboard;
}

export const shareService = {
  sharePlace,
  shareCurrentLocation,
  shareRoute,
  buildPlaceShareMessage,
  buildLocationShareMessage,
  buildRouteShareMessage,
  ejecutarCompartir,
  esCancelacionUsuario,
  mostrarToastCopiado,
};

