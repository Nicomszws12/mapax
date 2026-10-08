import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { searchPlaces } from '@/services/searchService';

describe('searchService', () => {
  const fetchOriginal = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  test('retorna array vacío si el query tiene menos de 3 caracteres', async () => {
    const res1 = await searchPlaces('');
    const res2 = await searchPlaces('ab');
    expect(res1).toEqual([]);
    expect(res2).toEqual([]);
  });

  test('parsea correctamente resultados de TomTom Search API', async () => {
    const mockTomTomSearchResponse = {
      summary: { query: 'Monserrate', numResults: 1 },
      results: [
        {
          id: 'test-id-1',
          type: 'POI',
          poi: {
            name: 'Cerro de Monserrate',
            categories: ['attraction'],
          },
          address: {
            freeformAddress: 'Parque Nacional Oriental, Bogotá',
            municipality: 'Bogotá',
          },
          position: {
            lat: 4.6059,
            lon: -74.0548,
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTomTomSearchResponse,
    } as Response);

    const resultados = await searchPlaces('Monserrate', { lat: 4.6097, lng: -74.0817 });

    expect(resultados).toHaveLength(1);
    expect(resultados[0].name).toBe('Cerro de Monserrate');
    expect(resultados[0].address).toBe('Parque Nacional Oriental, Bogotá');
    expect(resultados[0].lat).toBe(4.6059);
    expect(resultados[0].lng).toBe(-74.0548);
    expect(resultados[0].category).toBe('attraction');
  });

  test('retorna array vacío en caso de error HTTP o fallo de red', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const resultados = await searchPlaces('Parque de la 93');
    expect(resultados).toEqual([]);
  });
});

