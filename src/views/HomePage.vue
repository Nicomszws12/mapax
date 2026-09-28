<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar class="custom-toolbar">
        <ion-title>📍 Mapa Bogotá</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="centrarEnUsuario" class="toolbar-btn">
            <ion-icon slot="icon-only" :icon="locateOutline" />
          </ion-button>
          <ion-button router-link="/credits" class="toolbar-btn">
            <ion-icon slot="icon-only" :icon="settingsOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div id="map"></div>

      <!-- FAB botones -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="activarModoAgregar" :color="modoAgregar ? 'danger' : 'primary'" size="small">
          <ion-icon :icon="modoAgregar ? closeOutline : addOutline" />
        </ion-fab-button>
      </ion-fab>

      <ion-fab vertical="bottom" horizontal="start" slot="fixed">
        <ion-fab-button @click="centrarEnUsuario" color="dark" size="small">
          <ion-icon :icon="navigateOutline" />
        </ion-fab-button>
      </ion-fab>

      <!-- Banner modo agregar -->
      <div v-if="modoAgregar" class="modo-agregar-banner">
        <ion-icon :icon="fingerPrintOutline" />
        <span>Toca en el mapa para ubicar tu nuevo sitio</span>
      </div>

      <!-- Marcador temporal -->
      <div v-if="modoAgregar && puntoTemporal" class="confirmar-punto-banner">
        <span>📍 Ubicación seleccionada</span>
        <ion-button size="small" @click="abrirFormulario" color="success">
          Continuar
        </ion-button>
      </div>
    </ion-content>

    <!-- Modal agregar sitio -->
    <AgregarSitioModal
      :is-open="mostrarModalAgregar"
      :lat="puntoTemporal?.lat ?? null"
      :lng="puntoTemporal?.lng ?? null"
      @cerrar="cerrarModalAgregar"
      @guardar="guardarNuevoSitio"
    />

    <!-- Modal galería fotos -->
    <GaleriaFotosModal
      :is-open="mostrarGaleria"
      :nombre="galeriaData.nombre"
      :descripcion="galeriaData.descripcion"
      :tipo="galeriaData.tipo"
      :fotos="galeriaData.fotos"
      @cerrar="mostrarGaleria = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon, IonFab, IonFabButton
} from '@ionic/vue';
import {
  settingsOutline, locateOutline, navigateOutline,
  addOutline, closeOutline, fingerPrintOutline
} from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import AgregarSitioModal from '../components/AgregarSitioModal.vue';
import GaleriaFotosModal from '../components/GaleriaFotosModal.vue';

// ── Tipos ──────────────────────────────────────────────
type TipoPunto = 'cafeteria' | 'biblioteca' | 'bano' | 'parque' | 'hospital'
  | 'tienda' | 'restaurante' | 'iglesia' | 'museo' | 'universidad' | 'gimnasio';

interface PuntoInteres {
  nombre: string;
  tipo: TipoPunto;
  lat: number;
  lng: number;
  descripcion?: string;
}

interface SitioPersonalizado {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  lat: number;
  lng: number;
  fotos: string[];
  fechaCreacion: string;
}

// ── 22 Puntos Predeterminados ─────────────────────────
const PUNTOS: PuntoInteres[] = [
  { nombre: 'Cafetería Central', tipo: 'cafeteria', lat: 4.6016861, lng: -74.0644734, descripcion: 'Café y snacks variados' },
  { nombre: 'Juan Valdez Parque 93', tipo: 'cafeteria', lat: 4.6765, lng: -74.0482, descripcion: 'Café colombiano premium' },
  { nombre: 'Biblioteca Nacional', tipo: 'biblioteca', lat: 4.6138, lng: -74.0693, descripcion: 'Biblioteca Nacional de Colombia' },
  { nombre: 'Biblioteca Virgilio Barco', tipo: 'biblioteca', lat: 4.6583, lng: -74.1039, descripcion: 'Biblioteca pública moderna' },
  { nombre: 'Baños Bloque A', tipo: 'bano', lat: 4.5717552, lng: -74.0969228, descripcion: 'Baños públicos disponibles' },
  { nombre: 'Baños Centro Comercial', tipo: 'bano', lat: 4.6670, lng: -74.0560, descripcion: 'Sanitarios gratuitos' },
  { nombre: 'Parque Simón Bolívar', tipo: 'parque', lat: 4.6585, lng: -74.0936, descripcion: 'Parque metropolitano principal' },
  { nombre: 'Parque de la 93', tipo: 'parque', lat: 4.6769, lng: -74.0476, descripcion: 'Parque emblemático del norte' },
  { nombre: 'Hospital San Ignacio', tipo: 'hospital', lat: 4.6268, lng: -74.0647, descripcion: 'Hospital universitario' },
  { nombre: 'Clínica del Country', tipo: 'hospital', lat: 4.6697, lng: -74.0558, descripcion: 'Clínica de alta complejidad' },
  { nombre: 'Centro Comercial Andino', tipo: 'tienda', lat: 4.6668, lng: -74.0536, descripcion: 'Centro comercial premium' },
  { nombre: 'Centro Comercial Gran Estación', tipo: 'tienda', lat: 4.6465, lng: -74.1019, descripcion: 'Gran centro comercial' },
  { nombre: 'Andrés Carne de Res', tipo: 'restaurante', lat: 4.6700, lng: -74.0500, descripcion: 'Restaurante icónico colombiano' },
  { nombre: 'Restaurante La Puerta Falsa', tipo: 'restaurante', lat: 4.5977, lng: -74.0742, descripcion: 'El restaurante más antiguo de Bogotá' },
  { nombre: 'Catedral Primada', tipo: 'iglesia', lat: 4.5969, lng: -74.0753, descripcion: 'Catedral principal de Bogotá' },
  { nombre: 'Iglesia de San Francisco', tipo: 'iglesia', lat: 4.6013, lng: -74.0764, descripcion: 'Iglesia colonial histórica' },
  { nombre: 'Museo del Oro', tipo: 'museo', lat: 4.6019, lng: -74.0720, descripcion: 'Colección de orfebrería precolombina' },
  { nombre: 'Museo Botero', tipo: 'museo', lat: 4.5967, lng: -74.0729, descripcion: 'Arte de Fernando Botero' },
  { nombre: 'Universidad Nacional', tipo: 'universidad', lat: 4.6382, lng: -74.0836, descripcion: 'Principal universidad pública' },
  { nombre: 'Universidad Javeriana', tipo: 'universidad', lat: 4.6271, lng: -74.0644, descripcion: 'Universidad privada tradicional' },
  { nombre: 'Bodytech Parque 93', tipo: 'gimnasio', lat: 4.6760, lng: -74.0490, descripcion: 'Gimnasio moderno con piscina' },
  { nombre: 'Smart Fit Chapinero', tipo: 'gimnasio', lat: 4.6400, lng: -74.0630, descripcion: 'Gimnasio accesible 24/7' },
];

// ── Iconos ─────────────────────────────────────────────
const crearIcono = (archivo: string, tamaño: [number, number] = [32, 32]): L.Icon =>
  L.icon({
    iconUrl: `/assets/icon/${archivo}`,
    iconSize: tamaño,
    iconAnchor: [tamaño[0] / 2, tamaño[1]],
    popupAnchor: [0, -tamaño[1] + 5],
  });

const iconoUsuario = crearIcono('marker.svg', [30, 40]);

const iconosPorTipo: Record<string, L.Icon> = {
  cafeteria: crearIcono('cafe.svg'), biblioteca: crearIcono('book.svg'),
  bano: crearIcono('bano.svg'), parque: crearIcono('parque.svg'),
  hospital: crearIcono('hospital.svg'), tienda: crearIcono('tienda.svg'),
  restaurante: crearIcono('restaurante.svg'), iglesia: crearIcono('iglesia.svg'),
  museo: crearIcono('museo.svg'), universidad: crearIcono('universidad.svg'),
  gimnasio: crearIcono('gimnasio.svg'),
};

const etiquetasTipo: Record<string, string> = {
  cafeteria: '☕ Cafetería', biblioteca: '📚 Biblioteca', bano: '🚻 Baño',
  parque: '🌳 Parque', hospital: '🏥 Hospital', tienda: '🛍️ Tienda',
  restaurante: '🍽️ Restaurante', iglesia: '⛪ Iglesia', museo: '🏛️ Museo',
  universidad: '🎓 Universidad', gimnasio: '💪 Gimnasio',
};

// ── Estado ─────────────────────────────────────────────
let map: L.Map;
const ubicacionUsuario = ref<{ lat: number; lng: number } | null>(null);
let marcadorUsuario: L.Marker | undefined;
let circuloPrecision: L.Circle | undefined;
let rutaActual: L.Polyline | undefined;
let marcadorTemporal: L.Marker | undefined;
const marcadoresPersonalizados: L.Marker[] = [];

const modoAgregar = ref(false);
const puntoTemporal = ref<{ lat: number; lng: number } | null>(null);
const mostrarModalAgregar = ref(false);
const sitiosPersonalizados = ref<SitioPersonalizado[]>([]);

// Galería
const mostrarGaleria = ref(false);
const galeriaData = reactive({
  nombre: '',
  descripcion: '',
  tipo: '',
  fotos: [] as string[],
});

// ── Persistencia ───────────────────────────────────────

async function cargarSitiosGuardados() {
  try {
    const { value } = await Preferences.get({ key: 'sitios_personalizados' });
    if (value) {
      sitiosPersonalizados.value = JSON.parse(value);
    }
  } catch (err) {
    console.error('Error cargando sitios:', err);
  }
}

async function guardarSitiosEnStorage() {
  try {
    await Preferences.set({
      key: 'sitios_personalizados',
      value: JSON.stringify(sitiosPersonalizados.value),
    });
  } catch (err) {
    console.error('Error guardando sitios:', err);
  }
}

// ── Funciones de Utilidad ──────────────────────────────

function calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatearDistancia(metros: number): string {
  return metros < 1000 ? `${metros.toFixed(0)} m` : `${(metros / 1000).toFixed(2)} km`;
}

function formatearTiempo(segundos: number): string {
  const mins = Math.round(segundos / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

// ── Ubicación del usuario ──────────────────────────────

function actualizarPosicionUsuario(lat: number, lng: number, accuracy?: number) {
  ubicacionUsuario.value = { lat, lng };
  if (marcadorUsuario) {
    marcadorUsuario.setLatLng([lat, lng]);
  } else {
    marcadorUsuario = L.marker([lat, lng], { icon: iconoUsuario, zIndexOffset: 1000 })
      .addTo(map).bindPopup('<strong>📍 Tu ubicación actual</strong>');
  }
  if (accuracy && accuracy > 0) {
    if (circuloPrecision) {
      circuloPrecision.setLatLng([lat, lng]).setRadius(accuracy);
    } else {
      circuloPrecision = L.circle([lat, lng], {
        radius: accuracy, color: '#1a73e8', fillColor: '#1a73e8', fillOpacity: 0.1, weight: 1,
      }).addTo(map);
    }
  }
}

async function centrarEnUsuario() {
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    const { latitude, longitude, accuracy } = pos.coords;
    actualizarPosicionUsuario(latitude, longitude, accuracy ?? undefined);
    map.setView([latitude, longitude], 16, { animate: true });
  } catch (err) {
    console.error('Error obteniendo ubicación:', err);
  }
}

async function iniciarSeguimiento() {
  try {
    await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (position, err) => {
        if (err || !position) return;
        const { latitude, longitude, accuracy } = position.coords;
        actualizarPosicionUsuario(latitude, longitude, accuracy ?? undefined);
      }
    );
  } catch (err) {
    console.error('Error iniciando seguimiento:', err);
  }
}

// ── Rutas ──────────────────────────────────────────────

async function trazarRuta(destinoLat: number, destinoLng: number, nombreDestino: string) {
  if (!ubicacionUsuario.value) return;
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${ubicacionUsuario.value.lng},${ubicacionUsuario.value.lat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.routes?.length) throw new Error('No se encontró ruta');
    const route = data.routes[0];
    const coords = route.geometry.coordinates.map(
      (c: [number, number]) => L.latLng(c[1], c[0])
    );
    if (rutaActual) map.removeLayer(rutaActual);
    rutaActual = L.polyline(coords, { color: '#e91e63', weight: 5, opacity: 0.85, dashArray: '10, 6' }).addTo(map);
    rutaActual.bindPopup(`
      <div style="text-align:center;min-width:160px">
        <strong>Ruta a ${nombreDestino}</strong><br>
        🚶 ${formatearTiempo(route.duration)}<br>
        📏 ${formatearDistancia(route.distance)}
      </div>
    `).openPopup();
    map.fitBounds(rutaActual.getBounds(), { padding: [50, 50] });
  } catch (error) {
    console.error('Error trazando ruta:', error);
  }
}

// ── Agregar puntos predeterminados ─────────────────────

function agregarPuntosPredeterminados(refLat: number, refLng: number) {
  PUNTOS.forEach((p) => {
    const distancia = calcularDistancia(refLat, refLng, p.lat, p.lng);
    const popupContent = `
      <div style="min-width:190px;font-family:sans-serif">
        <strong style="font-size:14px">${p.nombre}</strong><br>
        <span style="color:#666;font-size:12px">${etiquetasTipo[p.tipo]}</span><br>
        ${p.descripcion ? `<em style="font-size:11px;color:#888">${p.descripcion}</em><br>` : ''}
        <span style="color:#e91e63;font-weight:600;font-size:13px">📏 ${formatearDistancia(distancia)}</span><br>
        <span style="color:#1a73e8;font-size:11px;cursor:pointer">Toca para trazar ruta 🗺️</span>
      </div>
    `;
    const marker = L.marker([p.lat, p.lng], { icon: iconosPorTipo[p.tipo] })
      .addTo(map).bindPopup(popupContent);
    marker.on('click', () => trazarRuta(p.lat, p.lng, p.nombre));
  });
}

// ── Agregar sitios personalizados al mapa ──────────────

function agregarSitioAlMapa(sitio: SitioPersonalizado) {
  const icono = iconosPorTipo[sitio.tipo] || crearIcono('marker.svg');
  const etiqueta = etiquetasTipo[sitio.tipo] || sitio.tipo;
  const tieneFotos = sitio.fotos.length > 0;
  const fotoPreview = tieneFotos
    ? `<img src="${sitio.fotos[0]}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-top:6px;cursor:pointer" />`
    : '';

  const popupContent = `
    <div style="min-width:200px;font-family:sans-serif" class="popup-personalizado">
      <strong style="font-size:14px">${sitio.nombre}</strong>
      <span style="display:inline-block;background:#e91e63;color:white;font-size:9px;padding:1px 6px;border-radius:8px;margin-left:6px">Nuevo</span><br>
      <span style="color:#666;font-size:12px">${etiqueta}</span><br>
      ${sitio.descripcion ? `<em style="font-size:11px;color:#888">${sitio.descripcion}</em><br>` : ''}
      ${fotoPreview}
      ${tieneFotos ? `<div style="color:#1a73e8;font-size:11px;margin-top:4px;cursor:pointer">📸 Ver ${sitio.fotos.length} foto${sitio.fotos.length > 1 ? 's' : ''}</div>` : ''}
      <div style="margin-top:6px;display:flex;gap:8px">
        <span style="color:#e91e63;font-size:11px;cursor:pointer" id="btn-ruta-${sitio.id}">🗺️ Ruta</span>
        <span style="color:#ff4444;font-size:11px;cursor:pointer" id="btn-eliminar-${sitio.id}">🗑️ Eliminar</span>
      </div>
    </div>
  `;

  const marker = L.marker([sitio.lat, sitio.lng], { icon: icono }).addTo(map);
  marker.bindPopup(popupContent);

  marker.on('popupopen', () => {
    // Botón ver fotos
    const popup = marker.getPopup()?.getElement();
    if (popup && tieneFotos) {
      const img = popup.querySelector('img');
      const verFotos = popup.querySelector(`[style*="📸"]`);
      const abrirGaleria = () => {
        galeriaData.nombre = sitio.nombre;
        galeriaData.descripcion = sitio.descripcion;
        galeriaData.tipo = sitio.tipo;
        galeriaData.fotos = [...sitio.fotos];
        mostrarGaleria.value = true;
      };
      img?.addEventListener('click', abrirGaleria);
      verFotos?.addEventListener('click', abrirGaleria);
    }

    // Botón ruta
    const btnRuta = document.getElementById(`btn-ruta-${sitio.id}`);
    btnRuta?.addEventListener('click', () => trazarRuta(sitio.lat, sitio.lng, sitio.nombre));

    // Botón eliminar
    const btnEliminar = document.getElementById(`btn-eliminar-${sitio.id}`);
    btnEliminar?.addEventListener('click', () => eliminarSitio(sitio.id, marker));
  });

  marcadoresPersonalizados.push(marker);
}

async function eliminarSitio(id: string, marker: L.Marker) {
  map.removeLayer(marker);
  sitiosPersonalizados.value = sitiosPersonalizados.value.filter(s => s.id !== id);
  await guardarSitiosEnStorage();
}

// ── Modo Agregar Sitio ─────────────────────────────────

function activarModoAgregar() {
  modoAgregar.value = !modoAgregar.value;
  if (!modoAgregar.value) {
    puntoTemporal.value = null;
    if (marcadorTemporal) {
      map.removeLayer(marcadorTemporal);
      marcadorTemporal = undefined;
    }
  }
}

function onMapClick(e: L.LeafletMouseEvent) {
  if (!modoAgregar.value) return;

  puntoTemporal.value = { lat: e.latlng.lat, lng: e.latlng.lng };

  if (marcadorTemporal) {
    marcadorTemporal.setLatLng(e.latlng);
  } else {
    const iconoTemp = L.divIcon({
      html: '<div style="width:20px;height:20px;background:#e91e63;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);animation:pulse 1.5s infinite"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      className: '',
    });
    marcadorTemporal = L.marker(e.latlng, { icon: iconoTemp }).addTo(map);
  }
}

function abrirFormulario() {
  mostrarModalAgregar.value = true;
}

function cerrarModalAgregar() {
  mostrarModalAgregar.value = false;
}

async function guardarNuevoSitio(data: {
  nombre: string; descripcion: string; tipo: string;
  lat: number; lng: number; fotos: string[];
}) {
  const nuevoSitio: SitioPersonalizado = {
    id: Date.now().toString(),
    nombre: data.nombre,
    tipo: data.tipo,
    descripcion: data.descripcion,
    lat: data.lat,
    lng: data.lng,
    fotos: data.fotos,
    fechaCreacion: new Date().toISOString(),
  };

  sitiosPersonalizados.value.push(nuevoSitio);
  await guardarSitiosEnStorage();
  agregarSitioAlMapa(nuevoSitio);

  // Limpiar modo agregar
  modoAgregar.value = false;
  puntoTemporal.value = null;
  if (marcadorTemporal) {
    map.removeLayer(marcadorTemporal);
    marcadorTemporal = undefined;
  }
}

// ── Inicializar mapa ───────────────────────────────────

async function inicializarMapa() {
  let lat = 4.6097, lng = -74.0817;
  let accuracy: number | undefined;

  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;
    accuracy = pos.coords.accuracy ?? undefined;
  } catch (err) {
    console.warn('Geolocalización no disponible, usando Bogotá:', err);
  }

  ubicacionUsuario.value = { lat, lng };

  map = L.map('map', { zoomControl: true }).setView([lat, lng], 14);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  actualizarPosicionUsuario(lat, lng, accuracy);
  agregarPuntosPredeterminados(lat, lng);

  // Cargar sitios guardados
  await cargarSitiosGuardados();
  sitiosPersonalizados.value.forEach(s => agregarSitioAlMapa(s));

  // Evento click del mapa para modo agregar
  map.on('click', onMapClick);

  iniciarSeguimiento();
  setTimeout(() => map.invalidateSize(), 200);
}

onMounted(() => {
  inicializarMapa();
});
</script>

<style scoped>
.custom-toolbar {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  --color: #e0e0e0;
}

.toolbar-btn {
  --color: #00d2ff;
}

#map {
  width: 100%;
  height: 100%;
}

.modo-agregar-banner {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #e91e63, #ff5722);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(233, 30, 99, 0.4);
  animation: slideDown 0.3s ease-out;
  white-space: nowrap;
}

.confirmar-punto-banner {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #1a1a2e;
  color: #e0e0e0;
  padding: 10px 16px;
  border-radius: 16px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 210, 255, 0.2);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}
</style>

<style>
/* Estilos globales para la animación del marcador temporal */
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}
</style>
