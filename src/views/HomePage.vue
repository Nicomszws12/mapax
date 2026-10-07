<template>
  <ion-page ref="paginaRef">
    <ion-content :fullscreen="true" :scroll-y="false" class="mx-content">
      <div id="map"></div>

      <!-- ── Controles flotantes (arriba a la derecha) ── -->
      <div class="mx-controls" :class="{ oculto: modoAgregar }">
        <button class="mx-ctrl" aria-label="Estilo del mapa" @click="panelEstilos = true">
          <ion-icon :icon="mapOutline" />
        </button>
        <span class="mx-ctrl-sep"></span>
        <button
          class="mx-ctrl"
          :class="{ activo: siguiendo }"
          aria-label="Mi ubicación"
          @click="centrarEnUsuario"
        >
          <ion-icon :icon="siguiendo ? navigate : navigateOutline" />
        </button>
        <span class="mx-ctrl-sep"></span>
        <button class="mx-ctrl" aria-label="Ajustes y créditos" @click="ionRouter.push('/credits')">
          <ion-icon :icon="settingsOutline" />
        </button>
      </div>

      <!-- ── Indicador de carga de ruta ── -->
      <transition name="mx-fade">
        <div v-if="cargandoRuta" class="mx-floating-pill">
          <ion-spinner name="crescent" />
          <span>Calculando ruta…</span>
        </div>
      </transition>

      <!-- ── Modo agregar: pin central ── -->
      <template v-if="modoAgregar">
        <div class="mx-center-pin" :class="{ levantado: moviendo }">
          <div class="mx-center-pin-head"><ion-icon :icon="add" /></div>
          <div class="mx-center-pin-stick"></div>
          <div class="mx-center-pin-shadow"></div>
        </div>

        <div class="mx-floating-pill mx-hint">
          <ion-icon :icon="moveOutline" />
          <span>Mueve el mapa para ubicar el lugar</span>
        </div>

        <div class="mx-add-bar">
          <div class="mx-add-coords">
            <span class="mx-add-title">Nuevo lugar</span>
            <span class="mx-add-sub">{{ centro.lat.toFixed(5) }}, {{ centro.lng.toFixed(5) }}</span>
          </div>
          <button class="mx-pill secundario" @click="modoAgregar = false">Cancelar</button>
          <button class="mx-pill primario" @click="confirmarUbicacion">Agregar aquí</button>
        </div>
      </template>

      <!-- ── Hoja inferior (estilo Apple Maps) ── -->
      <section
        class="mx-sheet"
        :class="[`estado-${estadoSheet}`, { oculto: modoAgregar, 'con-ruta': !!rutaInfo, arrastrando: arrastre.activo }]"
        :style="estiloArrastre"
      >
        <div
          class="mx-drag-zone"
          @pointerdown="inicioArrastre"
          @pointermove="moverArrastre"
          @pointerup="finArrastre"
          @pointercancel="finArrastre"
        >
          <span class="mx-grabber"></span>

          <!-- Ruta activa -->
          <div v-if="rutaInfo" class="mx-route-card" @pointerdown.stop>
            <div class="mx-route-icon"><ion-icon :icon="walk" /></div>
            <div class="mx-route-text">
              <div class="mx-route-time">{{ rutaInfo.tiempo }}</div>
              <div class="mx-route-sub">{{ rutaInfo.distancia }} · a pie · {{ rutaInfo.destino }}</div>
            </div>
            <button class="mx-pill peligro" @click="finalizarRuta">Finalizar</button>
          </div>
        </div>

        <!-- Buscador + agregar -->
        <div class="mx-search-row">
          <label class="mx-search">
            <ion-icon :icon="search" />
            <input
              v-model="busqueda"
              type="search"
              enterkeyhint="search"
              placeholder="Buscar en MapX"
              @focus="estadoSheet = 'expandido'"
            />
            <button v-if="busqueda" class="mx-search-clear" aria-label="Borrar" @click.prevent="busqueda = ''">
              <ion-icon :icon="closeCircle" />
            </button>
          </label>
          <button class="mx-round-btn" aria-label="Agregar lugar" @click="activarModoAgregar">
            <ion-icon :icon="add" />
          </button>
        </div>

        <!-- Filtros por categoría -->
        <div class="mx-chips">
          <button class="mx-chip" :class="{ activo: filtro === 'todos' }" @click="filtro = 'todos'">
            <span class="mx-chip-dot" style="background: #007aff"><ion-icon :icon="apps" /></span>
            Todos
          </button>
          <button class="mx-chip" :class="{ activo: filtro === 'mios' }" @click="filtro = 'mios'">
            <span class="mx-chip-dot" style="background: #ffcc00"><ion-icon :icon="star" /></span>
            Mis lugares
            <span v-if="sitios.length" class="mx-chip-count">{{ sitios.length }}</span>
          </button>
          <button
            v-for="t in TIPOS"
            :key="t"
            class="mx-chip"
            :class="{ activo: filtro === t }"
            @click="filtro = t"
          >
            <span class="mx-chip-dot" :style="{ background: CATEGORIAS[t].color }">
              <ion-icon :icon="CATEGORIAS[t].icono" />
            </span>
            {{ CATEGORIAS[t].etiqueta }}
          </button>
        </div>

        <!-- Lista de lugares -->
        <div class="mx-list-wrap">
          <div class="mx-section-title">
            <span>{{ tituloLista }}</span>
            <span class="mx-section-count">{{ lugaresFiltrados.length }}</span>
          </div>

          <div v-if="lugaresFiltrados.length === 0" class="mx-empty">
            <ion-icon :icon="filtro === 'mios' ? starOutline : searchOutline" />
            <div class="mx-empty-title">
              {{ filtro === 'mios' && !busqueda ? 'Aún no tienes lugares' : 'Sin resultados' }}
            </div>
            <p v-if="filtro === 'mios' && !busqueda">
              Toca <strong>+</strong> para guardar un sitio con fotos.
            </p>
            <p v-else>Prueba con otra búsqueda o categoría.</p>
          </div>

          <div v-else class="mx-list">
            <button v-for="l in lugaresFiltrados" :key="l.id" class="mx-row" @click="enfocarLugar(l)">
              <span class="mx-row-glyph" :style="{ background: categoriaDe(l.tipo).color }">
                <ion-icon :icon="categoriaDe(l.tipo).icono" />
              </span>
              <span class="mx-row-body">
                <span class="mx-row-title">
                  <span class="mx-ellipsis">{{ l.nombre }}</span>
                  <ion-icon v-if="l.personalizado" :icon="star" class="mx-row-star" />
                </span>
                <span class="mx-row-sub">
                  {{ categoriaDe(l.tipo).etiqueta }}<template v-if="l.distanciaTexto"> · {{ l.distanciaTexto }}</template>
                </span>
              </span>
              <img v-if="l.fotos?.length" :src="l.fotos[0]" class="mx-row-thumb" alt="" />
              <ion-icon v-else :icon="chevronForward" class="mx-row-chev" />
            </button>
          </div>
        </div>
      </section>

      <!-- ── Selector de estilo de mapa ── -->
      <transition name="mx-fade">
        <div v-if="panelEstilos" class="mx-backdrop" @click="panelEstilos = false"></div>
      </transition>
      <transition name="mx-slide">
        <div v-if="panelEstilos" class="mx-style-panel" role="dialog" aria-label="Estilo del mapa">
          <div class="mx-panel-head">
            <span class="mx-panel-title">Estilo del mapa</span>
            <button class="mx-close" aria-label="Cerrar" @click="panelEstilos = false">
              <ion-icon :icon="close" />
            </button>
          </div>
          <div class="mx-style-grid">
            <button
              v-for="e in ESTILOS"
              :key="e.id"
              class="mx-style-card"
              :class="{ activo: estiloActual === e.id }"
              @click="cambiarEstilo(e.id)"
            >
              <img :src="e.preview" :alt="e.nombre" loading="lazy" />
              <span>{{ e.nombre }}</span>
            </button>
          </div>
        </div>
      </transition>
    </ion-content>

    <AgregarSitioModal
      :is-open="mostrarModalAgregar"
      :lat="puntoNuevo?.lat ?? null"
      :lng="puntoNuevo?.lng ?? null"
      :presenting-element="paginaEl"
      @cerrar="mostrarModalAgregar = false"
      @guardar="guardarNuevoSitio"
    />

    <GaleriaFotosModal
      :is-open="mostrarGaleria"
      :nombre="galeria.nombre"
      :descripcion="galeria.descripcion"
      :tipo="galeria.tipo"
      :fotos="galeria.fotos"
      :fecha="galeria.fecha"
      @cerrar="mostrarGaleria = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  IonPage, IonContent, IonIcon, IonSpinner,
  useIonRouter, alertController, toastController, onIonViewWillEnter,
} from '@ionic/vue';
import {
  mapOutline, navigate, navigateOutline, settingsOutline, add, search, searchOutline,
  closeCircle, close, star, starOutline, apps, chevronForward, walk, images,
  checkmarkCircle, alertCircle, moveOutline,
} from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import * as L from 'leaflet';

import AgregarSitioModal from '../components/AgregarSitioModal.vue';
import GaleriaFotosModal from '../components/GaleriaFotosModal.vue';
import { CATEGORIAS, TIPOS, categoriaDe, ICONO_PAPELERA, svgEnLinea, type TipoPunto } from '../data/categorias';
import {
  PUNTOS, CLAVE_SITIOS, CLAVE_ESTILO, calcularDistancia, formatearDistancia,
  formatearTiempo, escaparHtml, type Lugar,
} from '../data/lugares';
import { ESTILOS, estiloPorId, type EstiloMapaId } from '../data/estilosMapa';

type Filtro = 'todos' | 'mios' | TipoPunto;
type LatLng = { lat: number; lng: number };

const ionRouter = useIonRouter();
const paginaRef = ref<{ $el: HTMLElement } | null>(null);
const paginaEl = ref<HTMLElement | undefined>();

// ── Leaflet (no reactivo) ──────────────────────────────
let map: L.Map | undefined;
let capaBase: L.TileLayer | undefined;
let capaEtiquetas: L.TileLayer | undefined;
let capaLugares: L.LayerGroup | undefined;
let capaRuta: L.LayerGroup | undefined;
let marcadorUsuario: L.Marker | undefined;
let circuloPrecision: L.Circle | undefined;
let watchId: string | undefined;
const marcadores = new Map<string, L.Marker>();

// ── Estado ─────────────────────────────────────────────
const ubicacion = ref<LatLng | null>(null);
const siguiendo = ref(false);
const sitios = ref<Lugar[]>([]);
const filtro = ref<Filtro>('todos');
const busqueda = ref('');
const estadoSheet = ref<'colapsado' | 'expandido'>('colapsado');
const panelEstilos = ref(false);
const estiloActual = ref<EstiloMapaId>('estandar');
const rutaInfo = ref<{ tiempo: string; distancia: string; destino: string } | null>(null);
const cargandoRuta = ref(false);

const modoAgregar = ref(false);
const moviendo = ref(false);
const centro = ref<LatLng>({ lat: 4.6097, lng: -74.0817 });
const puntoNuevo = ref<LatLng | null>(null);
const mostrarModalAgregar = ref(false);

const mostrarGaleria = ref(false);
const galeria = reactive({ nombre: '', descripcion: '', tipo: '', fotos: [] as string[], fecha: '' });

// ── Lista / filtros ────────────────────────────────────
const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const todos = computed<Lugar[]>(() => [...sitios.value, ...PUNTOS]);

function coincideFiltro(l: Lugar): boolean {
  if (filtro.value === 'todos') return true;
  if (filtro.value === 'mios') return l.personalizado;
  return l.tipo === filtro.value;
}

const lugaresFiltrados = computed(() => {
  const q = normalizar(busqueda.value.trim());
  const u = ubicacion.value;
  return todos.value
    .filter(coincideFiltro)
    .filter(l =>
      !q ||
      normalizar(l.nombre).includes(q) ||
      normalizar(categoriaDe(l.tipo).etiqueta).includes(q) ||
      normalizar(l.descripcion ?? '').includes(q)
    )
    .map(l => {
      const distancia = u ? calcularDistancia(u.lat, u.lng, l.lat, l.lng) : 0;
      return { ...l, distancia, distanciaTexto: u ? formatearDistancia(distancia) : '' };
    })
    .sort((a, b) => a.distancia - b.distancia);
});

const tituloLista = computed(() => {
  if (busqueda.value.trim()) return 'Resultados';
  if (filtro.value === 'todos') return ubicacion.value ? 'Cerca de ti' : 'Lugares';
  if (filtro.value === 'mios') return 'Mis lugares';
  return CATEGORIAS[filtro.value].etiqueta;
});

// ── Hoja inferior: arrastre ────────────────────────────
const arrastre = reactive({ activo: false, inicioY: 0, dy: 0 });

const estiloArrastre = computed(() =>
  arrastre.activo
    ? { transform: `translateY(calc(var(--sheet-offset) + ${arrastre.dy}px))` }
    : undefined
);

function inicioArrastre(e: PointerEvent) {
  arrastre.activo = true;
  arrastre.inicioY = e.clientY;
  arrastre.dy = 0;
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
}

function moverArrastre(e: PointerEvent) {
  if (!arrastre.activo) return;
  const dy = e.clientY - arrastre.inicioY;
  arrastre.dy = estadoSheet.value === 'expandido' ? Math.max(dy, -24) : Math.min(dy, 24);
}

function finArrastre() {
  if (!arrastre.activo) return;
  const dy = arrastre.dy;
  arrastre.activo = false;
  arrastre.dy = 0;
  if (Math.abs(dy) < 6) {
    estadoSheet.value = estadoSheet.value === 'expandido' ? 'colapsado' : 'expandido';
  } else if (dy < -40) {
    estadoSheet.value = 'expandido';
  } else if (dy > 40) {
    estadoSheet.value = 'colapsado';
    quitarFoco();
  }
}

function quitarFoco() {
  (document.activeElement as HTMLElement | null)?.blur?.();
}

// ── Iconos de Leaflet ──────────────────────────────────
const iconoUsuario = L.divIcon({
  className: 'mx-user-wrap',
  html: '<div class="mx-user"><span class="mx-user-halo"></span><span class="mx-user-dot"></span></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function iconoPin(l: Lugar): L.DivIcon {
  const c = categoriaDe(l.tipo);
  return L.divIcon({
    className: 'mx-pin-wrap',
    html: `<div class="mx-pin" style="--pin-color:${c.color}"><img src="${c.icono}" alt="">${
      l.personalizado ? '<span class="mx-pin-badge"></span>' : ''
    }</div>`,
    iconSize: [34, 41],
    iconAnchor: [17, 41],
    popupAnchor: [0, -42],
  });
}

// ── Popups ─────────────────────────────────────────────
function construirPopup(l: Lugar): HTMLElement {
  const c = categoriaDe(l.tipo);
  const u = ubicacion.value;
  const dist = u ? formatearDistancia(calcularDistancia(u.lat, u.lng, l.lat, l.lng)) : '';
  const fotos = l.fotos ?? [];
  const claseFotos = fotos.length === 1 ? 'una' : fotos.length === 2 ? 'dos' : '';

  const el = document.createElement('div');
  el.className = 'mx-pop';
  el.innerHTML = `
    <div class="mx-pop-head">
      <span class="mx-glyph" style="background:${c.color}"><img src="${c.icono}" alt=""></span>
      <div>
        <div class="mx-pop-title">${escaparHtml(l.nombre)}</div>
        <div class="mx-pop-sub">${c.etiqueta}${dist ? ` · ${dist}` : ''}${l.personalizado ? ' · Mi lugar' : ''}</div>
      </div>
    </div>
    ${fotos.length ? `
      <div class="mx-pop-photos ${claseFotos}" data-accion="fotos">
        ${fotos.slice(0, 3).map(f => `<img src="${f}" alt="">`).join('')}
        ${fotos.length > 3 ? `<span class="mx-pop-more">+${fotos.length - 3}</span>` : ''}
      </div>` : ''}
    ${l.descripcion ? `<p class="mx-pop-desc">${escaparHtml(l.descripcion)}</p>` : ''}
    <div class="mx-pop-actions">
      <button class="mx-btn mx-btn-primary" data-accion="ruta">${svgEnLinea(navigate)}<span>Cómo llegar</span></button>
      ${fotos.length ? `<button class="mx-btn mx-btn-secondary" data-accion="fotos">${svgEnLinea(images)}<span>${fotos.length}</span></button>` : ''}
      ${l.personalizado ? `<button class="mx-btn mx-btn-danger" data-accion="eliminar" aria-label="Eliminar">${svgEnLinea(ICONO_PAPELERA)}</button>` : ''}
    </div>`;

  el.querySelectorAll<HTMLElement>('[data-accion]').forEach(b => {
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      const accion = b.dataset.accion;
      if (accion === 'ruta') trazarRuta(l);
      else if (accion === 'fotos') abrirGaleria(l);
      else if (accion === 'eliminar') confirmarEliminar(l);
    });
  });
  L.DomEvent.disableClickPropagation(el);
  return el;
}

function crearMarcador(l: Lugar) {
  if (!map || !capaLugares) return;
  const m = L.marker([l.lat, l.lng], { icon: iconoPin(l), riseOnHover: true });
  m.bindPopup(() => construirPopup(l), {
    className: 'mx-popup',
    maxWidth: 260,
    minWidth: 260,
    autoPanPaddingTopLeft: L.point(16, 80),
    autoPanPaddingBottomRight: L.point(16, 200),
  });
  m.on('popupopen', () => m.getElement()?.classList.add('activo'));
  m.on('popupclose', () => m.getElement()?.classList.remove('activo'));
  marcadores.set(l.id, m);
  if (coincideFiltro(l)) capaLugares.addLayer(m);
}

function actualizarVisibilidad() {
  if (!capaLugares) return;
  todos.value.forEach(l => {
    const m = marcadores.get(l.id);
    if (!m) return;
    const visible = coincideFiltro(l);
    if (visible && !capaLugares!.hasLayer(m)) capaLugares!.addLayer(m);
    else if (!visible && capaLugares!.hasLayer(m)) capaLugares!.removeLayer(m);
  });
}

watch(filtro, () => {
  actualizarVisibilidad();
  if (!map || filtro.value === 'todos') return;
  const visibles = todos.value.filter(coincideFiltro);
  if (!visibles.length) return;
  map.flyToBounds(
    L.latLngBounds(visibles.map(l => [l.lat, l.lng] as L.LatLngTuple)),
    { paddingTopLeft: [50, 100], paddingBottomRight: [50, 230], maxZoom: 16, duration: 0.8 }
  );
});

function enfocarLugar(l: Lugar) {
  if (!map) return;
  estadoSheet.value = 'colapsado';
  quitarFoco();
  siguiendo.value = false;
  map.flyTo([l.lat, l.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
  map.once('moveend', () => marcadores.get(l.id)?.openPopup());
}

// ── Estilo de mapa ─────────────────────────────────────
function aplicarEstilo(id: EstiloMapaId) {
  if (!map) return;
  const e = estiloPorId(id);
  capaBase?.remove();
  capaEtiquetas?.remove();
  capaEtiquetas = undefined;
  capaBase = L.tileLayer(e.url, {
    attribution: e.atribucion,
    subdomains: e.subdominios ?? 'abc',
    maxZoom: e.maxZoom,
    zIndex: 1,
  }).addTo(map);
  if (e.etiquetas) {
    capaEtiquetas = L.tileLayer(e.etiquetas, { subdomains: 'abcd', maxZoom: 20, zIndex: 2 }).addTo(map);
  }
}

async function cambiarEstilo(id: EstiloMapaId) {
  estiloActual.value = id;
  aplicarEstilo(id);
  await Preferences.set({ key: CLAVE_ESTILO, value: id });
  setTimeout(() => (panelEstilos.value = false), 250);
}

// ── Ubicación ──────────────────────────────────────────
function actualizarUsuario(lat: number, lng: number, precision?: number | null) {
  ubicacion.value = { lat, lng };
  if (!map) return;

  if (marcadorUsuario) marcadorUsuario.setLatLng([lat, lng]);
  else {
    marcadorUsuario = L.marker([lat, lng], { icon: iconoUsuario, zIndexOffset: 1000, interactive: false }).addTo(map);
  }

  if (precision && precision > 0) {
    if (circuloPrecision) circuloPrecision.setLatLng([lat, lng]).setRadius(precision);
    else {
      circuloPrecision = L.circle([lat, lng], {
        radius: precision, color: '#007aff', weight: 1, opacity: 0.3,
        fillColor: '#007aff', fillOpacity: 0.08, interactive: false,
      }).addTo(map);
    }
  }

  if (siguiendo.value) map.panTo([lat, lng], { animate: true });
}

async function centrarEnUsuario() {
  if (!map) return;
  if (ubicacion.value) {
    siguiendo.value = true;
    map.flyTo([ubicacion.value.lat, ubicacion.value.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
  }
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    const { latitude, longitude, accuracy } = pos.coords;
    const primeraVez = !ubicacion.value;
    siguiendo.value = true;
    actualizarUsuario(latitude, longitude, accuracy);
    if (primeraVez) map.flyTo([latitude, longitude], 16, { duration: 0.8 });
  } catch (err) {
    console.warn('Ubicación no disponible:', err);
    if (!ubicacion.value) mostrarToast('No pudimos obtener tu ubicación', alertCircle);
  }
}

async function iniciarSeguimiento() {
  try {
    watchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
      if (err || !pos) return;
      actualizarUsuario(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    });
  } catch (err) {
    console.warn('No se pudo iniciar el seguimiento:', err);
  }
}

// ── Rutas ──────────────────────────────────────────────
async function pedirRuta(o: LatLng, d: LatLng) {
  const coords = `${o.lng},${o.lat};${d.lng},${d.lat}`;
  const servidores = [
    `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson`,
    `https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`,
  ];
  for (const url of servidores) {
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.routes?.length) return data.routes[0];
    } catch { /* probar siguiente servidor */ }
  }
  throw new Error('No se encontró ruta');
}

async function trazarRuta(l: Lugar) {
  if (!map) return;
  if (!ubicacion.value) {
    mostrarToast('Activa tu ubicación para trazar rutas', alertCircle);
    return;
  }
  map.closePopup();
  cargandoRuta.value = true;
  try {
    const r = await pedirRuta(ubicacion.value, l);
    const coords = r.geometry.coordinates.map((c: [number, number]) => L.latLng(c[1], c[0]));
    capaRuta?.remove();
    capaRuta = L.layerGroup([
      L.polyline(coords, { color: '#ffffff', weight: 11, lineCap: 'round', lineJoin: 'round', className: 'mx-route-casing' }),
      L.polyline(coords, { color: '#007aff', weight: 7, lineCap: 'round', lineJoin: 'round' }),
    ]).addTo(map);
    rutaInfo.value = {
      tiempo: formatearTiempo(r.duration),
      distancia: formatearDistancia(r.distance),
      destino: l.nombre,
    };
    estadoSheet.value = 'colapsado';
    siguiendo.value = false;
    map.flyToBounds(L.latLngBounds(coords), {
      paddingTopLeft: [40, 90], paddingBottomRight: [40, 290], duration: 0.8,
    });
  } catch (err) {
    console.error('Error trazando ruta:', err);
    mostrarToast('No se pudo calcular la ruta', alertCircle);
  } finally {
    cargandoRuta.value = false;
  }
}

function finalizarRuta() {
  capaRuta?.remove();
  capaRuta = undefined;
  rutaInfo.value = null;
}

// ── Sitios personalizados ──────────────────────────────
async function cargarSitios() {
  try {
    const { value } = await Preferences.get({ key: CLAVE_SITIOS });
    const lista = value ? (JSON.parse(value) as Partial<Lugar>[]) : [];
    sitios.value = lista.map(s => ({
      id: String(s.id ?? Date.now()),
      nombre: s.nombre ?? 'Sin nombre',
      tipo: (s.tipo ?? 'parque') as TipoPunto,
      lat: Number(s.lat),
      lng: Number(s.lng),
      descripcion: s.descripcion ?? '',
      fotos: s.fotos ?? [],
      fechaCreacion: s.fechaCreacion,
      personalizado: true,
    }));
  } catch (err) {
    console.error('Error cargando sitios:', err);
  }
}

async function guardarSitios(): Promise<boolean> {
  try {
    await Preferences.set({ key: CLAVE_SITIOS, value: JSON.stringify(sitios.value) });
    return true;
  } catch (err) {
    console.error('Error guardando sitios:', err);
    mostrarToast('Almacenamiento lleno: intenta con menos fotos', alertCircle);
    return false;
  }
}

async function recargarSitios() {
  sitios.value.forEach(s => {
    const m = marcadores.get(s.id);
    if (m) capaLugares?.removeLayer(m);
    marcadores.delete(s.id);
  });
  await cargarSitios();
  sitios.value.forEach(crearMarcador);
}

function activarModoAgregar() {
  if (!map) return;
  map.closePopup();
  estadoSheet.value = 'colapsado';
  quitarFoco();
  siguiendo.value = false;
  const c = map.getCenter();
  centro.value = { lat: c.lat, lng: c.lng };
  modoAgregar.value = true;
  if (map.getZoom() < 16) map.flyTo(c, 16, { duration: 0.6 });
}

function confirmarUbicacion() {
  if (!map) return;
  const c = map.getCenter();
  puntoNuevo.value = { lat: c.lat, lng: c.lng };
  mostrarModalAgregar.value = true;
}

async function guardarNuevoSitio(data: {
  nombre: string; descripcion: string; tipo: string; lat: number; lng: number; fotos: string[];
}) {
  const nuevo: Lugar = {
    id: `u-${Date.now()}`,
    nombre: data.nombre,
    tipo: data.tipo as TipoPunto,
    lat: data.lat,
    lng: data.lng,
    descripcion: data.descripcion,
    fotos: data.fotos,
    personalizado: true,
    fechaCreacion: new Date().toISOString(),
  };
  sitios.value = [nuevo, ...sitios.value];
  if (!(await guardarSitios())) {
    sitios.value = sitios.value.filter(s => s.id !== nuevo.id);
    return;
  }
  crearMarcador(nuevo);
  modoAgregar.value = false;
  mostrarModalAgregar.value = false;
  mostrarToast('Lugar guardado', checkmarkCircle);
  setTimeout(() => marcadores.get(nuevo.id)?.openPopup(), 450);
}

async function confirmarEliminar(l: Lugar) {
  const alerta = await alertController.create({
    header: 'Eliminar lugar',
    message: `Se eliminará "${l.nombre}" y sus fotos. Esta acción no se puede deshacer.`,
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Eliminar', role: 'destructive', handler: () => { eliminarSitio(l); } },
    ],
  });
  await alerta.present();
}

async function eliminarSitio(l: Lugar) {
  map?.closePopup();
  const m = marcadores.get(l.id);
  if (m) capaLugares?.removeLayer(m);
  marcadores.delete(l.id);
  sitios.value = sitios.value.filter(s => s.id !== l.id);
  await guardarSitios();
  mostrarToast('Lugar eliminado', checkmarkCircle);
}

function abrirGaleria(l: Lugar) {
  galeria.nombre = l.nombre;
  galeria.descripcion = l.descripcion ?? '';
  galeria.tipo = l.tipo;
  galeria.fotos = [...(l.fotos ?? [])];
  galeria.fecha = l.fechaCreacion ?? '';
  mostrarGaleria.value = true;
}

async function mostrarToast(message: string, icon?: string) {
  const toast = await toastController.create({ message, icon, duration: 1800, position: 'top' });
  await toast.present();
}

// ── Ciclo de vida ──────────────────────────────────────
async function inicializarMapa() {
  const { value: estiloGuardado } = await Preferences.get({ key: CLAVE_ESTILO });
  const oscuro = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  estiloActual.value = estiloGuardado ? estiloPorId(estiloGuardado).id : oscuro ? 'oscuro' : 'estandar';

  map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    zoomSnap: 0.5,
    center: [4.6097, -74.0817],
    zoom: 13,
  });
  L.control.attribution({ position: 'topleft', prefix: false }).addTo(map);
  aplicarEstilo(estiloActual.value);

  capaLugares = L.layerGroup().addTo(map);
  PUNTOS.forEach(crearMarcador);
  await cargarSitios();
  sitios.value.forEach(crearMarcador);

  map.on('click', () => {
    if (estadoSheet.value === 'expandido') estadoSheet.value = 'colapsado';
    quitarFoco();
  });
  map.on('dragstart', () => (siguiendo.value = false));
  map.on('movestart', () => (moviendo.value = true));
  map.on('moveend', () => (moviendo.value = false));
  map.on('move', () => {
    if (!modoAgregar.value || !map) return;
    const c = map.getCenter();
    centro.value = { lat: c.lat, lng: c.lng };
  });
  setTimeout(() => map?.invalidateSize(), 250);

  // La ubicación no bloquea el renderizado del mapa
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    const { latitude, longitude, accuracy } = pos.coords;
    actualizarUsuario(latitude, longitude, accuracy);
    map.flyTo([latitude, longitude], 15, { duration: 1.2 });
  } catch (err) {
    console.warn('Geolocalización no disponible, usando Bogotá:', err);
  }
  iniciarSeguimiento();
}

onMounted(() => {
  paginaEl.value = paginaRef.value?.$el;
  inicializarMapa();
});

onIonViewWillEnter(async () => {
  if (!map) return;
  await recargarSitios();
  setTimeout(() => map?.invalidateSize(), 150);
});

onBeforeUnmount(() => {
  if (watchId) Geolocation.clearWatch({ id: watchId });
  map?.remove();
});
</script>

<style scoped>
.mx-content {
  --background: var(--mx-bg);
}

#map {
  position: absolute;
  inset: 0;
  z-index: 0;
}

/* ── Material de vidrio compartido ─────────────────── */
.mx-controls,
.mx-sheet,
.mx-floating-pill,
.mx-add-bar,
.mx-style-panel {
  background: var(--mx-glass);
  backdrop-filter: var(--mx-blur);
  -webkit-backdrop-filter: var(--mx-blur);
  border: 0.5px solid var(--mx-glass-border);
}

/* ── Controles ─────────────────────────────────────── */
.mx-controls {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 12px);
  right: 12px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  box-shadow: var(--mx-shadow-sm);
  overflow: hidden;
  transition: opacity 0.25s, transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.mx-controls.oculto {
  opacity: 0;
  transform: translateX(24px);
  pointer-events: none;
}
.mx-ctrl {
  appearance: none;
  border: none;
  background: transparent;
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--mx-blue);
  font-size: 21px;
  cursor: pointer;
  transition: background 0.15s;
}
.mx-ctrl:active { background: var(--mx-fill); }
.mx-ctrl-sep {
  height: 0.5px;
  background: var(--mx-separator);
  margin: 0 9px;
}

/* ── Píldoras flotantes ────────────────────────────── */
.mx-floating-pill {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 14px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 22px;
  box-shadow: var(--mx-shadow-sm);
  color: var(--mx-text);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}
.mx-floating-pill ion-spinner { width: 18px; height: 18px; color: var(--mx-blue); }
.mx-floating-pill ion-icon { font-size: 18px; color: var(--mx-blue); }
.mx-hint {
  top: calc(env(safe-area-inset-top) + 44px);
  animation: mx-drop 0.4s cubic-bezier(0.32, 0.72, 0, 1);
}

/* ── Pin central (modo agregar) ────────────────────── */
.mx-center-pin {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 15;
  transform: translate(-50%, -100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}
.mx-center-pin-head {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--mx-red);
  border: 3px solid #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 26px;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.mx-center-pin-stick {
  width: 3px;
  height: 16px;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.mx-center-pin-shadow {
  position: absolute;
  bottom: -3px;
  left: 50%;
  width: 14px;
  height: 6px;
  margin-left: -7px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  transition: transform 0.25s, opacity 0.25s;
}
.mx-center-pin.levantado .mx-center-pin-head,
.mx-center-pin.levantado .mx-center-pin-stick { transform: translateY(-14px); }
.mx-center-pin.levantado .mx-center-pin-shadow { transform: scale(1.5); opacity: 0.45; }

/* ── Barra inferior (modo agregar) ─────────────────── */
.mx-add-bar {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(env(safe-area-inset-bottom) + 16px);
  max-width: 480px;
  margin: 0 auto;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 12px 12px 16px;
  border-radius: 22px;
  box-shadow: var(--mx-shadow);
  animation: mx-rise 0.4s cubic-bezier(0.32, 0.72, 0, 1);
}
.mx-add-coords { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.mx-add-title { font-size: 16px; font-weight: 600; color: var(--mx-text); }
.mx-add-sub {
  font-size: 12px;
  color: var(--mx-text-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Botones píldora ───────────────────────────────── */
.mx-pill {
  appearance: none;
  border: none;
  height: 40px;
  padding: 0 16px;
  border-radius: 20px;
  font: 600 15px var(--ion-font-family);
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.12s, opacity 0.12s;
  flex-shrink: 0;
}
.mx-pill:active { transform: scale(0.95); opacity: 0.85; }
.mx-pill.primario { background: var(--mx-blue); color: #fff; }
.mx-pill.secundario { background: var(--mx-fill); color: var(--mx-blue); }
.mx-pill.peligro { background: var(--mx-red); color: #fff; }

/* ── Hoja inferior ─────────────────────────────────── */
.mx-sheet {
  --peek: calc(150px + env(safe-area-inset-bottom));
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  height: min(80%, 720px);
  display: flex;
  flex-direction: column;
  border-bottom: none;
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -6px 30px rgba(0, 0, 0, 0.12);
  padding-bottom: env(safe-area-inset-bottom);
  transform: translateY(var(--sheet-offset));
  transition: transform 0.45s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s;
}
.mx-sheet.con-ruta { --peek: calc(232px + env(safe-area-inset-bottom)); }
.mx-sheet.estado-colapsado { --sheet-offset: calc(100% - var(--peek)); }
.mx-sheet.estado-expandido { --sheet-offset: 0px; }
.mx-sheet.oculto { --sheet-offset: 100%; opacity: 0; pointer-events: none; }
.mx-sheet.arrastrando { transition: none; }

@media (min-width: 768px) {
  .mx-sheet {
    left: 16px;
    right: auto;
    bottom: 16px;
    width: 390px;
    border-radius: 22px;
    border-bottom: 0.5px solid var(--mx-glass-border);
    height: calc(100% - 32px - env(safe-area-inset-top));
  }
}

.mx-drag-zone {
  flex-shrink: 0;
  touch-action: none;
  cursor: grab;
  padding-bottom: 6px;
}
.mx-grabber {
  display: block;
  width: 38px;
  height: 5px;
  margin: 8px auto 6px;
  border-radius: 3px;
  background: var(--mx-text-3);
}

/* Ruta */
.mx-route-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 16px 6px;
  padding: 12px;
  border-radius: 16px;
  background: var(--mx-surface);
  box-shadow: var(--mx-shadow-sm);
  cursor: default;
  animation: mx-rise 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.mx-route-icon {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: var(--mx-blue);
  color: #fff;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.mx-route-text { flex: 1; min-width: 0; }
.mx-route-time {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.4px;
  color: var(--mx-text);
}
.mx-route-sub {
  font-size: 13px;
  color: var(--mx-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Buscador */
.mx-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  flex-shrink: 0;
}
.mx-search {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 10px;
  border-radius: 12px;
  background: var(--mx-fill);
  color: var(--mx-text-2);
}
.mx-search > ion-icon { font-size: 18px; flex-shrink: 0; }
.mx-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: 17px var(--ion-font-family);
  color: var(--mx-text);
}
.mx-search input::placeholder { color: var(--mx-text-2); }
.mx-search input::-webkit-search-cancel-button { display: none; }
.mx-search-clear {
  border: none;
  background: none;
  padding: 0;
  display: flex;
  color: var(--mx-text-3);
  font-size: 18px;
  cursor: pointer;
}
.mx-round-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--mx-blue);
  color: #fff;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(0, 122, 255, 0.35);
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s;
}
.mx-round-btn:active { transform: scale(0.9); }

/* Chips */
.mx-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 12px 16px 14px;
  flex-shrink: 0;
  scrollbar-width: none;
}
.mx-chips::-webkit-scrollbar { display: none; }
.mx-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 13px 0 5px;
  border: none;
  border-radius: 18px;
  background: var(--mx-surface);
  color: var(--mx-text);
  font: 500 14px var(--ion-font-family);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: background 0.2s, color 0.2s, transform 0.15s;
}
.mx-chip:active { transform: scale(0.95); }
.mx-chip.activo { background: var(--mx-blue); color: #fff; }
.mx-chip-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  transition: background 0.2s;
}
.mx-chip.activo .mx-chip-dot { background: rgba(255, 255, 255, 0.25) !important; }
.mx-chip-count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--mx-fill);
  font-size: 12px;
  font-weight: 600;
}
.mx-chip.activo .mx-chip-count { background: rgba(255, 255, 255, 0.25); }

/* Lista */
.mx-list-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 24px;
  overscroll-behavior: contain;
}
.mx-section-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 4px 4px 10px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--mx-text);
}
.mx-section-count { font-size: 15px; font-weight: 400; color: var(--mx-text-2); }
.mx-list {
  background: var(--mx-surface);
  border-radius: 14px;
  overflow: hidden;
}
.mx-row {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: none;
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.mx-row:active { background: var(--mx-fill); }
.mx-row + .mx-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 64px;
  right: 0;
  height: 0.5px;
  background: var(--mx-separator);
}
.mx-row-glyph {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 19px;
  flex-shrink: 0;
}
.mx-row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.mx-row-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--mx-text);
  min-width: 0;
}
.mx-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mx-row-star { color: #ffcc00; font-size: 13px; flex-shrink: 0; }
.mx-row-sub {
  margin-top: 1px;
  font-size: 13px;
  color: var(--mx-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mx-row-thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}
.mx-row-chev { color: var(--mx-text-3); font-size: 16px; flex-shrink: 0; }

.mx-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--mx-text-2);
  font-size: 14px;
}
.mx-empty > ion-icon { font-size: 44px; color: var(--mx-text-3); }
.mx-empty-title { margin: 8px 0 4px; font-size: 17px; font-weight: 600; color: var(--mx-text); }
.mx-empty p { margin: 0; }

/* ── Panel de estilos ──────────────────────────────── */
.mx-backdrop {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.25);
}
.mx-style-panel {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: calc(env(safe-area-inset-bottom) + 8px);
  max-width: 480px;
  margin: 0 auto;
  z-index: 41;
  padding: 16px;
  border-radius: 28px;
  box-shadow: var(--mx-shadow);
}
.mx-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.mx-panel-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--mx-text);
}
.mx-close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: var(--mx-fill);
  color: var(--mx-text-2);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.mx-style-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.mx-style-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  font: 500 14px var(--ion-font-family);
  color: var(--mx-text);
  cursor: pointer;
}
.mx-style-card img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: 14px;
  border: 3px solid transparent;
  background: var(--mx-fill);
  box-shadow: var(--mx-shadow-sm);
  transition: border-color 0.2s, transform 0.15s;
}
.mx-style-card:active img { transform: scale(0.97); }
.mx-style-card.activo img { border-color: var(--mx-blue); }
.mx-style-card.activo span { color: var(--mx-blue); font-weight: 600; }

/* ── Transiciones ──────────────────────────────────── */
.mx-fade-enter-active,
.mx-fade-leave-active { transition: opacity 0.25s; }
.mx-fade-enter-from,
.mx-fade-leave-to { opacity: 0; }

.mx-slide-enter-active,
.mx-slide-leave-active { transition: transform 0.45s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s; }
.mx-slide-enter-from,
.mx-slide-leave-to { transform: translateY(110%); opacity: 0; }

@keyframes mx-drop {
  from { opacity: 0; transform: translate(-50%, -16px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes mx-rise {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: none; }
}
</style>
