import { describe, expect, test, beforeEach, vi } from 'vitest';
import { Share } from '@capacitor/share';
import { toastController } from '@ionic/vue';
import {
  sharePlace,
  shareCurrentLocation,
  shareRoute,
  buildPlaceShareMessage,
  buildLocationShareMessage,
  buildRouteShareMessage,
  esCancelacionUsuario,
  type PlaceShareData,
} from '@/services/shareService';

vi.mock('@capacitor/share', () => ({
  Share: {
    canShare: vi.fn(),
    share: vi.fn(),
  },
}));

vi.mock('@ionic/vue', () => ({
  toastController: {
    create: vi.fn(async (options: unknown) => ({
      present: vi.fn(async () => undefined),
      options,
    })),
  },
}));

describe('shareService', () => {
  let clipboardText = '';

  beforeEach(() => {
    vi.clearAllMocks();
    clipboardText = '';

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(async (text: string) => {
          clipboardText = text;
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  describe('Formateo de Mensajes', () => {
    test('buildPlaceShareMessage construye el texto con dirección provista', () => {
      const place: PlaceShareData = {
        name: 'Plaza de Bolívar',
        address: 'Cra. 7 #11-10, La Candelaria',
        lat: 4.5981,
        lng: -74.0760,
      };

      const result = buildPlaceShareMessage(place);
      expect(result.title).toBe('Plaza de Bolívar');
      expect(result.url).toBe('https://maps.google.com/?q=4.5981,-74.076');
      expect(result.text).toContain('📍 ¡Mira este lugar en mi mapa!: Plaza de Bolívar');
      expect(result.text).toContain('📌 Dirección: Cra. 7 #11-10, La Candelaria');
      expect(result.text).toContain('🗺️ Abrir ubicación: https://maps.google.com/?q=4.5981,-74.076');
    });

    test('buildPlaceShareMessage utiliza coordenadas como fallback si no hay dirección', () => {
      const place: PlaceShareData = {
        name: 'Mirador Secreto',
        lat: 4.60001,
        lng: -74.05002,
      };

      const result = buildPlaceShareMessage(place);
      expect(result.text).toContain('📌 Dirección: 4.60001, -74.05002');
    });

    test('buildLocationShareMessage genera el formato amigable de ubicación actual', () => {
      const result = buildLocationShareMessage(4.6533, -74.0836);
      expect(result.title).toBe('Mi ubicación actual');
      expect(result.url).toBe('https://maps.google.com/?q=4.6533,-74.0836');
      expect(result.text).toBe('📍 Mi ubicación actual: https://maps.google.com/?q=4.6533,-74.0836');
    });

    test('buildRouteShareMessage genera el resumen del trayecto vehicular', () => {
      const result = buildRouteShareMessage(
        'Mi ubicación',
        'Parque Metropolitano Simón Bolívar',
        4.6582,
        -74.0934,
        '4.5 km',
        '18 min'
      );
      expect(result.title).toBe('Ruta hacia Parque Metropolitano Simón Bolívar');
      expect(result.url).toBe('https://maps.google.com/?q=4.6582,-74.0934');
      expect(result.text).toContain('🚗 Ruta en camino hacia Parque Metropolitano Simón Bolívar');
      expect(result.text).toContain('📏 Distancia: 4.5 km | ⏱️ Tiempo estimado: 18 min');
      expect(result.text).toContain('🗺️ Destino: https://maps.google.com/?q=4.6582,-74.0934');
    });
  });

  describe('Detección de Cancelación del Usuario', () => {
    test('detecta AbortError y mensajes de cancelación', () => {
      expect(esCancelacionUsuario(new DOMException('Share canceled', 'AbortError'))).toBe(true);
      expect(esCancelacionUsuario({ message: 'User cancelled share dialog' })).toBe(true);
      expect(esCancelacionUsuario({ message: 'Share sheet dismissed' })).toBe(true);
      expect(esCancelacionUsuario({ code: 'SHARE_CANCELED' })).toBe(true);
      expect(esCancelacionUsuario('user cancelled')).toBe(true);
    });

    test('retorna false ante errores reales o valores nulos', () => {
      expect(esCancelacionUsuario(null)).toBe(false);
      expect(esCancelacionUsuario(undefined)).toBe(false);
      expect(esCancelacionUsuario(new Error('Network error'))).toBe(false);
      expect(esCancelacionUsuario({ message: 'Plugin not installed' })).toBe(false);
    });
  });

  describe('Flujos de Compartir Nativo y Fallback', () => {
    test('invoca Share.share cuando Share.canShare retorna true', async () => {
      vi.mocked(Share.canShare).mockResolvedValue({ value: true });
      vi.mocked(Share.share).mockResolvedValue({ activityType: 'com.whatsapp' });

      const exito = await sharePlace({
        name: 'Monserrate',
        lat: 4.605,
        lng: -74.055,
      });

      expect(exito).toBe(true);
      expect(Share.canShare).toHaveBeenCalledTimes(1);
      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Monserrate',
          dialogTitle: 'Compartir sitio con...',
        })
      );
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    test('no activa portapapeles si el usuario cancela voluntariamente la hoja de compartir', async () => {
      vi.mocked(Share.canShare).mockResolvedValue({ value: true });
      vi.mocked(Share.share).mockRejectedValue(new DOMException('Share canceled', 'AbortError'));

      const exito = await shareCurrentLocation(4.6, -74.08);

      expect(exito).toBe(false);
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
      expect(toastController.create).not.toHaveBeenCalled();
    });

    test('copia al portapapeles y muestra toast si Share no está soportado', async () => {
      vi.mocked(Share.canShare).mockResolvedValue({ value: false });

      const exito = await shareCurrentLocation(4.6097, -74.0817);

      expect(exito).toBe(true);
      expect(Share.share).not.toHaveBeenCalled();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://maps.google.com/?q=4.6097,-74.0817'
      );
      expect(clipboardText).toBe('https://maps.google.com/?q=4.6097,-74.0817');
      expect(toastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Enlace copiado al portapapeles',
        })
      );
    });

    test('shareRoute comparte correctamente los parámetros del trayecto', async () => {
      vi.mocked(Share.canShare).mockResolvedValue({ value: true });
      vi.mocked(Share.share).mockResolvedValue({});

      const exito = await shareRoute(
        'Inicio',
        'Aeropuerto El Dorado',
        4.6997,
        -74.1417,
        '12 km',
        '25 min'
      );

      expect(exito).toBe(true);
      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ruta hacia Aeropuerto El Dorado',
          url: 'https://maps.google.com/?q=4.6997,-74.1417',
        })
      );
    });
  });
});

