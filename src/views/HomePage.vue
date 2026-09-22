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

      <!-- FAB para centrar en ubicación -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="centrarEnUsuario" color="dark" size="small">
          <ion-icon :icon="navigateOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon, IonFab, IonFabButton
} from '@ionic/vue';
import { settingsOutline, locateOutline, navigateOutline } from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// ── 22 Puntos de Interés en Bogotá ────────────────────
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

// ── Iconos SVG por tipo ────────────────────────────────
const crearIcono = (archivo: string, tamaño: [number, number] = [32, 32]): L.Icon =>
  L.icon({
    iconUrl: `/assets/icon/${archivo}`,
    iconSize: tamaño,
    iconAnchor: [tamaño[0] / 2, tamaño[1]],
    popupAnchor: [0, -tamaño[1] + 5],
  });

const iconoUsuario = crearIcono('marker.svg', [30, 40]);

const iconosPorTipo: Record<TipoPunto, L.Icon> = {
  cafeteria:    crearIcono('cafe.svg'),
  biblioteca:   crearIcono('book.svg'),
  bano:         crearIcono('bano.svg'),
  parque:       crearIcono('parque.svg'),
  hospital:     crearIcono('hospital.svg'),
  tienda:       crearIcono('tienda.svg'),
  restaurante:  crearIcono('restaurante.svg'),
  iglesia:      crearIcono('iglesia.svg'),
  museo:        crearIcono('museo.svg'),
  universidad:  crearIcono('universidad.svg'),
  gimnasio:     crearIcono('gimnasio.svg'),
};

const etiquetasTipo: Record<TipoPunto, string> = {
  cafeteria:   '☕ Cafetería',
  biblioteca:  '📚 Biblioteca',
  bano:        '🚻 Baño',
  parque:      '🌳 Parque',
  hospital:    '🏥 Hospital',
  tienda:      '🛍️ Tienda',
  restaurante: '🍽️ Restaurante',
  iglesia:     '⛪ Iglesia',
  museo:       '🏛️ Museo',
  universidad: '🎓 Universidad',
  gimnasio:    '💪 Gimnasio',
};

// ── Estado ─────────────────────────────────────────────
let map: L.Map;
let ubicacionUsuario = ref<{ lat: number; lng: number } | null>(null);
let marcadorUsuario: L.Marker | undefined;
let circuloPrecision: L.Circle | undefined;
let rutaActual: L.Polyline | undefined;
let watchId: string | undefined;

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
  return metros < 1000
    ? `${metros.toFixed(0)} m`
    : `${(metros / 1000).toFixed(2)} km`;
}

// ── Actualizar posición del usuario en tiempo real ─────

function actualizarPosicionUsuario(lat: number, lng: number, accuracy?: number) {
  ubicacionUsuario.value = { lat, lng };

  if (marcadorUsuario) {
    marcadorUsuario.setLatLng([lat, lng]);
  } else {
    marcadorUsuario = L.marker([lat, lng], { icon: iconoUsuario, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup('<strong>📍 Tu ubicación actual</strong>');
  }

  if (accuracy && accuracy > 0) {
    if (circuloPrecision) {
      circuloPrecision.setLatLng([lat, lng]);
      circuloPrecision.setRadius(accuracy);
    } else {
      circuloPrecision = L.circle([lat, lng], {
        radius: accuracy,
        color: '#1a73e8',
        fillColor: '#1a73e8',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(map);
    }
  }
}

// ── Centrar en la ubicación del usuario ─────────────────

async function centrarEnUsuario() {
  try {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    const { latitude, longitude, accuracy } = position.coords;
    actualizarPosicionUsuario(latitude, longitude, accuracy ?? undefined);
    map.setView([latitude, longitude], 16, { animate: true });
  } catch (err) {
    console.error('Error obteniendo ubicación:', err);
  }
}

// ── Iniciar seguimiento de ubicación en tiempo real ────

async function iniciarSeguimiento() {
  try {
    const id = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (position, err) => {
        if (err || !position) return;
        const { latitude, longitude, accuracy } = position.coords;
        actualizarPosicionUsuario(latitude, longitude, accuracy ?? undefined);
      }
    );
    watchId = id;
  } catch (err) {
    console.error('Error iniciando seguimiento:', err);
  }
}

// ── Rutas ──────────────────────────────────────────────

async function obtenerRuta(
  origenLat: number, origenLng: number,
  destinoLat: number, destinoLng: number
): Promise<{ coordenadas: L.LatLng[]; duracion: number; distancia: number }> {
  const url = `https://router.project-osrm.org/route/v1/foot/${origenLng},${origenLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  const data = await response.json();
  if (!data.routes || data.routes.length === 0) throw new Error('No se encontró ruta');
  const route = data.routes[0];
  return {
    coordenadas: route.geometry.coordinates.map(
      (coord: [number, number]) => L.latLng(coord[1], coord[0])
    ),
    duracion: route.duration,
    distancia: route.distance,
  };
}

function formatearTiempo(segundos: number): string {
  const mins = Math.round(segundos / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const restMins = mins % 60;
  return `${hrs}h ${restMins}min`;
}

async function trazarRuta(destinoLat: number, destinoLng: number, nombreDestino: string) {
  if (!ubicacionUsuario.value) return;
  try {
    const { coordenadas, duracion, distancia } = await obtenerRuta(
      ubicacionUsuario.value.lat, ubicacionUsuario.value.lng,
      destinoLat, destinoLng
    );
    if (rutaActual) map.removeLayer(rutaActual);
    rutaActual = L.polyline(coordenadas, {
      color: '#e91e63',
      weight: 5,
      opacity: 0.85,
      dashArray: '10, 6',
    }).addTo(map);

    rutaActual.bindPopup(`
      <div style="text-align:center;min-width:160px">
        <strong>Ruta a ${nombreDestino}</strong><br>
        🚶 ${formatearTiempo(duracion)}<br>
        📏 ${formatearDistancia(distancia)}
      </div>
    `).openPopup();

    map.fitBounds(rutaActual.getBounds(), { padding: [50, 50] });
  } catch (error) {
    console.error('Error trazando ruta:', error);
  }
}

// ── Agregar puntos de interés al mapa ──────────────────

function agregarPuntos(refLat: number, refLng: number) {
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
      .addTo(map)
      .bindPopup(popupContent);

    marker.on('click', () => trazarRuta(p.lat, p.lng, p.nombre));
  });
}

// ── Inicializar mapa ───────────────────────────────────

async function inicializarMapa() {
  let lat = 4.6097;
  let lng = -74.0817;
  let accuracy: number | undefined;

  try {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    lat = position.coords.latitude;
    lng = position.coords.longitude;
    accuracy = position.coords.accuracy ?? undefined;
  } catch (err) {
    console.warn('Geolocalización no disponible, usando Bogotá por defecto:', err);
  }

  ubicacionUsuario.value = { lat, lng };

  map = L.map('map', {
    zoomControl: true,
  }).setView([lat, lng], 14);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  // Marcador y círculo de precisión del usuario
  actualizarPosicionUsuario(lat, lng, accuracy);

  // Puntos de interés
  agregarPuntos(lat, lng);

  // Iniciar seguimiento en tiempo real
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
</style>
