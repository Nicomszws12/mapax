import { describe, expect, test, beforeEach, vi } from 'vitest';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { alertController } from '@ionic/vue';
import { Preferences } from '@capacitor/preferences';
import {
  generarNombreArchivoBackup,
  buildBackupGeoJSON,
  validateAndParseGeoJSON,
  downloadOrShareBackup,
  applyBackupRestore,
  promptRestoreMode,
} from '@/services/backupService';
import type { Lugar } from '@/data/lugares';
import type { RecordedTrack } from '@/services/trackStorageService';

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn(async () => ({ uri: 'file:///cache/mapa-backup.geojson' })),
  },
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
}));

vi.mock('@capacitor/share', () => ({
  Share: {
    share: vi.fn(async () => undefined),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}));

vi.mock('@ionic/vue', () => ({
  alertController: {
    create: vi.fn(async (options: unknown) => ({
      present: vi.fn(async () => undefined),
      options,
    })),
  },
}));

vi.mock('@capacitor/preferences', () => {
  const store = new Map<string, string>();
  return {
    Preferences: {
      get: vi.fn(async ({ key }: { key: string }) => ({ value: store.get(key) ?? null })),
      set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
        store.set(key, value);
      }),
    },
  };
});

const samplePlaces: Lugar[] = [
  {
    id: 'lugar-1',
    nombre: 'Plaza Central',
    tipo: 'parque',
    lat: 4.60,
    lng: -74.08,
    personalizado: true,
    descripcion: 'Punto de encuentro',
    fotos: ['foto1.jpg'],
    isFavorite: true,
  },
];

const sampleTracks: RecordedTrack[] = [
  {
    id: 'track-1',
    name: 'Caminata Mañanera',
    createdAt: '2026-10-07T10:00:00Z',
    durationSeconds: 1200,
    distanceMeters: 1800,
    averageSpeedKmh: 5.4,
    color: '#FF5722',
    points: [
      { lat: 4.60, lng: -74.08, timestamp: 1000 },
      { lat: 4.61, lng: -74.08, timestamp: 2000 },
    ],
  },
];

describe('backupService - Exportación e Importación GeoJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Generación y Exportación', () => {
    test('generarNombreArchivoBackup produce formato mapa-backup-YYYY-MM-DD.geojson', () => {
      const fecha = new Date(2026, 9, 8); // Octubre 8, 2026
      const nombre = generarNombreArchivoBackup(fecha);
      expect(nombre).toBe('mapa-backup-2026-10-08.geojson');
    });

    test('buildBackupGeoJSON consolida lugares y tracks en un FeatureCollection válido', () => {
      const geojson = buildBackupGeoJSON(samplePlaces, sampleTracks);

      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.metadata.placesCount).toBe(1);
      expect(geojson.metadata.tracksCount).toBe(1);
      expect(geojson.features).toHaveLength(2);

      const pointFeat = geojson.features.find(f => f.geometry.type === 'Point');
      expect(pointFeat?.geometry.coordinates).toEqual([-74.08, 4.60]); // [lng, lat]
      expect(pointFeat?.properties.nombre).toBe('Plaza Central');

      const lineFeat = geojson.features.find(f => f.geometry.type === 'LineString');
      expect(lineFeat?.geometry.coordinates).toHaveLength(2);
      expect(lineFeat?.properties.name).toBe('Caminata Mañanera');
    });

    test('downloadOrShareBackup en nativo usa Filesystem y Share', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      const res = await downloadOrShareBackup('{"type":"FeatureCollection"}', 'backup.geojson');

      expect(res.success).toBe(true);
      expect(res.method).toBe('share');
      expect(Filesystem.writeFile).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'backup.geojson' })
      );
      expect(Share.share).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validación y Parseo de GeoJSON', () => {
    test('validateAndParseGeoJSON procesa correctamente un FeatureCollection válido', () => {
      const geojson = buildBackupGeoJSON(samplePlaces, sampleTracks);
      const jsonText = JSON.stringify(geojson);

      const parsed = validateAndParseGeoJSON(jsonText);
      expect(parsed.places).toHaveLength(1);
      expect(parsed.places[0].nombre).toBe('Plaza Central');
      expect(parsed.places[0].lat).toBe(4.60);
      expect(parsed.places[0].lng).toBe(-74.08);

      expect(parsed.tracks).toHaveLength(1);
      expect(parsed.tracks[0].name).toBe('Caminata Mañanera');
      expect(parsed.tracks[0].points).toHaveLength(2);
    });

    test('validateAndParseGeoJSON lanza error si el texto no es JSON válido', () => {
      expect(() => validateAndParseGeoJSON('invalido')).toThrow('JSON válido');
    });

    test('validateAndParseGeoJSON lanza error si no es un FeatureCollection', () => {
      expect(() => validateAndParseGeoJSON('{"type":"Point"}')).toThrow('FeatureCollection');
    });

    test('validateAndParseGeoJSON descarta coordenadas fuera del rango válido', () => {
      const jsonText = JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [300, 200] }, // Fuera de rango
            properties: { nombre: 'Inválido' },
          },
        ],
      });

      const parsed = validateAndParseGeoJSON(jsonText);
      expect(parsed.places).toHaveLength(0);
    });
  });

  describe('Restauración y Modos de Combinación / Reemplazo', () => {
    test('applyBackupRestore en modo merge combina datos sin duplicar IDs', async () => {
      const parsedData = {
        places: [
          { ...samplePlaces[0] }, // Mismo ID
          {
            id: 'lugar-2',
            nombre: 'Nuevo Lugar',
            tipo: 'cafeteria' as const,
            lat: 4.65,
            lng: -74.05,
            personalizado: true,
          },
        ],
        tracks: [...sampleTracks],
      };

      const { finalPlaces } = await applyBackupRestore(
        parsedData,
        'merge',
        samplePlaces,
        sampleTracks
      );

      expect(finalPlaces).toHaveLength(2); // lugar-1 y lugar-2
      expect(Preferences.set).toHaveBeenCalledTimes(2);
    });

    test('applyBackupRestore en modo replace sobrescribe los sitios existentes', async () => {
      const nuevoLugar: Lugar = {
        id: 'lugar-nuevo',
        nombre: 'Solo este lugar',
        tipo: 'tienda',
        lat: 4.70,
        lng: -74.03,
        personalizado: true,
      };

      const parsedData = {
        places: [nuevoLugar],
        tracks: [],
      };

      const { finalPlaces, finalTracks } = await applyBackupRestore(
        parsedData,
        'replace',
        samplePlaces,
        sampleTracks
      );

      expect(finalPlaces).toHaveLength(1);
      expect(finalPlaces[0].id).toBe('lugar-nuevo');
      expect(finalTracks).toHaveLength(0);
    });

    test('promptRestoreMode presenta diálogo con las opciones', async () => {
      const promise = promptRestoreMode();
      expect(alertController.create).toHaveBeenCalledTimes(1);

      const callArgs = vi.mocked(alertController.create).mock.calls[0][0] as {
        buttons: Array<{ text: string; role?: string; handler?: () => void }>;
      };
      const texts = callArgs.buttons.map(b => b.text);
      expect(texts).toContain('Combinar con sitios actuales');
      expect(texts).toContain('Reemplazar todo');
      expect(texts).toContain('Cancelar');

      // Simular selección de merge
      const mergeBtn = callArgs.buttons.find(b => b.text === 'Combinar con sitios actuales');
      mergeBtn?.handler?.();
      const res = await promise;
      expect(res).toBe('merge');
    });
  });
});

