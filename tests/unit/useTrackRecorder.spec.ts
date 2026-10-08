import { describe, expect, test, beforeEach, vi } from 'vitest';
import { useTrackRecorder, formatearTiempoCronometro } from '@/composables/useTrackRecorder';

describe('useTrackRecorder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const recorder = useTrackRecorder();
    recorder.resetRecording();
  });

  test('formatearTiempoCronometro formatea mm:ss y hh:mm:ss correctamente', () => {
    expect(formatearTiempoCronometro(0)).toBe('00:00');
    expect(formatearTiempoCronometro(65)).toBe('01:05');
    expect(formatearTiempoCronometro(3600)).toBe('01:00:00');
    expect(formatearTiempoCronometro(3665)).toBe('01:01:05');
  });

  test('startRecording inicia el temporizador y limpia estados previos', () => {
    const recorder = useTrackRecorder();
    recorder.startRecording();

    expect(recorder.isRecording.value).toBe(true);
    expect(recorder.isPaused.value).toBe(false);
    expect(recorder.elapsedSeconds.value).toBe(0);

    vi.advanceTimersByTime(3000);
    expect(recorder.elapsedSeconds.value).toBe(3);
    expect(recorder.formattedTime.value).toBe('00:03');

    recorder.stopRecording();
    expect(recorder.isRecording.value).toBe(false);
  });

  test('pauseRecording detiene el avance del cronómetro y resumeRecording lo reactiva', () => {
    const recorder = useTrackRecorder();
    recorder.startRecording();

    vi.advanceTimersByTime(2000);
    expect(recorder.elapsedSeconds.value).toBe(2);

    recorder.pauseRecording();
    expect(recorder.isPaused.value).toBe(true);

    vi.advanceTimersByTime(3000);
    expect(recorder.elapsedSeconds.value).toBe(2);

    recorder.resumeRecording();
    expect(recorder.isPaused.value).toBe(false);

    vi.advanceTimersByTime(2000);
    expect(recorder.elapsedSeconds.value).toBe(4);

    recorder.stopRecording();
  });

  test('addGpsPoint no agrega puntos si no se está grabando o está en pausa', () => {
    const recorder = useTrackRecorder();

    // Sin iniciar
    const p1 = recorder.addGpsPoint({ latitude: 4.6, longitude: -74.08, accuracy: 10 });
    expect(p1).toBeNull();
    expect(recorder.recordedPoints.value).toHaveLength(0);

    // En pausa
    recorder.startRecording();
    recorder.pauseRecording();
    const p2 = recorder.addGpsPoint({ latitude: 4.6, longitude: -74.08, accuracy: 10 });
    expect(p2).toBeNull();
    expect(recorder.recordedPoints.value).toHaveLength(0);

    recorder.stopRecording();
  });

  test('addGpsPoint descarta puntos con baja precisión (accuracy > 30 m)', () => {
    const recorder = useTrackRecorder();
    recorder.startRecording();

    const p = recorder.addGpsPoint({ latitude: 4.6, longitude: -74.08, accuracy: 45 });
    expect(p).toBeNull();
    expect(recorder.recordedPoints.value).toHaveLength(0);

    recorder.stopRecording();
  });

  test('addGpsPoint acepta el primer punto y aplica filtro de microvibración (< 3 m) a los siguientes', () => {
    const recorder = useTrackRecorder();
    recorder.startRecording();

    // Primer punto: válido
    const p1 = recorder.addGpsPoint({ latitude: 4.60000, longitude: -74.08000, accuracy: 10 });
    expect(p1).not.toBeNull();
    expect(recorder.recordedPoints.value).toHaveLength(1);
    expect(recorder.totalDistanceMeters.value).toBe(0);

    // Desplazamiento mínimo (aprox 1 metro): debe ser descartado
    const p2 = recorder.addGpsPoint({ latitude: 4.600009, longitude: -74.08000, accuracy: 10 });
    expect(p2).toBeNull();
    expect(recorder.recordedPoints.value).toHaveLength(1);

    // Desplazamiento significativo (~11 metros al norte: 0.0001 lat): debe agregarse
    const p3 = recorder.addGpsPoint({ latitude: 4.60010, longitude: -74.08000, accuracy: 10 });
    expect(p3).not.toBeNull();
    expect(recorder.recordedPoints.value).toHaveLength(2);
    expect(recorder.totalDistanceMeters.value).toBeGreaterThan(10);

    recorder.stopRecording();
  });

  test('calcula averageSpeedKmh reactivamente en km/h', () => {
    const recorder = useTrackRecorder();
    recorder.startRecording();

    // Recorrido de 1 km
    recorder.totalDistanceMeters.value = 1000;
    // En 120 segundos (2 minutos) -> velocidad = (1 km) / (2/60 h) = 30 km/h
    recorder.elapsedSeconds.value = 120;

    expect(recorder.averageSpeedKmh.value).toBe(30.0);

    recorder.stopRecording();
  });
});

