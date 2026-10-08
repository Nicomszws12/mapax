import { describe, expect, test, beforeEach } from 'vitest';
import * as L from 'leaflet';
import {
  calcularDistanciaPolilinea,
  formatearDistanciaMedicion,
  calcularAreaPoligono,
  formatearArea,
  useMapMeasure,
} from '@/composables/useMapMeasure';

describe('useMapMeasure - Lógica Geométrica y Composable', () => {
  describe('Cálculo y Formateo de Distancia', () => {
    test('calcularDistanciaPolilinea retorna 0 para menos de 2 puntos', () => {
      expect(calcularDistanciaPolilinea([])).toBe(0);
      expect(calcularDistanciaPolilinea([{ lat: 4.6, lng: -74.0 }])).toBe(0);
    });

    test('calcularDistanciaPolilinea calcula distancia Haversine positiva entre dos puntos', () => {
      const p1 = { lat: 4.6097, lng: -74.0817 };
      const p2 = { lat: 4.6197, lng: -74.0817 };
      const dist = calcularDistanciaPolilinea([p1, p2]);
      expect(dist).toBeGreaterThan(1000);
      expect(dist).toBeLessThan(1200);
    });

    test('formatearDistanciaMedicion formatea en m (<1000m) o km (>=1000m)', () => {
      expect(formatearDistanciaMedicion(450)).toBe('450 m');
      expect(formatearDistanciaMedicion(999.4)).toBe('999 m');
      expect(formatearDistanciaMedicion(1000)).toBe('1.00 km');
      expect(formatearDistanciaMedicion(2456.7)).toBe('2.46 km');
    });
  });

  describe('Cálculo y Formateo de Área (Shoelace)', () => {
    test('calcularAreaPoligono retorna 0 para menos de 3 vértices', () => {
      expect(calcularAreaPoligono([])).toBe(0);
      expect(calcularAreaPoligono([{ lat: 4.6, lng: -74.0 }, { lat: 4.61, lng: -74.01 }])).toBe(0);
    });

    test('calcularAreaPoligono calcula área positiva para un triángulo o polígono cerrado', () => {
      // Triángulo en Bogotá (~100m por cateto)
      const puntos = [
        { lat: 4.6000, lng: -74.0000 },
        { lat: 4.6010, lng: -74.0000 },
        { lat: 4.6000, lng: -74.0010 },
      ];
      const area = calcularAreaPoligono(puntos);
      expect(area).toBeGreaterThan(4000);
      expect(area).toBeLessThan(8000);
    });

    test('formatearArea formatea m², hectáreas (ha) y km²', () => {
      expect(formatearArea(1250)).toContain('m²');
      expect(formatearArea(25000)).toBe('2.50 ha');
      expect(formatearArea(2500000)).toBe('2.50 km²');
    });
  });

  describe('Composable useMapMeasure', () => {
    let measure: ReturnType<typeof useMapMeasure>;

    beforeEach(() => {
      measure = useMapMeasure();
      measure.stopMeasuring();
    });

    test('inicializa en estado inactivo', () => {
      expect(measure.isMeasuring.value).toBe(false);
      expect(measure.measureMode.value).toBe('distance');
      expect(measure.measurePoints.value).toHaveLength(0);
    });

    test('startMeasuring activa el modo y resetea puntos', () => {
      measure.startMeasuring('area');
      expect(measure.isMeasuring.value).toBe(true);
      expect(measure.measureMode.value).toBe('area');
      expect(measure.calculatedResult.value).toContain('Área');
    });

    test('addPoint acumula puntos y actualiza resultado dinámicamente', () => {
      measure.startMeasuring('distance');
      measure.addPoint(L.latLng(4.60, -74.08));
      expect(measure.measurePoints.value).toHaveLength(1);
      expect(measure.calculatedResult.value).toBe('Distancia: 0 m');

      measure.addPoint(L.latLng(4.61, -74.08));
      expect(measure.measurePoints.value).toHaveLength(2);
      expect(measure.calculatedResult.value).toContain('Distancia: 1.');
    });

    test('removeLastPoint y clearPoints manipulan vértices correctamente', () => {
      measure.startMeasuring('distance');
      measure.addPoint(L.latLng(4.60, -74.08));
      measure.addPoint(L.latLng(4.61, -74.08));
      expect(measure.measurePoints.value).toHaveLength(2);

      measure.removeLastPoint();
      expect(measure.measurePoints.value).toHaveLength(1);

      measure.clearPoints();
      expect(measure.measurePoints.value).toHaveLength(0);
      expect(measure.calculatedResult.value).toBe('Distancia: 0 m');
    });

    test('setMeasureMode cambia entre distancia y área recalculando', () => {
      measure.startMeasuring('distance');
      measure.addPoint(L.latLng(4.60, -74.08));
      measure.addPoint(L.latLng(4.61, -74.08));
      measure.addPoint(L.latLng(4.60, -74.07));

      expect(measure.calculatedResult.value).toContain('Distancia:');
      measure.setMeasureMode('area');
      expect(measure.measureMode.value).toBe('area');
      expect(measure.calculatedResult.value).toContain('Área:');
    });

    test('stopMeasuring resetea el estado', () => {
      measure.startMeasuring('distance');
      measure.addPoint(L.latLng(4.60, -74.08));
      measure.stopMeasuring();

      expect(measure.isMeasuring.value).toBe(false);
      expect(measure.measurePoints.value).toHaveLength(0);
      expect(measure.calculatedResult.value).toBe('');
    });
  });
});

