import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { alertController } from '@ionic/vue';
import { Preferences } from '@capacitor/preferences';
import { CLAVE_SITIOS, type Lugar } from '../data/lugares';
import type { TipoPunto } from '../data/categorias';
import {
  CLAVE_TRACKS,
  exportTrackAsGeoJSON,
  type RecordedTrack,
  type TrackPoint,
} from './trackStorageService';

export interface BackupGeoJSONMetadata {
  app: string;
  version: string;
  exportDate: string;
  placesCount: number;
  tracksCount: number;
}

export interface GeoJSONPointFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    id: string;
    nombre: string;
    tipo: string;
    descripcion?: string;
    fotos?: string[];
    personalizado: boolean;
    isFavorite?: boolean;
    fechaCreacion?: string;
    categoria?: string;
    itemType?: 'place';
  };
}

export interface GeoJSONLineStringFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: number[][]; // [lng, lat, altitude?]
  };
  properties: {
    id: string;
    name: string;
    createdAt: string;
    durationSeconds: number;
    distanceMeters: number;
    averageSpeedKmh: number;
    color: string;
    pointCount: number;
    itemType?: 'track';
  };
}

export type BackupFeature = GeoJSONPointFeature | GeoJSONLineStringFeature;

export interface BackupGeoJSON {
  type: 'FeatureCollection';
  metadata: BackupGeoJSONMetadata;
  features: BackupFeature[];
}

export interface ParsedBackupData {
  places: Lugar[];
  tracks: RecordedTrack[];
}

/**
 * Genera el nombre estándar para el archivo de respaldo: mapa-backup-YYYY-MM-DD.geojson.
 */
export function generarNombreArchivoBackup(fecha = new Date()): string {
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `mapa-backup-${yyyy}-${mm}-${dd}.geojson`;
}

/**
 * Construye la estructura estándar GeoJSON FeatureCollection consolidando
 * lugares guardados y recorridos grabados.
 */
export function buildBackupGeoJSON(
  places: Lugar[],
  tracks: RecordedTrack[],
  exportDate = new Date().toISOString()
): BackupGeoJSON {
  const placeFeatures: GeoJSONPointFeature[] = places.map(p => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [p.lng, p.lat],
    },
    properties: {
      id: p.id,
      nombre: p.nombre,
      tipo: p.tipo,
      descripcion: p.descripcion,
      fotos: p.fotos ? [...p.fotos] : [],
      personalizado: p.personalizado,
      isFavorite: p.isFavorite,
      fechaCreacion: p.fechaCreacion,
      categoria: p.categoria,
      itemType: 'place',
    },
  }));

  const trackFeatures: GeoJSONLineStringFeature[] = tracks.map(t => {
    const raw = exportTrackAsGeoJSON(t);
    return {
      type: 'Feature',
      geometry: raw.geometry,
      properties: {
        ...raw.properties,
        itemType: 'track',
      },
    };
  });

  return {
    type: 'FeatureCollection',
    metadata: {
      app: 'MapX',
      version: '1.0',
      exportDate,
      placesCount: places.length,
      tracksCount: tracks.length,
    },
    features: [...placeFeatures, ...trackFeatures],
  };
}

/**
 * Exporta el archivo de respaldo:
 * - En móvil (Android/iOS): escribe en Directory.Cache y abre Share.share().
 * - En web: descarga el Blob automáticamente en el navegador.
 */
export async function downloadOrShareBackup(
  geoJsonContent: string,
  fileName = generarNombreArchivoBackup()
): Promise<{ success: boolean; method: 'share' | 'download' }> {
  try {
    if (Capacitor.isNativePlatform()) {
      const fileResult = await Filesystem.writeFile({
        path: fileName,
        data: geoJsonContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      await Share.share({
        title: 'Copia de seguridad MapX',
        text: 'Respaldo de lugares y rutas guardadas en MapX',
        url: fileResult.uri,
        dialogTitle: 'Exportar respaldo GeoJSON',
      });

      return { success: true, method: 'share' };
    }

    // Navegador Web
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([geoJsonContent], { type: 'application/geo+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true, method: 'download' };
    }
  } catch (error) {
    console.warn('Error al exportar o compartir copia de seguridad:', error);
  }

  return { success: false, method: 'download' };
}

/**
 * Valida y procesa un texto JSON/GeoJSON entrante asegurando integridad tipada.
 */
export function validateAndParseGeoJSON(jsonText: string): ParsedBackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('El archivo seleccionado no contiene un formato JSON válido.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Estructura de respaldo no válida.');
  }

  const root = parsed as Record<string, unknown>;
  if (root.type !== 'FeatureCollection' || !Array.isArray(root.features)) {
    throw new Error('El archivo no cumple con el estándar GeoJSON FeatureCollection.');
  }

  const places: Lugar[] = [];
  const tracks: RecordedTrack[] = [];

  for (const item of root.features) {
    if (typeof item !== 'object' || item === null) continue;
    const feat = item as Record<string, unknown>;
    if (feat.type !== 'Feature' || typeof feat.geometry !== 'object' || feat.geometry === null) continue;

    const geom = feat.geometry as Record<string, unknown>;
    const props = (typeof feat.properties === 'object' && feat.properties !== null)
      ? (feat.properties as Record<string, unknown>)
      : {};

    // 1. Punto (Lugar)
    if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
      const coords = geom.coordinates;
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        const TIPOS_VALIDOS: TipoPunto[] = [
          'cafeteria', 'restaurante', 'biblioteca', 'universidad', 'bano',
          'parque', 'hospital', 'tienda', 'iglesia', 'museo', 'gimnasio',
        ];
        const id = typeof props.id === 'string' && props.id ? props.id : `imp_place_${Date.now()}_${places.length}`;
        const nombre = typeof props.nombre === 'string' && props.nombre ? props.nombre : (typeof props.name === 'string' ? props.name : 'Sitio importado');
        const tipo: TipoPunto = typeof props.tipo === 'string' && (TIPOS_VALIDOS as string[]).includes(props.tipo)
          ? (props.tipo as TipoPunto)
          : 'parque';

        places.push({
          id,
          nombre,
          tipo,
          lat,
          lng,
          descripcion: typeof props.descripcion === 'string' ? props.descripcion : undefined,
          fotos: Array.isArray(props.fotos) ? (props.fotos.filter((f): f is string => typeof f === 'string')) : [],
          personalizado: true,
          isFavorite: typeof props.isFavorite === 'boolean' ? props.isFavorite : false,
          fechaCreacion: typeof props.fechaCreacion === 'string' ? props.fechaCreacion : new Date().toISOString(),
          categoria: typeof props.categoria === 'string' ? props.categoria : undefined,
        });
      }
    }
    // 2. Línea (Recorrido grabado)
    else if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
      const coordsArr = geom.coordinates as unknown[];
      const trackPoints: TrackPoint[] = [];

      for (let i = 0; i < coordsArr.length; i++) {
        const coord = coordsArr[i];
        if (Array.isArray(coord) && coord.length >= 2) {
          const lng = Number(coord[0]);
          const lat = Number(coord[1]);
          const altitude = coord.length >= 3 && Number.isFinite(Number(coord[2])) ? Number(coord[2]) : null;

          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            trackPoints.push({
              lat,
              lng,
              timestamp: Date.now() + i * 1000,
              altitude,
              speed: null,
            });
          }
        }
      }

      if (trackPoints.length >= 2) {
        const id = typeof props.id === 'string' && props.id ? props.id : `imp_track_${Date.now()}_${tracks.length}`;
        const name = typeof props.name === 'string' && props.name ? props.name : 'Recorrido importado';
        const color = typeof props.color === 'string' && props.color ? props.color : '#FF5722';
        const durationSeconds = typeof props.durationSeconds === 'number' ? props.durationSeconds : 0;
        const distanceMeters = typeof props.distanceMeters === 'number' ? props.distanceMeters : 0;
        const averageSpeedKmh = typeof props.averageSpeedKmh === 'number' ? props.averageSpeedKmh : 0;

        tracks.push({
          id,
          name,
          createdAt: typeof props.createdAt === 'string' ? props.createdAt : new Date().toISOString(),
          durationSeconds,
          distanceMeters,
          averageSpeedKmh,
          points: trackPoints,
          color,
        });
      }
    }
  }

  return { places, tracks };
}

/**
 * Despliega un diálogo de confirmación para que el usuario elija
 * si combinar o reemplazar los datos existentes.
 */
export async function promptRestoreMode(): Promise<'merge' | 'replace' | 'cancel'> {
  return new Promise(resolve => {
    void (async () => {
      try {
        const alert = await alertController.create({
          header: 'Restaurar Copia de Seguridad',
          message: '¿Cómo deseas aplicar los datos importados sobre tu mapa actual?',
          backdropDismiss: false,
          buttons: [
            {
              text: 'Cancelar',
              role: 'cancel',
              handler: () => resolve('cancel'),
            },
            {
              text: 'Combinar con sitios actuales',
              handler: () => resolve('merge'),
            },
            {
              text: 'Reemplazar todo',
              role: 'destructive',
              handler: () => resolve('replace'),
            },
          ],
        });
        await alert.present();
      } catch {
        resolve('cancel');
      }
    })();
  });
}

/**
 * Aplica los datos restaurados al almacenamiento local según el modo seleccionado.
 */
export async function applyBackupRestore(
  imported: ParsedBackupData,
  mode: 'merge' | 'replace',
  currentPlaces: Lugar[],
  currentTracks: RecordedTrack[]
): Promise<{ finalPlaces: Lugar[]; finalTracks: RecordedTrack[] }> {
  let finalPlaces: Lugar[];
  let finalTracks: RecordedTrack[];

  if (mode === 'replace') {
    // Reemplaza los sitios personalizados y conserva los que no lo sean si existieran
    const predeterminados = currentPlaces.filter(p => !p.personalizado);
    finalPlaces = [...imported.places, ...predeterminados];
    finalTracks = [...imported.tracks];
  } else {
    // Combinar (merge): conserva existentes y agrega nuevos evitando duplicados de ID
    const mapaSitios = new Map<string, Lugar>();
    currentPlaces.forEach(p => mapaSitios.set(p.id, p));
    imported.places.forEach(p => {
      if (!mapaSitios.has(p.id)) {
        mapaSitios.set(p.id, p);
      }
    });
    finalPlaces = Array.from(mapaSitios.values());

    const mapaTracks = new Map<string, RecordedTrack>();
    currentTracks.forEach(t => mapaTracks.set(t.id, t));
    imported.tracks.forEach(t => {
      if (!mapaTracks.has(t.id)) {
        mapaTracks.set(t.id, t);
      }
    });
    finalTracks = Array.from(mapaTracks.values());
  }

  // Guardar en Preferences de forma reactiva
  const soloPersonalizados = finalPlaces.filter(p => p.personalizado);
  await Preferences.set({
    key: CLAVE_SITIOS,
    value: JSON.stringify(soloPersonalizados),
  });

  await Preferences.set({
    key: CLAVE_TRACKS,
    value: JSON.stringify(finalTracks),
  });

  return { finalPlaces, finalTracks };
}

export const backupService = {
  generarNombreArchivoBackup,
  buildBackupGeoJSON,
  downloadOrShareBackup,
  validateAndParseGeoJSON,
  promptRestoreMode,
  applyBackupRestore,
};
