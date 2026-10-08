import { obtenerTomTomApiKey } from './routingService';

export interface SearchPlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
}

export interface TomTomClassificationName {
  nameLocale?: string;
  name?: string;
}

export interface TomTomClassification {
  code?: string;
  names?: TomTomClassificationName[];
}

export interface TomTomPoi {
  name?: string;
  categories?: string[];
  classifications?: TomTomClassification[];
}

export interface TomTomAddress {
  municipalitySubdivision?: string;
  municipality?: string;
  countrySubdivision?: string;
  countrySubdivisionName?: string;
  postalCode?: string;
  countryCode?: string;
  country?: string;
  freeformAddress?: string;
  localName?: string;
  streetName?: string;
  streetNumber?: string;
}

export interface TomTomPosition {
  lat: number;
  lon: number;
}

export interface TomTomSearchResultItem {
  type?: string;
  id?: string;
  score?: number;
  dist?: number;
  poi?: TomTomPoi;
  address?: TomTomAddress;
  position: TomTomPosition;
}

export interface TomTomSearchResponse {
  summary?: {
    query?: string;
    queryType?: string;
    numResults?: number;
    totalResults?: number;
  };
  results?: TomTomSearchResultItem[];
}

let activeAbortController: AbortController | null = null;

/**
 * Realiza una búsqueda de lugares y geocodificación con la TomTom Search API.
 * Cancela automáticamente peticiones previas en vuelo con AbortController para evitar condiciones de carrera.
 */
export async function searchPlaces(
  query: string,
  userCoords?: { lat: number; lng: number }
): Promise<SearchPlaceResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 3) {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    return [];
  }

  // Cancelar petición anterior si aún está en vuelo
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }

  const controller = new AbortController();
  activeAbortController = controller;

  const apiKey = obtenerTomTomApiKey();
  const baseUrl = `https://api.tomtom.com/search/2/search/${encodeURIComponent(trimmed)}.json`;

  const params = new URLSearchParams({
    key: apiKey,
    limit: '5',
    language: 'es-ES',
    countrySet: 'CO',
  });

  if (userCoords && typeof userCoords.lat === 'number' && typeof userCoords.lng === 'number') {
    params.set('lat', userCoords.lat.toString());
    params.set('lon', userCoords.lng.toString());
    params.set('radius', '50000');
  }

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`TomTom Search API respondió con estado: ${response.status}`);
      return [];
    }

    const data: TomTomSearchResponse = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((item, index): SearchPlaceResult => {
      const name = item.poi?.name || item.address?.freeformAddress || item.address?.localName || trimmed;
      const address = item.address?.freeformAddress || (item.address?.municipality ? `${item.address.municipality}, Colombia` : 'Colombia');
      const category = item.poi?.categories?.[0]
        || item.poi?.classifications?.[0]?.names?.[0]?.name
        || (item.type === 'POI' ? 'Punto de interés' : 'Dirección / Zona');

      return {
        id: item.id || `tt-${index}-${Date.now()}`,
        name,
        address,
        lat: item.position.lat,
        lng: item.position.lon,
        category,
      };
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Petición cancelada intencionalmente
      return [];
    }
    console.warn('Error en searchPlaces TomTom:', error);
    return [];
  } finally {
    if (activeAbortController === controller) {
      activeAbortController = null;
    }
  }
}

