import { describe, expect, test, beforeEach, vi } from 'vitest';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  checkGeofences,
  emitirAlertaGeocerca,
  resetGeofenceRadar,
  getNotifiedPlaceIds,
} from '@/services/geofenceRadarService';
import type { Lugar } from '@/data/lugares';

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    notification: vi.fn(),
  },
  NotificationType: {
    Warning: 'WARNING',
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    createChannel: vi.fn(),
    schedule: vi.fn(),
  },
}));

vi.mock('@/services/permissionService', () => ({
  solicitarPermisosNotificaciones: vi.fn(async () => true),
}));

vi.mock('@/services/notificationService', () => ({
  CANAL_TRANSITO_ID: 'transit-alerts',
  inicializarCanalNotificaciones: vi.fn(async () => undefined),
}));

const lugarPrueba: Lugar = {
  id: 'lugar-1',
  nombre: 'Cafetería de Especialidad',
  tipo: 'cafeteria',
  lat: 4.6097,
  lng: -74.0817,
  personalizado: true,
};

describe('geofenceRadarService - Radar de Proximidad y Geocercas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGeofenceRadar();
  });

  test('emite alerta sensorial y háptica al entrar en el radio de 100m', async () => {
    // Coordenadas a menos de 50m del lugar
    const userLat = 4.6099;
    const userLng = -74.0817;

    const alertas = await checkGeofences(userLat, userLng, [lugarPrueba]);

    expect(alertas).toHaveLength(1);
    expect(alertas[0].place.id).toBe('lugar-1');
    expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Warning });
    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({
            title: expect.stringContaining('Cafetería de Especialidad'),
            body: expect.stringContaining('100 metros'),
          }),
        ],
      })
    );
    expect(getNotifiedPlaceIds().has('lugar-1')).toBe(true);
  });

  test('previene spam: no vuelve a disparar si el usuario sigue dentro del radio de 100m', async () => {
    const userLat = 4.6099;
    const userLng = -74.0817;

    // Primer chequeo
    await checkGeofences(userLat, userLng, [lugarPrueba]);
    expect(Haptics.notification).toHaveBeenCalledTimes(1);

    // Segundo chequeo en la misma área
    const alertasSegundo = await checkGeofences(userLat, userLng, [lugarPrueba]);
    expect(alertasSegundo).toHaveLength(0);
    expect(Haptics.notification).toHaveBeenCalledTimes(1); // No incrementó
  });

  test('no alerta si el usuario se encuentra lejos (> 100m)', async () => {
    // Coordenadas a varios kilómetros
    const userLat = 4.7000;
    const userLng = -74.1000;

    const alertas = await checkGeofences(userLat, userLng, [lugarPrueba]);
    expect(alertas).toHaveLength(0);
    expect(Haptics.notification).not.toHaveBeenCalled();
    expect(getNotifiedPlaceIds().has('lugar-1')).toBe(false);
  });

  test('histeresis: resetea enfriamiento al alejarse a más de 150m y vuelve a alertar al reingresar', async () => {
    // 1. Entra a 50m -> Alerta
    await checkGeofences(4.6099, -74.0817, [lugarPrueba]);
    expect(getNotifiedPlaceIds().has('lugar-1')).toBe(true);

    // 2. Se aleja a 130m (dentro de zona de histéresis 100m-150m) -> Sigue enfriado
    await checkGeofences(4.6108, -74.0817, [lugarPrueba]);
    expect(getNotifiedPlaceIds().has('lugar-1')).toBe(true);

    // 3. Se aleja a más de 250m -> Se libera el enfriamiento
    await checkGeofences(4.6130, -74.0817, [lugarPrueba]);
    expect(getNotifiedPlaceIds().has('lugar-1')).toBe(false);

    // 4. Reingresa a menos de 50m -> Debe alertar de nuevo
    const alertasReingreso = await checkGeofences(4.6099, -74.0817, [lugarPrueba]);
    expect(alertasReingreso).toHaveLength(1);
    expect(Haptics.notification).toHaveBeenCalledTimes(2);
  });

  test('emitirAlertaGeocerca dispara haptics de advertencia y programa notificación', async () => {
    await emitirAlertaGeocerca(lugarPrueba);
    expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Warning });
  });
});
