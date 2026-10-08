import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import {
  formatearMinutosLegible,
  obtenerTomTomApiKey,
  calcularRutaTomTom,
  extraerPasosNavegacion,
} from '@/services/routingService';

describe('routingService', () => {
  test('obtenerTomTomApiKey retorna una clave no vacía', () => {
    const key = obtenerTomTomApiKey();
    expect(key).toBeDefined();
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(10);
  });

  test('formatearMinutosLegible formatea correctamente minutos y horas', () => {
    expect(formatearMinutosLegible(0)).toBe('1 min');
    expect(formatearMinutosLegible(15)).toBe('15 min');
    expect(formatearMinutosLegible(60)).toBe('1 h');
    expect(formatearMinutosLegible(75)).toBe('1 h 15 min');
    expect(formatearMinutosLegible(130)).toBe('2 h 10 min');
  });

  describe('calcularRutaTomTom', () => {
    const fetchOriginal = global.fetch;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      global.fetch = fetchOriginal;
    });

    test('parsea exitosamente la respuesta de TomTom con tráfico en vivo', async () => {
      const mockTomTomResponse = {
        formatVersion: '0.0.12',
        routes: [
          {
            summary: {
              lengthInMeters: 5400,
              travelTimeInSeconds: 720,
              trafficDelayInSeconds: 0,
            },
            legs: [
              {
                points: [
                  { latitude: 4.6097, longitude: -74.0817 },
                  { latitude: 4.6200, longitude: -74.0750 },
                ],
              },
            ],
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTomTomResponse,
      } as Response);

      const resultado = await calcularRutaTomTom(
        { lat: 4.6097, lng: -74.0817 },
        { lat: 4.6200, lng: -74.0750 }
      );

      expect(resultado.distanciaKm).toBe(5.4);
      expect(resultado.distanciaTexto).toBe('5.4 km');
      expect(resultado.tiempoMinutos).toBe(12);
      expect(resultado.esTraficoFluido).toBe(true);
      expect(resultado.estadoTrafico).toBe('Tráfico fluido');
      expect(resultado.puntos).toHaveLength(2);
      expect(resultado.puntos[0]).toEqual([4.6097, -74.0817]);
    });

    test('reporta congestión si el retraso por tráfico supera 60 segundos', async () => {
      const mockTomTomCongestion = {
        routes: [
          {
            summary: {
              lengthInMeters: 8000,
              travelTimeInSeconds: 1500,
              trafficDelayInSeconds: 420, // 7 min
            },
            legs: [
              {
                points: [{ latitude: 4.6097, longitude: -74.0817 }],
              },
            ],
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTomTomCongestion,
      } as Response);

      const resultado = await calcularRutaTomTom(
        { lat: 4.6097, lng: -74.0817 },
        { lat: 4.6500, lng: -74.0900 }
      );

      expect(resultado.esTraficoFluido).toBe(false);
      expect(resultado.estadoTrafico).toBe('+7 min de congestión');
    });

    test('solicita instrucciones de guiado en español y devuelve steps vacíos si no hay guidance', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              summary: { lengthInMeters: 1000, travelTimeInSeconds: 120, trafficDelayInSeconds: 0 },
              legs: [{ points: [{ latitude: 4.6, longitude: -74.08 }] }],
            },
          ],
        }),
      } as Response);
      global.fetch = fetchMock;

      const resultado = await calcularRutaTomTom({ lat: 4.6, lng: -74.08 }, { lat: 4.61, lng: -74.07 });

      const urlLlamada = String(fetchMock.mock.calls[0][0]);
      expect(urlLlamada).toContain('instructionsType=text');
      expect(urlLlamada).toContain('language=es-ES');
      expect(urlLlamada).toContain('computeTravelTimeFor=all');
      expect(resultado.steps).toEqual([]);
      expect(resultado.distanciaMetros).toBe(1000);
      expect(resultado.tiempoSegundos).toBe(120);
    });

    test('extrae steps desde guidance.instructions', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              summary: { lengthInMeters: 900, travelTimeInSeconds: 150, trafficDelayInSeconds: 0 },
              legs: [{ points: [{ latitude: 4.6, longitude: -74.08 }] }],
              guidance: {
                instructions: [
                  {
                    routeOffsetInMeters: 400,
                    travelTimeInSeconds: 70,
                    point: { latitude: 4.605, longitude: -74.075 },
                    street: 'Avenida Caracas',
                    maneuver: 'TURN_RIGHT',
                    message: 'Gira a la derecha en Avenida Caracas',
                  },
                  {
                    routeOffsetInMeters: 0,
                    travelTimeInSeconds: 0,
                    point: { latitude: 4.6, longitude: -74.08 },
                    maneuver: 'DEPART',
                    message: 'Sal hacia el norte',
                  },
                  { routeOffsetInMeters: 900, travelTimeInSeconds: 150, point: { latitude: Number.NaN, longitude: 0 } },
                ],
              },
            },
          ],
        }),
      } as Response);

      const resultado = await calcularRutaTomTom({ lat: 4.6, lng: -74.08 }, { lat: 4.61, lng: -74.07 });

      expect(resultado.steps).toHaveLength(2);
      expect(resultado.steps[0].maneuver).toBe('DEPART');
      expect(resultado.steps[1]).toEqual({
        instruction: 'Gira a la derecha en Avenida Caracas',
        street: 'Avenida Caracas',
        maneuver: 'TURN_RIGHT',
        location: [4.605, -74.075],
        distanceFromStart: 400,
        timeFromStart: 70,
      });
    });
  });

  describe('extraerPasosNavegacion', () => {
    test('genera texto de respaldo en español cuando falta message', () => {
      const pasos = extraerPasosNavegacion({
        instructions: [
          {
            routeOffsetInMeters: 10,
            travelTimeInSeconds: 2,
            point: { latitude: 4.6, longitude: -74.08 },
            street: 'Calle 26',
            maneuver: 'TURN_LEFT',
          },
        ],
      });
      expect(pasos[0].instruction).toBe('Gira a la izquierda en Calle 26');
    });

    test('devuelve [] sin guidance', () => {
      expect(extraerPasosNavegacion(undefined)).toEqual([]);
      expect(extraerPasosNavegacion({})).toEqual([]);
    });
  });
});

