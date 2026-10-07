export type EstiloMapaId = 'estandar' | 'claro' | 'oscuro' | 'satelite';

export interface EstiloMapa {
  id: EstiloMapaId;
  nombre: string;
  url: string;
  /** Capa de etiquetas superpuesta (para satélite híbrido) */
  etiquetas?: string;
  atribucion: string;
  subdominios?: string;
  maxZoom: number;
  /** Mosaico de vista previa (Bogotá, zoom 12) */
  preview: string;
}

const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const CARTO = '&copy; <a href="https://carto.com/attributions">CARTO</a>';

export const ESTILOS: EstiloMapa[] = [
  {
    id: 'estandar',
    nombre: 'Estándar',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    atribucion: `${OSM} ${CARTO}`,
    subdominios: 'abcd',
    maxZoom: 20,
    preview: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/12/1205/1995@2x.png',
  },
  {
    id: 'claro',
    nombre: 'Minimal',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    atribucion: `${OSM} ${CARTO}`,
    subdominios: 'abcd',
    maxZoom: 20,
    preview: 'https://a.basemaps.cartocdn.com/light_all/12/1205/1995@2x.png',
  },
  {
    id: 'oscuro',
    nombre: 'Noche',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    atribucion: `${OSM} ${CARTO}`,
    subdominios: 'abcd',
    maxZoom: 20,
    preview: 'https://a.basemaps.cartocdn.com/dark_all/12/1205/1995@2x.png',
  },
  {
    id: 'satelite',
    nombre: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    etiquetas: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
    atribucion: `Imágenes &copy; Esri · ${OSM}`,
    subdominios: 'abcd',
    maxZoom: 19,
    preview: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1995/1205',
  },
];

export const estiloPorId = (id: string | null | undefined): EstiloMapa =>
  ESTILOS.find(e => e.id === id) ?? ESTILOS[0];

