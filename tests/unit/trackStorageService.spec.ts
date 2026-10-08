import { describe, expect, test, beforeEach, vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import {
  getSavedTracks,
  saveTrack,
  deleteTrack,
  exportTrackAsGeoJSON,
  type RecordedTrack,
  CLAVE_TRACKS,
} from '@/services/trackStorageService';

vi.mock('@capacitor/preferences', () => {
  const store = new Map<string, string>();
  return {
    Preferences: {
      get: vi.fn(async ({ key }: { key: string }) => ({ value: store.get(key) ?? null })),
      set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
        store.set(key, value);
      }),
      remove: vi.fn(async ({ key }: { key: string }) => {
        store.delete(key);
      }),
      clear: vi.fn(async () => {
        store.clear();
      }),
    },
  };
});

const sampleTrack: RecordedTrack = {
  id: 'track-1',
  name: 'Ruta Monserrate',
  createdAt: '2026-10-07T12:00:00Z',
  durationSeconds: 1800,
  distanceMeters: 2500,
  averageSpeedKmh: 5.0,
  color: '#FF5722',
  points: [
    { lat: 4.605, lng: -74.07, timestamp: 1000, altitude: 2600, speed: 1.4 },
    { lat: 4.607, lng: -74.068, timestamp: 2000, altitude: 2620, speed: 1.5 },
  ],
};

describe('trackStorageService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await Preferences.clear();
  });

  test('getSavedTracks retorna array vacío cuando no hay datos guardados', async () => {
    const tracks = await getSavedTracks();
    expect(tracks).toEqual([]);
  });

  test('saveTrack guarda un nuevo recorrido y getSavedTracks lo recupera', async () => {
    await saveTrack(sampleTrack);
    const tracks = await getSavedTracks();
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toEqual(sampleTrack);
  });

  test('saveTrack actualiza un recorrido si ya existe el mismo id', async () => {
    await saveTrack(sampleTrack);
    const updatedTrack: RecordedTrack = {
      ...sampleTrack,
      name: 'Ruta Monserrate (Actualizada)',
      distanceMeters: 3000,
    };
    await saveTrack(updatedTrack);
    const tracks = await getSavedTracks();
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe('Ruta Monserrate (Actualizada)');
    expect(tracks[0].distanceMeters).toBe(3000);
  });

  test('deleteTrack elimina el recorrido especificado', async () => {
    await saveTrack(sampleTrack);
    const secondTrack: RecordedTrack = {
      ...sampleTrack,
      id: 'track-2',
      name: 'Ruta Simón Bolívar',
    };
    await saveTrack(secondTrack);

    let tracks = await getSavedTracks();
    expect(tracks).toHaveLength(2);

    await deleteTrack('track-1');
    tracks = await getSavedTracks();
    expect(tracks).toHaveLength(1);
    expect(tracks[0].id).toBe('track-2');
  });

  test('getSavedTracks descarta datos corruptos de forma segura', async () => {
    await Preferences.set({ key: CLAVE_TRACKS, value: 'datos invalidos no json' });
    const tracks = await getSavedTracks();
    expect(tracks).toEqual([]);
  });

  test('exportTrackAsGeoJSON exporta formato estándar Feature LineString', () => {
    const geojson = exportTrackAsGeoJSON(sampleTrack);
    expect(geojson.type).toBe('Feature');
    expect(geojson.geometry.type).toBe('LineString');
    expect(geojson.geometry.coordinates).toEqual([
      [-74.07, 4.605, 2600],
      [-74.068, 4.607, 2620],
    ]);
    expect(geojson.properties.name).toBe('Ruta Monserrate');
    expect(geojson.properties.distanceMeters).toBe(2500);
    expect(geojson.properties.pointCount).toBe(2);
  });
});

