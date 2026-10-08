import { describe, expect, test } from 'vitest';
import {
  asegurarPasos,
  calcularMetricasRestantes,
  calcularRumbo,
  esManiobraFinal,
  evaluarAvance,
  formatearDistanciaManiobra,
} from '@/services/navigationService';
import type { NavigationStep } from '@/services/routingService';

// 0.0001° de latitud ≈ 11.1 m
const BASE = { lat: 4.6, lng: -74.08 };
const aNorte = (metros: number) => ({ lat: BASE.lat + metros / 111_195, lng: BASE.lng });

function paso(metros: number, maneuver: string, segundos = metros / 10): NavigationStep {
  const p = aNorte(metros);
  return {
    instruction: maneuver,
    maneuver,
    location: [p.lat, p.lng],
    distanceFromStart: metros,
    timeFromStart: segundos,
  };
}

const PASOS: NavigationStep[] = [
  paso(0, 'DEPART'),
  paso(200, 'TURN_RIGHT'),
  paso(500, 'TURN_LEFT'),
  paso(800, 'ARRIVE'),
];
const DESTINO = aNorte(800);

describe('navigationService', () => {
  describe('evaluarAvance', () => {
    test('no avanza si está a más de 25 m de la maniobra', () => {
      const r = evaluarAvance(aNorte(100), PASOS, 1, DESTINO);
      expect(r.indice).toBe(1);
      expect(r.distanciaAlPaso).toBeGreaterThan(95);
      expect(r.distanciaAlPaso).toBeLessThan(105);
      expect(r.llegada).toBe(false);
    });

    test('avanza al siguiente paso a menos de 25 m de la maniobra', () => {
      const r = evaluarAvance(aNorte(180), PASOS, 1, DESTINO);
      expect(r.indice).toBe(2);
      expect(r.llegada).toBe(false);
    });

    test('el paso de salida (offset 0) se supera al empezar en el origen', () => {
      const r = evaluarAvance(aNorte(2), PASOS, 0, DESTINO);
      expect(r.indice).toBe(1);
    });

    test('recupera maniobras omitidas si ya está cerca de la siguiente', () => {
      const r = evaluarAvance(aNorte(490), PASOS, 1, DESTINO);
      expect(r.indice).toBe(3);
    });

    test('declara llegada a menos de 20 m del destino en el último paso', () => {
      const r = evaluarAvance(aNorte(790), PASOS, 3, DESTINO);
      expect(r.llegada).toBe(true);
    });

    test('no declara llegada entre 20 y 25 m del último paso', () => {
      const r = evaluarAvance(aNorte(777), PASOS, 3, DESTINO);
      expect(r.indice).toBe(3);
      expect(r.llegada).toBe(false);
    });

    test('nunca supera el último paso', () => {
      const r = evaluarAvance(aNorte(810), PASOS, 3, DESTINO);
      expect(r.indice).toBe(3);
    });

    test('no declara llegada por cercanía al destino lejos del tramo final (rutas circulares)', () => {
      const circular = [paso(0, 'DEPART'), paso(300, 'TURN_LEFT'), paso(600, 'TURN_LEFT'), paso(900, 'ARRIVE')];
      const r = evaluarAvance(aNorte(0), circular, 0, aNorte(0));
      expect(r.llegada).toBe(false);
    });

    test('con permitirAvance=false (GPS impreciso) solo actualiza la distancia', () => {
      const r = evaluarAvance(aNorte(790), PASOS, 1, DESTINO, false);
      expect(r.indice).toBe(1);
      expect(r.llegada).toBe(false);
      expect(r.distanciaAlPaso).toBeGreaterThan(500);
    });

    test('tolera lista vacía e índices fuera de rango', () => {
      expect(evaluarAvance(BASE, [], 3, DESTINO)).toEqual({ indice: 0, distanciaAlPaso: 0, llegada: false });
      expect(evaluarAvance(aNorte(100), PASOS, 99, DESTINO).indice).toBe(3);
      expect(evaluarAvance(aNorte(5), PASOS, -5, DESTINO).indice).toBe(1);
    });
  });

  describe('asegurarPasos', () => {
    test('añade un paso de llegada si la lista no termina en ARRIVE', () => {
      const r = asegurarPasos([], BASE, 'Parque', 1500, 300);
      expect(r).toHaveLength(1);
      expect(esManiobraFinal(r[0].maneuver)).toBe(true);
      expect(r[0].location).toEqual([BASE.lat, BASE.lng]);
      expect(r[0].distanceFromStart).toBe(1500);
    });

    test('no duplica el paso final si ya existe', () => {
      expect(asegurarPasos(PASOS, DESTINO, 'X', 800, 80)).toHaveLength(PASOS.length);
    });
  });

  describe('esManiobraFinal', () => {
    test.each(['ARRIVE', 'ARRIVE_LEFT', 'ARRIVE_RIGHT', 'REACH_DESTINATION', 'arrive'])('%s es final', m => {
      expect(esManiobraFinal(m)).toBe(true);
    });
    test.each(['TURN_LEFT', 'DEPART', 'WAYPOINT_REACHED'])('%s no es final', m => {
      expect(esManiobraFinal(m)).toBe(false);
    });
  });

  describe('calcularMetricasRestantes', () => {
    test('suma lo que falta del tramo y la distancia hasta la maniobra', () => {
      const m = calcularMetricasRestantes(PASOS, 1, 50, 800, 80);
      // Desde la maniobra (offset 200) faltan 600 m + 50 m hasta alcanzarla
      expect(m.metros).toBeCloseTo(650, 5);
      // 80 - 20 = 60 s + 50 m a 10 m/s = 5 s
      expect(m.segundos).toBeCloseTo(65, 5);
    });

    test('devuelve ceros si no hay paso', () => {
      expect(calcularMetricasRestantes([], 0, 10, 100, 10)).toEqual({ metros: 0, segundos: 0 });
    });

    test('nunca devuelve valores negativos', () => {
      const m = calcularMetricasRestantes(PASOS, 3, 0, 100, 10);
      expect(m.metros).toBe(0);
      expect(m.segundos).toBe(0);
    });
  });

  describe('calcularRumbo', () => {
    test('puntos cardinales', () => {
      expect(calcularRumbo(BASE, { lat: BASE.lat + 0.001, lng: BASE.lng })).toBeCloseTo(0, 1);
      expect(calcularRumbo(BASE, { lat: BASE.lat, lng: BASE.lng + 0.001 })).toBeCloseTo(90, 1);
      expect(calcularRumbo(BASE, { lat: BASE.lat - 0.001, lng: BASE.lng })).toBeCloseTo(180, 1);
      expect(calcularRumbo(BASE, { lat: BASE.lat, lng: BASE.lng - 0.001 })).toBeCloseTo(270, 1);
    });
  });

  describe('formatearDistanciaManiobra', () => {
    test('redondea de forma estable', () => {
      expect(formatearDistanciaManiobra(0)).toBe('0 m');
      expect(formatearDistanciaManiobra(47)).toBe('45 m');
      expect(formatearDistanciaManiobra(148)).toBe('150 m');
      expect(formatearDistanciaManiobra(996)).toBe('1.0 km');
      expect(formatearDistanciaManiobra(1234)).toBe('1.2 km');
      expect(formatearDistanciaManiobra(-5)).toBe('0 m');
    });
  });
});
