import type { TipoPunto } from './categorias';

export interface Lugar {
  id: string;
  nombre: string;
  tipo: TipoPunto;
  lat: number;
  lng: number;
  descripcion?: string;
  fotos?: string[];
  personalizado: boolean;
  fechaCreacion?: string;
  isFavorite?: boolean;
  categoria?: string;
}

/** Clave de almacenamiento para los sitios creados por el usuario. */
export const CLAVE_SITIOS = 'sitios_personalizados';
export const CLAVE_ESTILO = 'estilo_mapa';
export const CLAVE_FAVORITOS = 'sitios_favoritos';

type Base = Omit<Lugar, 'id' | 'personalizado'>;

const BASE: Base[] = [
  { nombre: 'Cafetería Central', tipo: 'cafeteria', lat: 4.6016861, lng: -74.0644734, descripcion: 'Café y snacks variados' },
  { nombre: 'Juan Valdez Parque 93', tipo: 'cafeteria', lat: 4.6765, lng: -74.0482, descripcion: 'Café colombiano premium', isFavorite: true },
  { nombre: 'Biblioteca Nacional', tipo: 'biblioteca', lat: 4.6138, lng: -74.0693, descripcion: 'Biblioteca Nacional de Colombia' },
  { nombre: 'Biblioteca Virgilio Barco', tipo: 'biblioteca', lat: 4.6583, lng: -74.1039, descripcion: 'Biblioteca pública moderna', isFavorite: true },
  { nombre: 'Baños Bloque A', tipo: 'bano', lat: 4.5717552, lng: -74.0969228, descripcion: 'Baños públicos disponibles' },
  { nombre: 'Baños Centro Comercial', tipo: 'bano', lat: 4.6670, lng: -74.0560, descripcion: 'Sanitarios gratuitos' },
  { nombre: 'Parque Simón Bolívar', tipo: 'parque', lat: 4.6585, lng: -74.0936, descripcion: 'Parque metropolitano principal', isFavorite: true },
  { nombre: 'Parque de la 93', tipo: 'parque', lat: 4.6769, lng: -74.0476, descripcion: 'Parque emblemático del norte' },
  { nombre: 'Hospital San Ignacio', tipo: 'hospital', lat: 4.6268, lng: -74.0647, descripcion: 'Hospital universitario' },
  { nombre: 'Clínica del Country', tipo: 'hospital', lat: 4.6697, lng: -74.0558, descripcion: 'Clínica de alta complejidad' },
  { nombre: 'Centro Comercial Andino', tipo: 'tienda', lat: 4.6668, lng: -74.0536, descripcion: 'Centro comercial premium' },
  { nombre: 'Centro Comercial Gran Estación', tipo: 'tienda', lat: 4.6465, lng: -74.1019, descripcion: 'Gran centro comercial' },
  { nombre: 'Andrés Carne de Res', tipo: 'restaurante', lat: 4.6700, lng: -74.0500, descripcion: 'Restaurante icónico colombiano', isFavorite: true },
  { nombre: 'La Puerta Falsa', tipo: 'restaurante', lat: 4.5977, lng: -74.0742, descripcion: 'El restaurante más antiguo de Bogotá', isFavorite: true },
  { nombre: 'Catedral Primada', tipo: 'iglesia', lat: 4.5969, lng: -74.0753, descripcion: 'Catedral principal de Bogotá', isFavorite: true },
  { nombre: 'Iglesia de San Francisco', tipo: 'iglesia', lat: 4.6013, lng: -74.0764, descripcion: 'Iglesia colonial histórica' },
  { nombre: 'Museo del Oro', tipo: 'museo', lat: 4.6019, lng: -74.0720, descripcion: 'Colección de orfebrería precolombina', isFavorite: true },
  { nombre: 'Museo Botero', tipo: 'museo', lat: 4.5967, lng: -74.0729, descripcion: 'Arte de Fernando Botero', isFavorite: true },
  { nombre: 'Universidad Nacional', tipo: 'universidad', lat: 4.6382, lng: -74.0836, descripcion: 'Principal universidad pública' },
  { nombre: 'Universidad Javeriana', tipo: 'universidad', lat: 4.6271, lng: -74.0644, descripcion: 'Universidad privada tradicional' },
  { nombre: 'Bodytech Parque 93', tipo: 'gimnasio', lat: 4.6760, lng: -74.0490, descripcion: 'Gimnasio moderno con piscina' },
  { nombre: 'Smart Fit Chapinero', tipo: 'gimnasio', lat: 4.6400, lng: -74.0630, descripcion: 'Gimnasio accesible 24/7' },
];

/** 22 puntos de interés predeterminados de Bogotá. */
export const PUNTOS: Lugar[] = BASE.map((p, i) => ({
  ...p,
  id: `p-${i}`,
  personalizado: false,
  isFavorite: p.isFavorite ?? false,
  categoria: p.categoria ?? (p.tipo === 'restaurante' || p.tipo === 'cafeteria' ? 'Restaurantes' : 'Puntos de Interés'),
}));

// ── Utilidades ─────────────────────────────────────────

export function calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function formatearDistancia(metros: number): string {
  return metros < 1000 ? `${Math.round(metros)} m` : `${(metros / 1000).toFixed(1)} km`;
}

export function formatearTiempo(segundos: number): string {
  const mins = Math.max(1, Math.round(segundos / 60));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

