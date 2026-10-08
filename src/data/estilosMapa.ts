export type EstiloMapaId = 'estandar' | 'claro' | 'oscuro' | 'satelite';

export interface EstiloMapa {
  id: EstiloMapaId;
  nombre: string;
  url: string;
  /** Capa de etiquetas superpuesta (para satélite híbrido o canvas) */
  etiquetas?: string;
  atribucion: string;
  subdominios?: string;
  maxZoom: number;
  /** Mosaico de vista previa (Bogotá, zoom 12) */
  preview: string;
}

const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ESRI = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';

export const ESTILOS: EstiloMapa[] = [
  {
    id: 'estandar',
    nombre: 'Estándar',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribucion: OSM,
    maxZoom: 19,
    preview: 'https://tile.openstreetmap.org/12/1205/1995.png',
  },
  {
    id: 'claro',
    nombre: 'Minimal',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    etiquetas: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    atribucion: ESRI,
    maxZoom: 19,
    preview: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/12/1995/1205',
  },
  {
    id: 'oscuro',
    nombre: 'Noche',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    etiquetas: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    atribucion: ESRI,
    maxZoom: 19,
    preview: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/12/1995/1205',
  },
  {
    id: 'satelite',
    nombre: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    etiquetas: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    atribucion: `Imágenes &copy; Esri · ${OSM}`,
    maxZoom: 19,
    preview: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1995/1205',
  },
];

export const estiloPorId = (id: string | null | undefined): EstiloMapa =>
  ESTILOS.find(e => e.id === id) ?? ESTILOS[0];
