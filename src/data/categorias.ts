import {
  cafe, restaurant, library, school, maleFemale, leaf,
  bagHandle, colorPalette, barbell,
} from 'ionicons/icons';

export type TipoPunto =
  | 'cafeteria' | 'restaurante' | 'biblioteca' | 'universidad' | 'bano'
  | 'parque' | 'hospital' | 'tienda' | 'iglesia' | 'museo' | 'gimnasio';

export interface Categoria {
  etiqueta: string;
  color: string;
  /** SVG como data URL (solo rellenos, sin clases externas) */
  icono: string;
}

/** Construye un glifo SVG en formato data URL compatible con ion-icon y <img>. */
const glifo = (path: string) =>
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path d='${path}'/></svg>`;

const cruzMedica = glifo(
  'M208 64h96a16 16 0 0 1 16 16v112h112a16 16 0 0 1 16 16v96a16 16 0 0 1-16 16H320v112a16 16 0 0 1-16 16h-96a16 16 0 0 1-16-16V320H80a16 16 0 0 1-16-16v-96a16 16 0 0 1 16-16h112V80a16 16 0 0 1 16-16z'
);

const cruzLatina = glifo(
  'M228 32h56a12 12 0 0 1 12 12v84h84a12 12 0 0 1 12 12v56a12 12 0 0 1-12 12h-84v228a12 12 0 0 1-12 12h-56a12 12 0 0 1-12-12V208h-84a12 12 0 0 1-12-12v-56a12 12 0 0 1 12-12h84V44a12 12 0 0 1 12-12z'
);

/** Paleta inspirada en los colores de sistema de iOS / Apple Maps. */
export const CATEGORIAS: Record<TipoPunto, Categoria> = {
  cafeteria:   { etiqueta: 'Cafetería',   color: '#A2845E', icono: cafe },
  restaurante: { etiqueta: 'Restaurante', color: '#FF9500', icono: restaurant },
  biblioteca:  { etiqueta: 'Biblioteca',  color: '#5856D6', icono: library },
  universidad: { etiqueta: 'Universidad', color: '#32ADE6', icono: school },
  bano:        { etiqueta: 'Baño',        color: '#8E8E93', icono: maleFemale },
  parque:      { etiqueta: 'Parque',      color: '#34C759', icono: leaf },
  hospital:    { etiqueta: 'Hospital',    color: '#FF3B30', icono: cruzMedica },
  tienda:      { etiqueta: 'Tienda',      color: '#FF2D55', icono: bagHandle },
  iglesia:     { etiqueta: 'Iglesia',     color: '#AF52DE', icono: cruzLatina },
  museo:       { etiqueta: 'Museo',       color: '#E5A00D', icono: colorPalette },
  gimnasio:    { etiqueta: 'Gimnasio',    color: '#00C7BE', icono: barbell },
};

export const TIPOS = Object.keys(CATEGORIAS) as TipoPunto[];

export const categoriaDe = (tipo: string): Categoria =>
  CATEGORIAS[tipo as TipoPunto] ?? { etiqueta: tipo, color: '#8E8E93', icono: leaf };

/** Glifo de papelera relleno (para HTML de Leaflet). */
export const ICONO_PAPELERA = glifo(
  'M176 64a16 16 0 0 1 16-16h128a16 16 0 0 1 16 16v16h96a16 16 0 0 1 0 32H80a16 16 0 0 1 0-32h96zM112 144h288l-18 312a32 32 0 0 1-32 30H162a32 32 0 0 1-32-30z'
);

/** Convierte un data URL de ionicons (solo rellenos) a SVG en línea. */
export const svgEnLinea = (dataUrl: string) =>
  dataUrl.replace(/^data:image\/svg\+xml;utf8,/, '');

