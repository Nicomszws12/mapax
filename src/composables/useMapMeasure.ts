import { ref } from 'vue';
import * as L from 'leaflet';

export type MeasureMode = 'distance' | 'area';

/**
 * Calcula la distancia acumulada en metros a lo largo de un conjunto de puntos
 * utilizando la fórmula de Haversine nativa de Leaflet (distanceTo).
 */
export function calcularDistanciaPolilinea(puntos: Array<{ lat: number; lng: number }>): number {
  if (puntos.length < 2) return 0;
  let totalMetros = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    const p1 = L.latLng(puntos[i].lat, puntos[i].lng);
    const p2 = L.latLng(puntos[i + 1].lat, puntos[i + 1].lng);
    totalMetros += p1.distanceTo(p2);
  }
  return totalMetros;
}

/**
 * Formatea una distancia en metros o kilómetros con 2 decimales.
 */
export function formatearDistanciaMedicion(metros: number): string {
  if (metros < 1000) {
    return `${Math.round(metros)} m`;
  }
  return `${(metros / 1000).toFixed(2)} km`;
}

/**
 * Calcula el área superficial aproximada en metros cuadrados (m²) para un polígono
 * geográfico cerrado aplicando el algoritmo de Shoelace sobre proyección plana
 * equidistante local (centrada en el baricentro del polígono).
 */
export function calcularAreaPoligono(puntos: Array<{ lat: number; lng: number }>): number {
  if (puntos.length < 3) return 0;
  const R = 6378137; // Radio ecuatorial de la Tierra en metros

  // Latitud media en radianes para compensar la convergencia de meridianos
  const latMediaRad = (puntos.reduce((acc, p) => acc + p.lat, 0) / puntos.length) * (Math.PI / 180);
  const cosLat = Math.cos(latMediaRad);

  const coordsPlanas = puntos.map(p => {
    const x = (p.lng * (Math.PI / 180)) * R * cosLat;
    const y = (p.lat * (Math.PI / 180)) * R;
    return { x, y };
  });

  let suma = 0;
  const n = coordsPlanas.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    suma += coordsPlanas[i].x * coordsPlanas[j].y - coordsPlanas[j].x * coordsPlanas[i].y;
  }

  return Math.abs(suma) / 2;
}

/**
 * Formatea un área en m², hectáreas (ha) o km².
 */
export function formatearArea(areaM2: number): string {
  if (areaM2 < 10000) {
    return `${Math.round(areaM2).toLocaleString('es-CO')} m²`;
  }
  if (areaM2 < 1000000) {
    return `${(areaM2 / 10000).toFixed(2)} ha`;
  }
  return `${(areaM2 / 1000000).toFixed(2)} km²`;
}

export function useMapMeasure() {
  const isMeasuring = ref(false);
  const measureMode = ref<MeasureMode>('distance');
  const measurePoints = ref<L.LatLng[]>([]);
  const calculatedResult = ref<string>('');

  let mapInstance: L.Map | undefined;
  let measureLayerGroup: L.LayerGroup | undefined;
  let clickListenerBound = false;

  function actualizarResultado(): void {
    const puntos = measurePoints.value;
    if (measureMode.value === 'distance') {
      if (puntos.length < 2) {
        calculatedResult.value = 'Distancia: 0 m';
      } else {
        const d = calcularDistanciaPolilinea(puntos);
        calculatedResult.value = `Distancia: ${formatearDistanciaMedicion(d)}`;
      }
    } else {
      if (puntos.length < 3) {
        calculatedResult.value = `Área: 0 m² (${puntos.length}/3 vértices)`;
      } else {
        const a = calcularAreaPoligono(puntos);
        calculatedResult.value = `Área: ${formatearArea(a)}`;
      }
    }
  }

  function redibujarCapas(): void {
    if (!measureLayerGroup) return;
    measureLayerGroup.clearLayers();

    const puntos = measurePoints.value;
    if (puntos.length === 0) return;

    // 1. Dibujar círculos en cada vértice
    puntos.forEach((pt, index) => {
      const esPrimero = index === 0;
      const esUltimo = index === puntos.length - 1;

      const marker = L.circleMarker(pt, {
        radius: esPrimero || esUltimo ? 7 : 5,
        color: '#2563eb',
        fillColor: esPrimero ? '#10b981' : esUltimo ? '#ef4444' : '#ffffff',
        fillOpacity: 1,
        weight: 2.5,
        interactive: false,
      });
      measureLayerGroup?.addLayer(marker);
    });

    // 2. Trazo de polilínea o polígono según el modo
    if (measureMode.value === 'distance') {
      if (puntos.length >= 2) {
        const polyline = L.polyline(puntos, {
          color: '#2563eb',
          weight: 3.5,
          dashArray: '6, 6',
          opacity: 0.9,
          interactive: false,
        });
        measureLayerGroup.addLayer(polyline);
      }
    } else {
      if (puntos.length >= 3) {
        const polygon = L.polygon(puntos, {
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.25,
          weight: 2.5,
          interactive: false,
        });
        measureLayerGroup.addLayer(polygon);
      } else if (puntos.length === 2) {
        const linePreliminar = L.polyline(puntos, {
          color: '#2563eb',
          weight: 2,
          dashArray: '4, 4',
          opacity: 0.6,
          interactive: false,
        });
        measureLayerGroup.addLayer(linePreliminar);
      }
    }
  }

  function onMapClick(e: L.LeafletMouseEvent): void {
    if (!isMeasuring.value) return;
    if (e.originalEvent) {
      L.DomEvent.stopPropagation(e.originalEvent);
    }
    addPoint(e.latlng);
  }

  function attachMap(map: L.Map): void {
    mapInstance = map;
    if (!measureLayerGroup) {
      measureLayerGroup = L.layerGroup().addTo(map);
    }
  }

  function startMeasuring(mode: MeasureMode = 'distance'): void {
    measureMode.value = mode;
    isMeasuring.value = true;
    measurePoints.value = [];
    actualizarResultado();

    if (mapInstance) {
      if (!measureLayerGroup) {
        measureLayerGroup = L.layerGroup().addTo(mapInstance);
      }
      if (!clickListenerBound) {
        mapInstance.on('click', onMapClick);
        clickListenerBound = true;
      }
      try {
        mapInstance.getContainer().style.cursor = 'crosshair';
      } catch {
        // ignorar si no está en DOM
      }
    }
    redibujarCapas();
  }

  function stopMeasuring(): void {
    isMeasuring.value = false;
    measurePoints.value = [];
    calculatedResult.value = '';

    if (mapInstance) {
      if (clickListenerBound) {
        mapInstance.off('click', onMapClick);
        clickListenerBound = false;
      }
      try {
        mapInstance.getContainer().style.cursor = '';
      } catch {
        // ignorar
      }
    }

    if (measureLayerGroup) {
      measureLayerGroup.clearLayers();
    }
  }

  function setMeasureMode(mode: MeasureMode): void {
    if (measureMode.value === mode) return;
    measureMode.value = mode;
    actualizarResultado();
    redibujarCapas();
  }

  function addPoint(latlng: L.LatLng): void {
    measurePoints.value.push(latlng);
    actualizarResultado();
    redibujarCapas();
  }

  function removeLastPoint(): void {
    if (measurePoints.value.length === 0) return;
    measurePoints.value.pop();
    actualizarResultado();
    redibujarCapas();
  }

  function clearPoints(): void {
    measurePoints.value = [];
    actualizarResultado();
    redibujarCapas();
  }

  function cleanup(): void {
    stopMeasuring();
    if (measureLayerGroup) {
      measureLayerGroup.remove();
      measureLayerGroup = undefined;
    }
    mapInstance = undefined;
  }

  return {
    isMeasuring,
    measureMode,
    measurePoints,
    calculatedResult,
    attachMap,
    startMeasuring,
    stopMeasuring,
    setMeasureMode,
    addPoint,
    removeLastPoint,
    clearPoints,
    cleanup,
  };
}

