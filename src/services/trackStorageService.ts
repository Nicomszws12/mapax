import { Preferences } from '@capacitor/preferences';

export interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
  altitude?: number | null;
  speed?: number | null; // m/s
}

export interface RecordedTrack {
  id: string;
  name: string;
  createdAt: string;
  durationSeconds: number;
  distanceMeters: number;
  averageSpeedKmh: number;
  points: TrackPoint[];
  color: string;
}

export interface TrackGeoJSONFeature {
  type: 'Feature';
  properties: {
    id: string;
    name: string;
    createdAt: string;
    durationSeconds: number;
    distanceMeters: number;
    averageSpeedKmh: number;
    color: string;
    pointCount: number;
  };
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
}

export const CLAVE_TRACKS = 'mapx_recorded_tracks';

/**
 * Obtiene la lista de recorridos guardados en el almacenamiento local.
 */
export async function getSavedTracks(): Promise<RecordedTrack[]> {
  try {
    const { value } = await Preferences.get({ key: CLAVE_TRACKS });
    if (!value) return [];
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is RecordedTrack => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.createdAt === 'string' &&
        typeof item.durationSeconds === 'number' &&
        typeof item.distanceMeters === 'number' &&
        typeof item.averageSpeedKmh === 'number' &&
        Array.isArray(item.points) &&
        typeof item.color === 'string'
      );
    });
  } catch (error) {
    console.error('Error al recuperar recorridos guardados:', error);
    return [];
  }
}

/**
 * Guarda o actualiza un recorrido en el almacenamiento local.
 */
export async function saveTrack(track: RecordedTrack): Promise<void> {
  try {
    const tracks = await getSavedTracks();
    const indiceExistente = tracks.findIndex(t => t.id === track.id);

    let nuevaLista: RecordedTrack[];
    if (indiceExistente >= 0) {
      nuevaLista = [...tracks];
      nuevaLista[indiceExistente] = track;
    } else {
      nuevaLista = [track, ...tracks];
    }

    await Preferences.set({
      key: CLAVE_TRACKS,
      value: JSON.stringify(nuevaLista),
    });
  } catch (error) {
    console.error('Error al guardar recorrido:', error);
    throw error;
  }
}

/**
 * Elimina un recorrido por su identificador único.
 */
export async function deleteTrack(id: string): Promise<void> {
  try {
    const tracks = await getSavedTracks();
    const filtrados = tracks.filter(t => t.id !== id);
    await Preferences.set({
      key: CLAVE_TRACKS,
      value: JSON.stringify(filtrados),
    });
  } catch (error) {
    console.error(`Error al eliminar recorrido ${id}:`, error);
    throw error;
  }
}

/**
 * Exporta un recorrido al estándar GeoJSON (Feature con geometría LineString).
 * En el estándar GeoJSON las coordenadas son [longitud, latitud, elevación?].
 */
export function exportTrackAsGeoJSON(track: RecordedTrack): TrackGeoJSONFeature {
  const coordinates: number[][] = track.points.map(p => {
    if (typeof p.altitude === 'number' && Number.isFinite(p.altitude)) {
      return [p.lng, p.lat, p.altitude];
    }
    return [p.lng, p.lat];
  });

  return {
    type: 'Feature',
    properties: {
      id: track.id,
      name: track.name,
      createdAt: track.createdAt,
      durationSeconds: track.durationSeconds,
      distanceMeters: track.distanceMeters,
      averageSpeedKmh: track.averageSpeedKmh,
      color: track.color,
      pointCount: track.points.length,
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

