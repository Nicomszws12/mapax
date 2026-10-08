import { computed, ref } from 'vue';
import { calcularDistancia } from '../data/lugares';
import type { TrackPoint } from '../services/trackStorageService';

export const UMBRAL_PRECISION_MAX_M = 30;
export const UMBRAL_MOVIMIENTO_MIN_M = 3;

export interface GpsCoordsInput {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  speed?: number | null;
  timestamp?: number;
}

// Estado reactivo compartido para el grabador de rutas
const isRecording = ref(false);
const isPaused = ref(false);
const elapsedSeconds = ref(0);
const totalDistanceMeters = ref(0);
const recordedPoints = ref<TrackPoint[]>([]);

let timerId: ReturnType<typeof setInterval> | undefined;

function limpiarTemporizador(): void {
  if (timerId !== undefined) {
    clearInterval(timerId);
    timerId = undefined;
  }
}

/**
 * Formatea segundos a texto tipo cronómetro mm:ss o hh:mm:ss.
 */
export function formatearTiempoCronometro(segundosTotales: number): string {
  const segs = Math.max(0, Math.floor(segundosTotales));
  const horas = Math.floor(segs / 3600);
  const minutos = Math.floor((segs % 3600) / 60);
  const segundos = segs % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (horas > 0) {
    return `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
  }
  return `${pad(minutos)}:${pad(segundos)}`;
}

export function useTrackRecorder() {
  const averageSpeedKmh = computed<number>(() => {
    if (elapsedSeconds.value <= 0 || totalDistanceMeters.value <= 0) return 0;
    const km = totalDistanceMeters.value / 1000;
    const horas = elapsedSeconds.value / 3600;
    return Number((km / horas).toFixed(1));
  });

  const formattedTime = computed<string>(() => {
    return formatearTiempoCronometro(elapsedSeconds.value);
  });

  const formattedDistanceKm = computed<string>(() => {
    const km = totalDistanceMeters.value / 1000;
    return `${km.toFixed(2)} km`;
  });

  function startRecording(): void {
    limpiarTemporizador();
    recordedPoints.value = [];
    elapsedSeconds.value = 0;
    totalDistanceMeters.value = 0;
    isPaused.value = false;
    isRecording.value = true;

    timerId = setInterval(() => {
      if (!isPaused.value) {
        elapsedSeconds.value += 1;
      }
    }, 1000);
  }

  function pauseRecording(): void {
    if (!isRecording.value) return;
    isPaused.value = true;
  }

  function resumeRecording(): void {
    if (!isRecording.value) return;
    isPaused.value = false;
  }

  function stopRecording(): void {
    limpiarTemporizador();
    isRecording.value = false;
    isPaused.value = false;
  }

  function resetRecording(): void {
    limpiarTemporizador();
    isRecording.value = false;
    isPaused.value = false;
    elapsedSeconds.value = 0;
    totalDistanceMeters.value = 0;
    recordedPoints.value = [];
  }

  /**
   * Procesa una actualización de coordenadas del GPS.
   * - Descarta puntos con precisión mayor a 30m.
   * - Ignora microvibraciones menores a 3m respecto al punto anterior.
   * - Retorna el TrackPoint agregado o null si fue descartado.
   */
  function addGpsPoint(coords: GpsCoordsInput): TrackPoint | null {
    if (!isRecording.value || isPaused.value) {
      return null;
    }

    if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
      return null;
    }

    // Filtro de precisión deficiente (> 30 m)
    if (typeof coords.accuracy === 'number' && coords.accuracy > UMBRAL_PRECISION_MAX_M) {
      return null;
    }

    const totalPuntos = recordedPoints.value.length;
    if (totalPuntos > 0) {
      const ultimo = recordedPoints.value[totalPuntos - 1];
      const distancia = calcularDistancia(ultimo.lat, ultimo.lng, coords.latitude, coords.longitude);

      // Filtro de microvibración estática (< 3 m)
      if (distancia < UMBRAL_MOVIMIENTO_MIN_M) {
        return null;
      }

      totalDistanceMeters.value += distancia;
    }

    const nuevoPunto: TrackPoint = {
      lat: coords.latitude,
      lng: coords.longitude,
      timestamp: coords.timestamp ?? Date.now(),
      altitude:
        typeof coords.altitude === 'number' && Number.isFinite(coords.altitude)
          ? coords.altitude
          : null,
      speed:
        typeof coords.speed === 'number' && Number.isFinite(coords.speed)
          ? coords.speed
          : null,
    };

    recordedPoints.value.push(nuevoPunto);
    return nuevoPunto;
  }

  return {
    isRecording,
    isPaused,
    elapsedSeconds,
    totalDistanceMeters,
    recordedPoints,
    averageSpeedKmh,
    formattedTime,
    formattedDistanceKm,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    addGpsPoint,
    cleanup: limpiarTemporizador,
  };
}

