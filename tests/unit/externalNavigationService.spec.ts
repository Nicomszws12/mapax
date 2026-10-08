import { describe, expect, test, beforeEach, vi } from 'vitest';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { actionSheetController, toastController } from '@ionic/vue';
import {
  buildGoogleMapsUrl,
  buildWazeUrl,
  buildAppleMapsUrl,
  openInGoogleMaps,
  openInWaze,
  openInAppleMaps,
  presentNavigationChooser,
  abrirUrlExterna,
  notificarAppNoDisponible,
} from '@/services/externalNavigationService';

vi.mock('@capacitor/app-launcher', () => ({
  AppLauncher: {
    canOpenUrl: vi.fn(),
    openUrl: vi.fn(),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(() => 'web'),
    isNativePlatform: vi.fn(() => false),
  },
}));

vi.mock('@ionic/vue', () => ({
  actionSheetController: {
    create: vi.fn(async (options: unknown) => ({
      present: vi.fn(async () => undefined),
      options,
    })),
  },
  toastController: {
    create: vi.fn(async (options: unknown) => ({
      present: vi.fn(async () => undefined),
      options,
    })),
  },
}));

describe('externalNavigationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    Object.defineProperty(window, 'open', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  describe('Construcción de URLs y Esquemas', () => {
    test('buildGoogleMapsUrl genera URI nativa de Android y enlace universal web', () => {
      const uriNativa = buildGoogleMapsUrl(4.6097, -74.0817, true);
      expect(uriNativa).toBe('google.navigation:q=4.6097,-74.0817&mode=d');

      const urlWeb = buildGoogleMapsUrl(4.6097, -74.0817, false);
      expect(urlWeb).toBe('https://www.google.com/maps/dir/?api=1&destination=4.6097,-74.0817');
    });

    test('buildWazeUrl genera deep link oficial y esquema nativo', () => {
      const uriNativa = buildWazeUrl(4.6582, -74.0934, true);
      expect(uriNativa).toBe('waze://?ll=4.6582,-74.0934&navigate=yes');

      const urlWeb = buildWazeUrl(4.6582, -74.0934, false);
      expect(urlWeb).toBe('https://waze.com/ul?ll=4.6582,-74.0934&navigate=yes');
    });

    test('buildAppleMapsUrl genera esquema maps:// para iOS', () => {
      const urlApple = buildAppleMapsUrl(4.6533, -74.0836);
      expect(urlApple).toBe('maps://maps.apple.com/?daddr=4.6533,-74.0836&dirflg=d');
    });
  });

  describe('Apertura en Google Maps', () => {
    test('en Android nativo intenta URI de navegación turn-by-turn con AppLauncher', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(AppLauncher.canOpenUrl).mockResolvedValue({ value: true });
      vi.mocked(AppLauncher.openUrl).mockResolvedValue({ completed: true });

      const exito = await openInGoogleMaps(4.6097, -74.0817);

      expect(exito).toBe(true);
      expect(AppLauncher.openUrl).toHaveBeenCalledWith({
        url: 'google.navigation:q=4.6097,-74.0817&mode=d',
      });
    });

    test('en Web abre enlace universal en una nueva pestaña con window.open', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      const exito = await openInGoogleMaps(4.6097, -74.0817);

      expect(exito).toBe(true);
      expect(window.open).toHaveBeenCalledWith(
        'https://www.google.com/maps/dir/?api=1&destination=4.6097,-74.0817',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('Apertura en Waze', () => {
    test('en entorno nativo intenta esquema de Waze', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(AppLauncher.canOpenUrl).mockResolvedValue({ value: true });
      vi.mocked(AppLauncher.openUrl).mockResolvedValue({ completed: true });

      const exito = await openInWaze(4.6582, -74.0934);

      expect(exito).toBe(true);
      expect(AppLauncher.openUrl).toHaveBeenCalledWith({
        url: 'waze://?ll=4.6582,-74.0934&navigate=yes',
      });
    });

    test('en Web abre el enlace universal https://waze.com/ul', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      const exito = await openInWaze(4.6582, -74.0934);

      expect(exito).toBe(true);
      expect(window.open).toHaveBeenCalledWith(
        'https://waze.com/ul?ll=4.6582,-74.0934&navigate=yes',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('Apple Maps y Notificaciones', () => {
    test('openInAppleMaps abre esquema maps://', async () => {
      const exito = await openInAppleMaps(4.6, -74.0);
      expect(exito).toBe(true);
      expect(window.open).toHaveBeenCalledWith(
        'maps://maps.apple.com/?daddr=4.6,-74&dirflg=d',
        '_blank',
        'noopener,noreferrer'
      );
    });

    test('abrirUrlExterna utiliza window.open en entorno web', async () => {
      const exito = await abrirUrlExterna('https://maps.google.com');
      expect(exito).toBe(true);
      expect(window.open).toHaveBeenCalledWith(
        'https://maps.google.com',
        '_blank',
        'noopener,noreferrer'
      );
    });

    test('notificarAppNoDisponible muestra toast de advertencia', async () => {
      await notificarAppNoDisponible('Waze');
      expect(toastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Waze'),
          color: 'warning',
        })
      );
    });
  });

  describe('Selector Visual presentNavigationChooser', () => {
    test('despliega ActionSheet con Google Maps, Waze y Cancelar', async () => {
      await presentNavigationChooser({
        lat: 4.6097,
        lng: -74.0817,
        name: 'Plaza de Bolívar',
      });

      expect(actionSheetController.create).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(actionSheetController.create).mock.calls[0][0] as {
        header: string;
        subHeader: string;
        buttons: Array<{ text: string; role?: string; handler?: () => void }>;
      };

      expect(callArgs.header).toBe('Iniciar navegación en app externa');
      expect(callArgs.subHeader).toBe('Plaza de Bolívar');

      const texts = callArgs.buttons.map(b => b.text);
      expect(texts).toContain('Google Maps');
      expect(texts).toContain('Waze');
      expect(texts).toContain('Cancelar');

      // Ejecutar el handler de Google Maps
      const gMapsBtn = callArgs.buttons.find(b => b.text === 'Google Maps');
      expect(gMapsBtn?.handler).toBeDefined();
      gMapsBtn?.handler?.();
    });

    test('en iOS incluye la opción de Apple Maps', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');

      await presentNavigationChooser({
        lat: 4.65,
        lng: -74.08,
      });

      const callArgs = vi.mocked(actionSheetController.create).mock.calls[0][0] as {
        buttons: Array<{ text: string }>;
      };
      const texts = callArgs.buttons.map(b => b.text);
      expect(texts).toContain('Apple Maps');
    });
  });
});
