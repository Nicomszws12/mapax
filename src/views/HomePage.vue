<template>
  <ion-page ref="paginaRef">
    <ion-content :fullscreen="true" :scroll-y="false" class="mx-content">
      <div id="map"></div>

      <!-- ── Barra flotante superior de medición de distancia y área ── -->
      <MapMeasureBar
        :is-measuring="isMeasuring"
        :measure-mode="measureMode"
        :points-count="measurePoints.length"
        :result-text="calculatedResult"
        @change-mode="setMeasureMode"
        @undo="removeLastPoint"
        @clear="clearPoints"
        @close="stopMeasuring"
      />

      <!-- ── Buscador flotante superior (TomTom Search) ── -->
      <div class="mx-search-floater" :class="{ oculto: ocultarUi || isMeasuring }" @click.stop>
        <div class="mx-search-bar-wrap">
          <ion-searchbar
            ref="searchbarRef"
            v-model="busquedaTomTom"
            placeholder="Buscar dirección, parque, restaurante..."
            :debounce="350"
            mode="md"
            class="mx-tomtom-searchbar"
            @ionInput="onInputBusquedaTomTom"
            @ionClear="limpiarBusquedaTomTom"
            @ionFocus="onFocusBusquedaTomTom"
          />
          <div v-if="buscandoTomTom" class="mx-search-spinner" aria-hidden="true">
            <ion-spinner name="crescent" />
          </div>
        </div>

        <!-- Lista flotante de sugerencias -->
        <transition name="mx-fade">
          <div
            v-if="mostrarSugerencias && resultadosTomTom.length > 0"
            class="mx-search-dropdown"
          >
            <div class="mx-search-dropdown-header">
              <span>Sugerencias de TomTom</span>
              <button
                class="mx-search-close-btn"
                aria-label="Cerrar sugerencias"
                @click="cerrarSugerencias"
              >
                <ion-icon :icon="close" />
              </button>
            </div>
            <ion-list lines="none" class="mx-search-results-list">
              <ion-item
                v-for="item in resultadosTomTom"
                :key="item.id"
                button
                :detail="false"
                class="mx-search-item"
                @click="seleccionarResultado(item)"
              >
                <div class="mx-search-item-glyph" slot="start">
                  <ion-icon :icon="locationOutline" />
                </div>
                <ion-label class="mx-search-item-label">
                  <h3 class="mx-search-item-title">{{ item.name }}</h3>
                  <p class="mx-search-item-subtitle">{{ item.address }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>
        </transition>
      </div>

      <!-- ── Filtro Dinámico de Categorías (Chips Deslizables) ── -->
      <div class="mx-category-chips-bar" :class="{ oculto: ocultarUi || isMeasuring }">
        <ion-chip
          v-for="cat in categoriasBase"
          :key="cat.id"
          :color="selectedCategory === cat.id ? 'primary' : undefined"
          :outline="selectedCategory !== cat.id"
          class="mx-filter-chip"
          :class="{ activo: selectedCategory === cat.id }"
          @click="seleccionarCategoria(cat.id)"
        >
          <ion-icon :icon="cat.icono" />
          <ion-label>{{ cat.nombre }}</ion-label>
        </ion-chip>
      </div>

      <!-- ── Controles flotantes (arriba a la derecha) ── -->
      <div class="mx-controls" :class="{ oculto: ocultarUi || isMeasuring }">
        <button class="mx-ctrl" aria-label="Estilo del mapa" @click="panelEstilos = true">
          <ion-icon :icon="mapOutline" />
        </button>
        <span class="mx-ctrl-sep"></span>
        <button class="mx-ctrl" aria-label="Copia de seguridad y datos" @click="mostrarMenuBackup">
          <ion-icon :icon="cloudUploadOutline" />
        </button>
        <span class="mx-ctrl-sep"></span>
        <button
          class="mx-ctrl"
          :class="{ activo: siguiendo }"
          aria-label="Mi ubicación"
          @click="centrarEnUsuario"
        >
          <ion-icon :icon="siguiendo ? locate : locateOutline" />
        </button>
        <span class="mx-ctrl-sep"></span>
        <button class="mx-ctrl" aria-label="Ajustes y créditos" @click="ionRouter.push('/credits')">
          <ion-icon :icon="settingsOutline" />
        </button>
      </div>

      <!-- ── Botón flotante FAB para centrar ubicación (mira GPS) ── -->
      <button
        class="mx-fab-locate"
        :class="{
          activo: siguiendo,
          oculto: modoAgregar || (isNavigating && siguiendo) || isMeasuring,
          'en-navegacion': isNavigating,
          'en-grabacion': isRecording && !isNavigating
        }"
        aria-label="Centrar en mi ubicación (mantener presionado para compartir)"
        @click="centrarEnUsuario"
        @contextmenu.prevent="mostrarOpcionesUbicacion"
        @touchstart="iniciarPulsacionLargaUbicacion"
        @touchend="cancelarPulsacionLargaUbicacion"
        @touchcancel="cancelarPulsacionLargaUbicacion"
      >
        <ion-icon :icon="siguiendo ? locate : locateOutline" />
      </button>

      <!-- ── Botón flotante FAB para Medir Distancias y Áreas ── -->
      <button
        v-if="!isMeasuring && !isRecording && !isNavigating"
        class="mx-fab-measure"
        :class="{ oculto: ocultarUi }"
        aria-label="Medir distancia o área en el mapa"
        @click="iniciarModoMedicion"
      >
        <ion-icon :icon="resizeOutline" class="measure-icon-btn" />
        <span>Medir</span>
      </button>

      <!-- ── Botón flotante FAB para Grabar Recorrido (Breadcrumbs) ── -->
      <button
        v-if="!isRecording"
        class="mx-fab-track"
        :class="{ oculto: ocultarUi || isMeasuring }"
        aria-label="Iniciar grabación de recorrido"
        @click="iniciarGrabacionTrack"
      >
        <ion-icon :icon="radioButtonOn" class="rec-icon-btn" />
        <span>Grabar</span>
      </button>

      <!-- ── Indicador de carga de ruta ── -->
      <transition name="mx-fade">
        <div v-if="cargandoRuta" class="mx-floating-pill">
          <ion-spinner name="crescent" />
          <span>Calculando ruta con tráfico en vivo…</span>
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

      <!-- ── Hoja inferior (Bottom Sheet UI Kit) ── -->
      <section
        class="mx-sheet"
        :class="[`estado-${estadoSheet}`, { oculto: ocultarUi || isRecording || isMeasuring, 'con-ruta': !!rutaInfo, arrastrando: arrastre.activo }]"
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

          <!-- Ruta activa con TomTom y Tráfico en Vivo -->
          <div v-if="rutaInfo" class="mx-route-card" @pointerdown.stop>
            <div class="mx-route-icon" :class="{ congestion: !rutaInfo.esTraficoFluido }">
              <ion-icon :icon="carSport" />
            </div>
            <div class="mx-route-text">
              <div class="mx-route-main">
                <span class="mx-route-time">{{ rutaInfo.tiempoTexto }}</span>
                <span
                  class="mx-traffic-badge"
                  :class="rutaInfo.esTraficoFluido ? 'fluido' : 'congestion'"
                >
                  <ion-icon :icon="rutaInfo.esTraficoFluido ? checkmarkCircle : warningOutline" />
                  {{ rutaInfo.estadoTrafico }}
                </span>
              </div>
              <div class="mx-route-sub">
                <span>{{ rutaInfo.distanciaTexto }}</span>
                <span class="mx-route-dot">·</span>
                <span class="mx-route-dest">{{ rutaInfo.destino }}</span>
              </div>
            </div>
            <div class="mx-route-actions">
              <button class="mx-pill primario" aria-label="Iniciar viaje" @click="iniciarViaje">
                <ion-icon :icon="navigate" />
                <span>Iniciar</span>
              </button>
              <button
                class="mx-pill secundario mx-external-nav-btn"
                aria-label="Abrir en Maps o Waze"
                title="Abrir en Maps / Waze"
                @click="abrirNavegacionExternaRuta"
              >
                <ion-icon :icon="arrowRedoOutline" />
                <span>Abrir en Maps / Waze</span>
              </button>
              <div class="mx-route-aux-actions">
                <button
                  class="mx-pill secundario mx-share-route-btn"
                  aria-label="Compartir ruta"
                  title="Compartir trayecto y destino"
                  @click="compartirRutaActiva"
                >
                  <ion-icon :icon="shareSocialOutline" />
                  <span>Compartir</span>
                </button>
                <button class="mx-pill peligro" aria-label="Cancelar ruta" title="Cerrar ruta" @click="finalizarRuta">
                  <ion-icon :icon="close" />
                  <span>Cerrar</span>
                </button>
              </div>
            </div>
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

      <!-- ── Tarjeta inferior de lugar buscado (Bottom Card) ── -->
      <transition name="mx-slide">
        <div
          v-if="lugarBuscadoSeleccionado && !rutaInfo"
          class="mx-search-place-card"
          :class="{ oculto: ocultarUi }"
          @click.stop
        >
          <div class="mx-search-place-header">
            <div class="mx-search-place-icon">
              <ion-icon :icon="location" />
            </div>
            <div class="mx-search-place-info">
              <h3 class="mx-search-place-title">{{ lugarBuscadoSeleccionado.name }}</h3>
              <p class="mx-search-place-address">{{ lugarBuscadoSeleccionado.address }}</p>
              <span v-if="lugarBuscadoSeleccionado.category" class="mx-search-place-badge">
                {{ lugarBuscadoSeleccionado.category }}
              </span>
            </div>
            <button
              class="mx-search-place-close"
              aria-label="Descartar"
              @click="descartarMarcadorBusqueda"
            >
              <ion-icon :icon="close" />
            </button>
          </div>
          <div class="mx-search-place-actions">
            <button class="mx-btn mx-btn-primary" @click="trazarRutaHaciaLugarBuscado">
              <ion-icon :icon="navigate" />
              <span>Cómo llegar</span>
            </button>
            <button
              class="mx-btn mx-btn-secondary"
              aria-label="Abrir en Maps o Waze"
              title="Abrir en Maps / Waze"
              @click="abrirNavegacionExternaLugarBuscado"
            >
              <ion-icon :icon="arrowRedoOutline" />
              <span>Maps / Waze</span>
            </button>
            <button
              class="mx-btn mx-btn-secondary"
              aria-label="Compartir lugar"
              @click="compartirLugarBuscado"
            >
              <ion-icon :icon="shareSocialOutline" />
              <span>Compartir</span>
            </button>
            <button class="mx-btn mx-btn-secondary" @click="descartarMarcadorBusqueda">
              <ion-icon :icon="trashOutline" />
              <span>Descartar</span>
            </button>
          </div>
        </div>
      </transition>

      <!-- ── HUD de navegación paso a paso ── -->
      <NavigationHud
        :is-navigating="isNavigating"
        :step="currentStep"
        :distance-to-next-step="distanceToNextStep"
        :remaining-distance-meters="metricasRestantes.metros"
        :remaining-seconds="metricasRestantes.segundos"
        :gps-lost="gpsSenalPerdida"
        @finalizar="finalizarViaje"
      />

      <!-- ── Panel flotante de grabación de recorrido en vivo ── -->
      <TrackRecorderPanel
        :is-recording="isRecording"
        :is-paused="isPaused"
        :formatted-time="formattedTime"
        :formatted-distance="formattedDistanceKm"
        :average-speed-kmh="averageSpeedKmh"
        @pausar="pauseRecording"
        @reanudar="resumeRecording"
        @finalizar="abrirModalGuardarTrack"
      />
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

    <GuardarRecorridoModal
      :is-open="mostrarModalGuardarTrack"
      :duration-seconds="elapsedSeconds"
      :distance-meters="totalDistanceMeters"
      :average-speed-kmh="averageSpeedKmh"
      :points-count="recordedPoints.length"
      :presenting-element="paginaEl"
      @guardar="confirmarGuardarTrack"
      @descartar="confirmarDescartarTrack"
      @cerrar="cerrarModalGuardarTrack"
    />

    <!-- ── Selector de archivo invisible para importar GeoJSON ── -->
    <input
      ref="inputArchivoBackupRef"
      type="file"
      accept=".json,.geojson"
      style="display: none"
      @change="onArchivoBackupSeleccionado"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import {
  IonPage, IonContent, IonIcon, IonSpinner, IonSearchbar, IonList, IonItem, IonLabel,
  IonChip,
  useIonRouter, alertController, toastController, actionSheetController, onIonViewWillEnter,
} from '@ionic/vue';
import {
  mapOutline, navigate, settingsOutline, add, search, searchOutline,
  closeCircle, close, star, starOutline, apps, chevronForward, images,
  checkmarkCircle, alertCircle, moveOutline, locate, locateOutline,
  carSport, warningOutline, location, locationOutline, trashOutline,
  gridOutline, restaurantOutline, bookmarkOutline, radioButtonOn,
  shareSocialOutline, arrowRedoOutline,
  cloudUploadOutline, cloudDownloadOutline, resizeOutline,
} from 'ionicons/icons';
import { Geolocation, type Position } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import * as L from 'leaflet';

import AgregarSitioModal from '../components/AgregarSitioModal.vue';
import GaleriaFotosModal from '../components/GaleriaFotosModal.vue';
import NavigationHud from '../components/NavigationHud.vue';
import TrackRecorderPanel from '../components/TrackRecorderPanel.vue';
import GuardarRecorridoModal from '../components/GuardarRecorridoModal.vue';
import MapMeasureBar from '../components/MapMeasureBar.vue';
import { CATEGORIAS, TIPOS, categoriaDe, ICONO_PAPELERA, svgEnLinea, type TipoPunto } from '../data/categorias';
import {
  PUNTOS, CLAVE_SITIOS, CLAVE_ESTILO, CLAVE_FAVORITOS, calcularDistancia, formatearDistancia,
  escaparHtml, type Lugar,
} from '../data/lugares';
import { useTrackRecorder } from '../composables/useTrackRecorder';
import { useMapMeasure } from '../composables/useMapMeasure';
import { saveTrack, getSavedTracks, type RecordedTrack, type TrackPoint } from '../services/trackStorageService';
import { checkGeofences, resetGeofenceRadar } from '../services/geofenceRadarService';
import {
  buildBackupGeoJSON,
  downloadOrShareBackup,
  validateAndParseGeoJSON,
  promptRestoreMode,
  applyBackupRestore,
  type ParsedBackupData,
} from '../services/backupService';
import { ESTILOS, estiloPorId, type EstiloMapaId } from '../data/estilosMapa';
import { solicitarPermisosUbicacion } from '../services/permissionService';
import {
  inicializarCanalNotificaciones,
  notificarInicioRuta,
  notificarLlegadaDestino,
  vibrarAlLlegar,
} from '../services/notificationService';
import {
  asegurarPasos,
  calcularMetricasRestantes,
  calcularRumbo,
  evaluarAvance,
  PRECISION_MAX_AVANCE_M,
} from '../services/navigationService';
import {
  calcularRutaTomTom,
  type Coordenada,
  type NavigationStep,
} from '../services/routingService';
import {
  searchPlaces,
  type SearchPlaceResult,
} from '../services/searchService';
import {
  sharePlace,
  shareCurrentLocation,
  shareRoute,
} from '../services/shareService';
import { presentNavigationChooser } from '../services/externalNavigationService';

export interface InfoRutaActiva {
  tiempoTexto: string;
  tiempoMinutos: number;
  distanciaTexto: string;
  distanciaKm: number;
  estadoTrafico: string;
  esTraficoFluido: boolean;
  retrasoTraficoSegundos: number;
  destino: string;
}

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
let capaTrackPolyline: L.Polyline | undefined;
let marcadorUsuario: L.Marker | undefined;
let marcadorBusqueda: L.Marker | undefined;
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
const rutaInfo = ref<InfoRutaActiva | null>(null);
const destinoActivo = ref<{ lat: number; lng: number; nombre: string } | null>(null);
const notificadoLlegada = ref(false);
const cargandoRuta = ref(false);

// ── Navegación paso a paso ─────────────────────────────
const isNavigating = ref(false);
const currentStepIndex = ref(0);
const distanceToNextStep = ref(0);
const pasosNavegacion = ref<NavigationStep[]>([]);
const totalRutaMetros = ref(0);
const totalRutaSegundos = ref(0);
const gpsSenalPerdida = ref(false);

const ZOOM_NAVEGACION = 18;
const TIEMPO_SIN_SENAL_MS = 8000;
const VELOCIDAD_MIN_RUMBO_MS = 1.5;
const DISTANCIA_MIN_RUMBO_M = 8;
const VIGENCIA_RUMBO_GPS_MS = 3000;

let temporizadorSenal: ReturnType<typeof setInterval> | undefined;
let ultimaActualizacionGps = 0;
let ultimoRumboGpsTs = 0;
let posicionPrevia: LatLng | null = null;
let llegadaProcesada = false;

const currentStep = computed<NavigationStep | null>(
  () => pasosNavegacion.value[currentStepIndex.value] ?? null
);

const metricasRestantes = computed(() =>
  calcularMetricasRestantes(
    pasosNavegacion.value,
    currentStepIndex.value,
    distanceToNextStep.value,
    totalRutaMetros.value,
    totalRutaSegundos.value
  )
);

/** Oculta buscador, chips, controles y hoja inferior (modo agregar o navegación activa). */
const ocultarUi = computed(() => modoAgregar.value || isNavigating.value);

// ── Grabación de recorridos en vivo (Breadcrumbs) ─────
const {
  isRecording,
  isPaused,
  elapsedSeconds,
  totalDistanceMeters,
  recordedPoints,
  averageSpeedKmh,
  formattedTime,
  formattedDistanceKm,
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  resetRecording,
  addGpsPoint,
  cleanup: cleanupTrackRecorder,
} = useTrackRecorder();

const mostrarModalGuardarTrack = ref(false);

// ── Herramienta de Medición (Distancia y Área) ───────
const {
  isMeasuring,
  measureMode,
  measurePoints,
  calculatedResult,
  startMeasuring,
  stopMeasuring,
  setMeasureMode,
  removeLastPoint,
  clearPoints,
  attachMap: attachMeasureMap,
  cleanup: cleanupMeasure,
} = useMapMeasure();

function iniciarModoMedicion() {
  if (isNavigating.value || isRecording.value) return;
  if (estadoSheet.value === 'expandido') estadoSheet.value = 'colapsado';
  startMeasuring('distance');
}

// ── Respaldo de Datos (GeoJSON) ──────────────────────
const inputArchivoBackupRef = ref<HTMLInputElement | null>(null);

// ── Buscador TomTom ────────────────────────────────────
const searchbarRef = ref<{ $el: HTMLElement } | null>(null);
const busquedaTomTom = ref('');
const buscandoTomTom = ref(false);
const mostrarSugerencias = ref(false);
const resultadosTomTom = ref<SearchPlaceResult[]>([]);
const lugarBuscadoSeleccionado = ref<SearchPlaceResult | null>(null);

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

// ── Filtro Dinámico de Categorías (Chips Deslizables) ──
const selectedCategory = ref<string>('Todos');

const categoriasBase = [
  { id: 'Todos', nombre: 'Todos', icono: gridOutline },
  { id: 'Favoritos', nombre: 'Favoritos', icono: star },
  { id: 'Restaurantes', nombre: 'Restaurantes', icono: restaurantOutline },
  { id: 'Puntos de Interés', nombre: 'Puntos de Interés', icono: locationOutline },
  { id: 'Mis Sitios', nombre: 'Mis Sitios', icono: bookmarkOutline },
];

function coincideCategoria(l: Lugar): boolean {
  if (selectedCategory.value === 'Todos') return true;
  if (selectedCategory.value === 'Favoritos') return l.isFavorite === true;
  if (selectedCategory.value === 'Mis Sitios') return l.personalizado === true || l.categoria === 'Mis Sitios';
  if (selectedCategory.value === 'Restaurantes') {
    return l.categoria === 'Restaurantes' || l.tipo === 'restaurante' || l.tipo === 'cafeteria';
  }
  if (selectedCategory.value === 'Puntos de Interés') {
    return l.categoria === 'Puntos de Interés' || (!l.personalizado && l.tipo !== 'restaurante');
  }
  return l.categoria === selectedCategory.value;
}

const marcadoresFiltradosPorCategoria = computed<Lugar[]>(() => {
  return todos.value.filter(coincideCategoria);
});

function seleccionarCategoria(catId: string) {
  selectedCategory.value = catId;
  actualizarVisibilidad();
  if (!map || catId === 'Todos') return;
  const visibles = marcadoresFiltradosPorCategoria.value;
  if (!visibles.length) return;
  map.flyToBounds(
    L.latLngBounds(visibles.map(l => [l.lat, l.lng] as L.LatLngTuple)),
    { paddingTopLeft: [50, 140], paddingBottomRight: [50, 230], maxZoom: 16, duration: 0.8 }
  );
}

watch(selectedCategory, () => {
  actualizarVisibilidad();
});

function coincideFiltro(l: Lugar): boolean {
  if (!coincideCategoria(l)) return false;
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
  if (selectedCategory.value !== 'Todos') return selectedCategory.value;
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
  html: `
    <div class="mx-user">
      <div class="mx-user-heading" id="mx-user-heading">
        <div class="mx-user-cone"></div>
        <div class="mx-user-arrow"></div>
      </div>
      <span class="mx-user-halo"></span>
      <span class="mx-user-dot"></span>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
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
      <button class="mx-btn mx-btn-secondary" data-accion="nav-externa" aria-label="Abrir en Maps o Waze" title="Abrir en Maps / Waze">${svgEnLinea(arrowRedoOutline)}</button>
      <button class="mx-btn mx-btn-secondary" data-accion="compartir" aria-label="Compartir lugar" title="Compartir">${svgEnLinea(shareSocialOutline)}</button>
      <button class="mx-btn mx-btn-secondary mx-btn-fav" data-accion="favorito" aria-label="Favorito">${svgEnLinea(l.isFavorite ? star : starOutline)}</button>
      ${fotos.length ? `<button class="mx-btn mx-btn-secondary" data-accion="fotos">${svgEnLinea(images)}<span>${fotos.length}</span></button>` : ''}
      ${l.personalizado ? `<button class="mx-btn mx-btn-danger" data-accion="eliminar" aria-label="Eliminar">${svgEnLinea(ICONO_PAPELERA)}</button>` : ''}
    </div>`;

  el.querySelectorAll<HTMLElement>('[data-accion]').forEach(b => {
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      const accion = b.dataset.accion;
      if (accion === 'ruta') trazarRuta(l);
      else if (accion === 'nav-externa') void abrirNavegacionExternaLugar(l);
      else if (accion === 'compartir') void compartirLugar(l);
      else if (accion === 'fotos') abrirGaleria(l);
      else if (accion === 'favorito') alternarFavorito(l);
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

// ── Ubicación y Proximidad ──────────────────────────────
function verificarProximidadDestino(userLat: number, userLng: number) {
  if (!destinoActivo.value || notificadoLlegada.value || isNavigating.value) return;
  const dist = calcularDistancia(userLat, userLng, destinoActivo.value.lat, destinoActivo.value.lng);
  if (dist <= 50) {
    notificadoLlegada.value = true;
    void notificarLlegadaDestino(destinoActivo.value.nombre);
    void mostrarToast(`¡Has llegado a tu destino! (${destinoActivo.value.nombre})`, checkmarkCircle);
  }
}

function construirPopupUsuario(): HTMLElement {
  const u = ubicacion.value;
  const latTxt = u ? u.lat.toFixed(5) : '';
  const lngTxt = u ? u.lng.toFixed(5) : '';

  const el = document.createElement('div');
  el.className = 'mx-pop';
  el.innerHTML = `
    <div class="mx-pop-head">
      <span class="mx-glyph" style="background:#2563eb">
        ${svgEnLinea(location)}
      </span>
      <div>
        <div class="mx-pop-title">Mi ubicación actual</div>
        <div class="mx-pop-sub">${latTxt}, ${lngTxt}</div>
      </div>
    </div>
    <div class="mx-pop-actions">
      <button class="mx-btn mx-btn-primary" data-accion="compartir-ubicacion">
        ${svgEnLinea(shareSocialOutline)}<span>Compartir ubicación</span>
      </button>
    </div>`;

  el.querySelectorAll<HTMLElement>('[data-accion]').forEach(b => {
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      if (b.dataset.accion === 'compartir-ubicacion') {
        void compartirUbicacionActual();
        if (marcadorUsuario) marcadorUsuario.closePopup();
      }
    });
  });

  L.DomEvent.disableClickPropagation(el);
  return el;
}

function actualizarUsuario(lat: number, lng: number, precision?: number | null) {
  ubicacion.value = { lat, lng };
  if (!map) return;

  if (marcadorUsuario) {
    marcadorUsuario.setLatLng([lat, lng]);
  } else {
    marcadorUsuario = L.marker([lat, lng], {
      icon: iconoUsuario,
      zIndexOffset: 1000,
      interactive: true,
    }).addTo(map);
    marcadorUsuario.bindPopup(() => construirPopupUsuario(), {
      className: 'mx-popup-custom',
      closeButton: false,
      offset: [0, -10],
    });
    if (lastHeading >= 0) {
      setTimeout(() => rotarMarcadorUsuario(lastHeading), 50);
    }
  }

  if (precision && precision > 0) {
    if (circuloPrecision) {
      circuloPrecision.setLatLng([lat, lng]).setRadius(precision);
    } else {
      circuloPrecision = L.circle([lat, lng], {
        radius: precision,
        color: '#2563eb',
        weight: 1.5,
        opacity: 0.35,
        fillColor: '#2563eb',
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(map);
    }
  }

  if (siguiendo.value && !isNavigating.value) {
    map.panTo([lat, lng], { animate: true });
  }

  verificarProximidadDestino(lat, lng);
  void procesarGeocercas(lat, lng);
}

// ── Radar de Proximidad y Geocercas ──────────────────
async function procesarGeocercas(lat: number, lng: number) {
  const alertas = await checkGeofences(lat, lng, sitios.value);
  for (const ev of alertas) {
    resaltarMarcadorGeocerca(ev.place.id);
  }
}

function resaltarMarcadorGeocerca(placeId: string) {
  const m = marcadores.get(placeId);
  if (!m) return;
  const el = m.getElement();
  if (el) {
    el.classList.add('mx-marker-geofence-alert');
    setTimeout(() => {
      el.classList.remove('mx-marker-geofence-alert');
    }, 4500);
  }
}

async function centrarEnUsuario() {
  if (!map) return;

  if (isNavigating.value) {
    siguiendo.value = true;
    centrarCamaraNavegacion(true);
    return;
  }

  const tienePermiso = await solicitarPermisosUbicacion(true);
  if (!tienePermiso) return;

  if (ubicacion.value) {
    siguiendo.value = true;
    map.flyTo([ubicacion.value.lat, ubicacion.value.lng], Math.max(map.getZoom(), 16), {
      duration: 0.8,
    });
  }

  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    const { latitude, longitude, accuracy } = pos.coords;
    const primeraVez = !ubicacion.value;
    siguiendo.value = true;
    actualizarUsuario(latitude, longitude, accuracy);
    if (primeraVez) {
      map.flyTo([latitude, longitude], 16, { duration: 0.8 });
    }
  } catch (err) {
    console.warn('Ubicación no disponible:', err);
    if (!ubicacion.value) {
      mostrarToast('No pudimos obtener tu ubicación GPS', alertCircle);
    }
  }
}

async function iniciarSeguimiento() {
  try {
    const tienePermisos = await solicitarPermisosUbicacion(false);
    if (!tienePermisos) {
      console.warn('Permisos de ubicación no otorgados para seguimiento continuo.');
      return;
    }

    if (watchId) {
      try {
        await Geolocation.clearWatch({ id: watchId });
      } catch {
        // Ignorar error de limpieza
      }
      watchId = undefined;
    }

    watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (pos, err) => {
        if (err || !pos) {
          if (err) console.warn('Error en watchPosition:', err);
          if (isNavigating.value) gpsSenalPerdida.value = true;
          return;
        }
        actualizarUsuario(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy
        );
        procesarPosicionNavegacion(pos.coords);

        if (isRecording.value) {
          const nuevoPunto = addGpsPoint({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          });
          if (nuevoPunto) {
            extenderPolilineaTrack(nuevoPunto);
          }
        }
      }
    );
  } catch (err) {
    console.warn('No se pudo iniciar el seguimiento continuo:', err);
  }
}

// ── Orientación con Brújula (Heading Tracking) ──────────
interface ExtendedOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

let lastHeading = -1;
let currentRotationDeg = 0;
const UMBRAL_RUIDO_GRADOS = 2.5;
let compassListenerActive = false;
let usesAbsolute = false;

function rotarMarcadorUsuario(heading: number) {
  if (!marcadorUsuario) return;
  const el = marcadorUsuario.getElement()?.querySelector<HTMLElement>('.mx-user-heading');
  if (!el) return;

  // Desenvolver el ángulo continuo más corto para que no dé giros bruscos de 360° al cruzar 0°/360°
  let delta = heading - (currentRotationDeg % 360);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  currentRotationDeg += delta;

  el.style.transform = `rotate(${currentRotationDeg}deg)`;
  el.style.transition = 'transform 0.15s ease-out';
}

function handleOrientation(e: Event) {
  const ev = e as ExtendedOrientationEvent;
  let heading: number | null = null;

  if (typeof ev.webkitCompassHeading === 'number' && !isNaN(ev.webkitCompassHeading)) {
    // iOS Safari entrega directamente el rumbo en grados (0°-360°) en sentido horario
    heading = ev.webkitCompassHeading;
  } else if (typeof ev.alpha === 'number' && !isNaN(ev.alpha)) {
    // Android / W3C: alpha mide rotación antihoraria respecto al norte magnético
    // Se invierte para obtener el rumbo horario (0° Norte, 90° Este, 180° Sur, 270° Oeste)
    heading = (360 - ev.alpha) % 360;
  }

  if (heading === null) return;

  // Normalizar entre 0° y 360°
  heading = ((heading % 360) + 360) % 360;

  // En navegación, el rumbo del GPS vigente manda sobre la brújula
  if (isNavigating.value && Date.now() - ultimoRumboGpsTs < VIGENCIA_RUMBO_GPS_MS) return;

  // Filtro de ruido: descartar vibraciones menores al umbral
  if (lastHeading >= 0) {
    const diff = Math.abs(heading - lastHeading);
    const anguloDiff = Math.min(diff, 360 - diff);
    if (anguloDiff < UMBRAL_RUIDO_GRADOS) {
      return;
    }
  }

  lastHeading = heading;
  rotarMarcadorUsuario(heading);
}

function setupCompass() {
  if (typeof window === 'undefined') return;

  const handleCompassEvent = (e: Event) => handleOrientation(e);

  const hasAbsolute = 'ondeviceorientationabsolute' in window;
  if (hasAbsolute) {
    window.addEventListener('deviceorientationabsolute', handleCompassEvent, true);
    usesAbsolute = true;
    compassListenerActive = true;
    return;
  }

  const DeviceEvent = (window as unknown as {
    DeviceOrientationEvent?: {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
  }).DeviceOrientationEvent;

  if (DeviceEvent) {
    if (typeof DeviceEvent.requestPermission === 'function') {
      DeviceEvent.requestPermission()
        .then((response: 'granted' | 'denied') => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleCompassEvent, true);
            compassListenerActive = true;
          }
        })
        .catch((err: unknown) => {
          console.warn('Permiso de brújula no concedido:', err);
        });
    } else {
      window.addEventListener('deviceorientation', handleCompassEvent, true);
      compassListenerActive = true;
    }
  }
}

function cleanupCompass() {
  if (!compassListenerActive) return;
  if (usesAbsolute) {
    window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
  }
  window.removeEventListener('deviceorientation', handleOrientation, true);
  compassListenerActive = false;
}

// ── Buscador Flotante TomTom ───────────────────────────
const iconoLugarBuscado = L.divIcon({
  className: 'mx-search-pin-wrap',
  html: `<div class="mx-search-pin">
           <div class="mx-search-pin-core">
             <svg viewBox="0 0 24 24" class="mx-search-pin-svg"><path fill="#ffffff" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
           </div>
           <div class="mx-search-pin-shadow"></div>
         </div>`,
  iconSize: [36, 46],
  iconAnchor: [18, 46],
  popupAnchor: [0, -46],
});

function descartarMarcadorBusqueda() {
  if (marcadorBusqueda) {
    marcadorBusqueda.remove();
    marcadorBusqueda = undefined;
  }
  lugarBuscadoSeleccionado.value = null;
}

function construirPopupBusqueda(item: SearchPlaceResult): HTMLElement {
  const el = document.createElement('div');
  el.className = 'mx-pop';
  el.innerHTML = `
    <div class="mx-pop-head">
      <span class="mx-glyph" style="background:#ef4444">
        ${svgEnLinea(location)}
      </span>
      <div>
        <div class="mx-pop-title">${escaparHtml(item.name)}</div>
        <div class="mx-pop-sub">${escaparHtml(item.address)}</div>
      </div>
    </div>
    ${item.category ? `<div style="font-size:12px;color:var(--mx-text-2);margin-top:6px;font-weight:500;">${escaparHtml(item.category)}</div>` : ''}
    <div class="mx-pop-actions">
      <button class="mx-btn mx-btn-primary" data-accion="ruta">
        ${svgEnLinea(navigate)}<span>Cómo llegar</span>
      </button>
      <button class="mx-btn mx-btn-secondary" data-accion="nav-externa" aria-label="Abrir en Maps o Waze" title="Abrir en Maps / Waze">
        ${svgEnLinea(arrowRedoOutline)}<span>Maps / Waze</span>
      </button>
      <button class="mx-btn mx-btn-secondary" data-accion="compartir" aria-label="Compartir lugar" title="Compartir">
        ${svgEnLinea(shareSocialOutline)}<span>Compartir</span>
      </button>
      <button class="mx-btn mx-btn-secondary" data-accion="descartar">
        ${svgEnLinea(ICONO_PAPELERA)}<span>Descartar</span>
      </button>
    </div>`;

  el.querySelectorAll<HTMLElement>('[data-accion]').forEach(b => {
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      const accion = b.dataset.accion;
      if (accion === 'ruta') {
        void trazarRutaHaciaLugarBuscado();
      } else if (accion === 'nav-externa') {
        void abrirNavegacionExternaPorItem(item);
      } else if (accion === 'compartir') {
        void compartirLugarBuscadoPorItem(item);
      } else if (accion === 'descartar') {
        descartarMarcadorBusqueda();
      }
    });
  });
  L.DomEvent.disableClickPropagation(el);
  return el;
}

async function onInputBusquedaTomTom(ev: CustomEvent) {
  const query = (ev.detail.value ?? '').toString();
  busquedaTomTom.value = query;

  if (query.trim().length < 3) {
    resultadosTomTom.value = [];
    mostrarSugerencias.value = false;
    buscandoTomTom.value = false;
    return;
  }

  buscandoTomTom.value = true;
  try {
    const coords = ubicacion.value ? { lat: ubicacion.value.lat, lng: ubicacion.value.lng } : undefined;
    const res = await searchPlaces(query, coords);
    resultadosTomTom.value = res;
    mostrarSugerencias.value = res.length > 0;
  } catch (err) {
    console.warn('Error en búsqueda de TomTom:', err);
    resultadosTomTom.value = [];
    mostrarSugerencias.value = false;
  } finally {
    buscandoTomTom.value = false;
  }
}

function limpiarBusquedaTomTom() {
  busquedaTomTom.value = '';
  resultadosTomTom.value = [];
  mostrarSugerencias.value = false;
  buscandoTomTom.value = false;
}

function cerrarSugerencias() {
  mostrarSugerencias.value = false;
}

function onFocusBusquedaTomTom() {
  if (busquedaTomTom.value.trim().length >= 3 && resultadosTomTom.value.length > 0) {
    mostrarSugerencias.value = true;
  }
}

async function seleccionarResultado(item: SearchPlaceResult) {
  mostrarSugerencias.value = false;
  lugarBuscadoSeleccionado.value = item;

  // Desenfocar el teclado en móviles
  const searchbarEl = (searchbarRef.value as { $el?: HTMLElement })?.$el;
  const inputEl = searchbarEl?.querySelector('input');
  inputEl?.blur();

  if (!map) return;

  // Eliminar marcador de búsqueda previo
  descartarMarcadorBusqueda();
  lugarBuscadoSeleccionado.value = item;

  // Colocar marcador distinguible (rojo con rebote)
  marcadorBusqueda = L.marker([item.lat, item.lng], {
    icon: iconoLugarBuscado,
    zIndexOffset: 900,
    riseOnHover: true,
  }).addTo(map);

  marcadorBusqueda.bindPopup(() => construirPopupBusqueda(item), {
    className: 'mx-popup',
    maxWidth: 280,
    minWidth: 260,
  });

  // Vuelo suave hacia el punto
  map.flyTo([item.lat, item.lng], 16, { duration: 1.5 });
  map.once('moveend', () => {
    marcadorBusqueda?.openPopup();
  });
}

// ── Rutas y Tráfico en Vivo con TomTom Routing API ─────
async function trazarRutaADestino(dest: { lat: number; lng: number; nombre: string }) {
  if (!map) return;
  if (isNavigating.value) {
    void mostrarToast('Finaliza el viaje actual para trazar otra ruta', alertCircle);
    return;
  }

  const tienePermiso = await solicitarPermisosUbicacion(true);
  if (!tienePermiso) return;

  if (!ubicacion.value) {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
      actualizarUsuario(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    } catch {
      mostrarToast('Activa tu ubicación para trazar rutas', alertCircle);
      return;
    }
  }

  if (!ubicacion.value) {
    mostrarToast('No se pudo determinar tu posición actual', alertCircle);
    return;
  }

  map.closePopup();
  cargandoRuta.value = true;

  try {
    const origenCoord: Coordenada = { lat: ubicacion.value.lat, lng: ubicacion.value.lng };
    const destinoCoord: Coordenada = { lat: dest.lat, lng: dest.lng };

    const res = await calcularRutaTomTom(origenCoord, destinoCoord);
    const coords = res.puntos.map(([lat, lng]) => L.latLng(lat, lng));

    capaRuta?.remove();
    capaRuta = L.layerGroup([
      // Contorno blanco de alto contraste
      L.polyline(coords, {
        color: '#ffffff',
        weight: 9,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'mx-route-casing',
      }),
      // Trazo principal estilizado de 6px
      L.polyline(coords, {
        color: res.esTraficoFluido ? '#2563eb' : '#d97706',
        weight: 6,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: 0.95,
      }),
    ]).addTo(map);

    destinoActivo.value = { lat: dest.lat, lng: dest.lng, nombre: dest.nombre };
    notificadoLlegada.value = false;

    pasosNavegacion.value = asegurarPasos(res.steps, destinoCoord, dest.nombre, res.distanciaMetros, res.tiempoSegundos);
    totalRutaMetros.value = res.distanciaMetros;
    totalRutaSegundos.value = res.tiempoSegundos;
    currentStepIndex.value = 0;
    distanceToNextStep.value = 0;

    rutaInfo.value = {
      tiempoTexto: res.tiempoTexto,
      tiempoMinutos: res.tiempoMinutos,
      distanciaTexto: res.distanciaTexto,
      distanciaKm: res.distanciaKm,
      estadoTrafico: res.estadoTrafico,
      esTraficoFluido: res.esTraficoFluido,
      retrasoTraficoSegundos: res.retrasoTraficoSegundos,
      destino: dest.nombre,
    };

    // Disparar notificación local del inicio de trayecto
    void notificarInicioRuta(dest.nombre, res.tiempoMinutos);

    estadoSheet.value = 'colapsado';
    siguiendo.value = false;

    // Ajustar límites de la cámara para encuadrar usuario y destino
    map.flyToBounds(L.latLngBounds(coords), {
      paddingTopLeft: [40, 90],
      paddingBottomRight: [40, 260],
      duration: 0.8,
    });
  } catch (err) {
    console.error('Error calculando ruta con TomTom:', err);
    mostrarToast('No se pudo calcular la ruta con tráfico', alertCircle);
  } finally {
    cargandoRuta.value = false;
  }
}

function trazarRuta(l: Lugar) {
  return trazarRutaADestino({ lat: l.lat, lng: l.lng, nombre: l.nombre });
}

function trazarRutaHaciaLugarBuscado() {
  if (!lugarBuscadoSeleccionado.value) return;
  return trazarRutaADestino({
    lat: lugarBuscadoSeleccionado.value.lat,
    lng: lugarBuscadoSeleccionado.value.lng,
    nombre: lugarBuscadoSeleccionado.value.name,
  });
}

function finalizarRuta() {
  capaRuta?.remove();
  capaRuta = undefined;
  rutaInfo.value = null;
  destinoActivo.value = null;
  notificadoLlegada.value = false;
}

// ── Métodos de Compartir Ubicación, Sitios y Rutas ─────
async function compartirLugar(l: Lugar) {
  try {
    await sharePlace({
      name: l.nombre,
      address: `${categoriaDe(l.tipo).etiqueta} · Bogotá`,
      lat: l.lat,
      lng: l.lng,
      description: l.descripcion,
    });
  } catch (err) {
    console.error('Error al compartir sitio:', err);
  }
}

async function compartirLugarBuscado() {
  if (!lugarBuscadoSeleccionado.value) return;
  const p = lugarBuscadoSeleccionado.value;
  try {
    await sharePlace({
      name: p.name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      description: p.category,
    });
  } catch (err) {
    console.error('Error al compartir lugar buscado:', err);
  }
}

async function compartirLugarBuscadoPorItem(item: SearchPlaceResult) {
  try {
    await sharePlace({
      name: item.name,
      address: item.address,
      lat: item.lat,
      lng: item.lng,
      description: item.category,
    });
  } catch (err) {
    console.error('Error al compartir lugar buscado por item:', err);
  }
}

async function compartirRutaActiva() {
  if (!rutaInfo.value) return;
  const r = rutaInfo.value;
  const dest = destinoActivo.value;
  const destLat = dest ? dest.lat : 4.6097;
  const destLng = dest ? dest.lng : -74.0817;

  try {
    await shareRoute(
      'Mi ubicación',
      r.destino,
      destLat,
      destLng,
      r.distanciaTexto,
      r.tiempoTexto
    );
  } catch (err) {
    console.error('Error al compartir ruta activa:', err);
  }
}

async function compartirUbicacionActual() {
  if (!ubicacion.value) {
    void mostrarToast('Tu ubicación actual aún no está disponible', alertCircle);
    return;
  }
  try {
    await shareCurrentLocation(ubicacion.value.lat, ubicacion.value.lng);
  } catch (err) {
    console.error('Error al compartir ubicación actual:', err);
  }
}

let pulsacionLargaTimer: ReturnType<typeof setTimeout> | undefined;

function iniciarPulsacionLargaUbicacion() {
  cancelarPulsacionLargaUbicacion();
  pulsacionLargaTimer = setTimeout(() => {
    void mostrarOpcionesUbicacion();
    pulsacionLargaTimer = undefined;
  }, 650);
}

function cancelarPulsacionLargaUbicacion() {
  if (pulsacionLargaTimer !== undefined) {
    clearTimeout(pulsacionLargaTimer);
    pulsacionLargaTimer = undefined;
  }
}

async function mostrarOpcionesUbicacion() {
  cancelarPulsacionLargaUbicacion();
  if (!ubicacion.value) {
    void mostrarToast('Tu ubicación actual aún no está disponible', alertCircle);
    return;
  }

  const actionSheet = await actionSheetController.create({
    header: 'Mi Ubicación',
    subHeader: `${ubicacion.value.lat.toFixed(5)}, ${ubicacion.value.lng.toFixed(5)}`,
    buttons: [
      {
        text: 'Compartir mi ubicación actual',
        icon: shareSocialOutline,
        handler: () => {
          void compartirUbicacionActual();
        },
      },
      {
        text: 'Centrar en el mapa',
        icon: locate,
        handler: () => {
          void centrarEnUsuario();
        },
      },
      {
        text: 'Cancelar',
        icon: close,
        role: 'cancel',
      },
    ],
  });
  await actionSheet.present();
}

// ── Navegación Externa (Google Maps / Waze) ────────────
async function abrirNavegacionExternaRuta() {
  if (!rutaInfo.value) return;
  const dest = destinoActivo.value;
  const lat = dest ? dest.lat : 4.6097;
  const lng = dest ? dest.lng : -74.0817;
  const name = rutaInfo.value.destino || 'Destino de ruta';
  await presentNavigationChooser({ lat, lng, name });
}

async function abrirNavegacionExternaLugar(l: Lugar) {
  await presentNavigationChooser({
    lat: l.lat,
    lng: l.lng,
    name: l.nombre,
  });
}

async function abrirNavegacionExternaLugarBuscado() {
  if (!lugarBuscadoSeleccionado.value) return;
  const p = lugarBuscadoSeleccionado.value;
  await presentNavigationChooser({
    lat: p.lat,
    lng: p.lng,
    name: p.name,
  });
}

// ── Respaldo de Datos (GeoJSON Export/Import) ─────────
async function mostrarMenuBackup() {
  const actionSheet = await actionSheetController.create({
    header: 'Copia de Seguridad y Datos',
    subHeader: 'Exportar o importar tus sitios y rutas en GeoJSON',
    buttons: [
      {
        text: 'Exportar respaldo (GeoJSON)',
        icon: cloudUploadOutline,
        handler: () => {
          void exportarRespaldoGeoJSON();
        },
      },
      {
        text: 'Importar respaldo (.geojson/.json)',
        icon: cloudDownloadOutline,
        handler: () => {
          inputArchivoBackupRef.value?.click();
        },
      },
      {
        text: 'Cancelar',
        icon: close,
        role: 'cancel',
      },
    ],
  });
  await actionSheet.present();
}

async function exportarRespaldoGeoJSON() {
  try {
    const tracks = await getSavedTracks();
    const geoJsonObj = buildBackupGeoJSON(sitios.value, tracks);
    const jsonStr = JSON.stringify(geoJsonObj, null, 2);
    const res = await downloadOrShareBackup(jsonStr);
    if (res.success) {
      void mostrarToast(
        res.method === 'share'
          ? 'Copia de seguridad compartida'
          : 'Copia de seguridad descargada',
        checkmarkCircle
      );
    }
  } catch (err) {
    console.error('Error al exportar respaldo:', err);
    void mostrarToast('Error al exportar la copia de seguridad', alertCircle);
  }
}

async function onArchivoBackupSeleccionado(ev: Event) {
  const target = ev.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  target.value = '';

  try {
    const text = await file.text();
    let data: ParsedBackupData;
    try {
      data = validateAndParseGeoJSON(text);
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : 'Estructura GeoJSON inválida';
      const alert = await alertController.create({
        header: 'Archivo no válido',
        message: `No se pudo importar el archivo:\n${msg}`,
        buttons: ['Entendido'],
      });
      await alert.present();
      return;
    }

    const mode = await promptRestoreMode();
    if (mode === 'cancel') return;

    const currentTracks = await getSavedTracks();
    await applyBackupRestore(data, mode, sitios.value, currentTracks);
    await recargarSitios();

    void mostrarToast(
      `Respaldo restaurado (${data.places.length} sitios, ${data.tracks.length} rutas)`,
      checkmarkCircle
    );
  } catch (err) {
    console.error('Error al importar archivo de respaldo:', err);
    void mostrarToast('Error al procesar el archivo de respaldo', alertCircle);
  }
}

async function abrirNavegacionExternaPorItem(item: SearchPlaceResult) {
  await presentNavigationChooser({
    lat: item.lat,
    lng: item.lng,
    name: item.name,
  });
}

// ── Navegación paso a paso (HUD Turn-by-Turn Lite) ─────
function iniciarVigilanciaSenal() {
  detenerVigilanciaSenal();
  ultimaActualizacionGps = Date.now();
  temporizadorSenal = setInterval(() => {
    if (isNavigating.value && Date.now() - ultimaActualizacionGps > TIEMPO_SIN_SENAL_MS) {
      gpsSenalPerdida.value = true;
    }
  }, 2000);
}

function detenerVigilanciaSenal() {
  if (temporizadorSenal !== undefined) {
    clearInterval(temporizadorSenal);
    temporizadorSenal = undefined;
  }
}

/**
 * Centro del mapa que deja al usuario en el tercio inferior de la pantalla:
 * el centro queda 1/6 del alto del mapa por encima de la posición del usuario.
 */
function centroConUsuarioEnTercioInferior(posicion: LatLng, zoom: number): L.LatLng | undefined {
  const m = map;
  if (!m) return undefined;
  const punto = m.project(L.latLng(posicion.lat, posicion.lng), zoom);
  return m.unproject(punto.subtract(L.point(0, m.getSize().y / 6)), zoom);
}

function centrarCamaraNavegacion(inicial: boolean) {
  const m = map;
  const u = ubicacion.value;
  if (!m || !u) return;

  const zoom = inicial ? Math.min(ZOOM_NAVEGACION, m.getMaxZoom()) : m.getZoom();
  const objetivo = centroConUsuarioEnTercioInferior(u, zoom);
  if (!objetivo) return;

  if (inicial) {
    m.flyTo(objetivo, zoom, { duration: 0.8 });
  } else {
    m.panTo(objetivo, { animate: true, duration: 0.9, easeLinearity: 0.5 });
  }
}

/**
 * Rumbo de desplazamiento: prioriza el heading del GPS (si hay velocidad suficiente)
 * y, si no, lo deriva del movimiento real entre dos fixes. Devuelve null si no es fiable.
 */
function resolverRumbo(coords: Position['coords'], actual: LatLng): number | null {
  let rumbo: number | null = null;
  const h = coords.heading;
  if (typeof h === 'number' && Number.isFinite(h) && h >= 0 && (coords.speed ?? 0) >= VELOCIDAD_MIN_RUMBO_MS) {
    rumbo = h;
  }

  if (!posicionPrevia) {
    posicionPrevia = actual;
    return rumbo;
  }

  const umbral = Math.max(DISTANCIA_MIN_RUMBO_M, Number.isFinite(coords.accuracy) ? coords.accuracy : 0);
  const movido = calcularDistancia(posicionPrevia.lat, posicionPrevia.lng, actual.lat, actual.lng);
  if (movido >= umbral) {
    if (rumbo === null) rumbo = calcularRumbo(posicionPrevia, actual);
    posicionPrevia = actual;
  }
  return rumbo;
}

function aplicarRumboGps(rumbo: number) {
  ultimoRumboGpsTs = Date.now();
  lastHeading = ((rumbo % 360) + 360) % 360;
  rotarMarcadorUsuario(lastHeading);
}

/** Procesa cada fix de GPS mientras hay un viaje activo. */
function procesarPosicionNavegacion(coords: Position['coords']) {
  if (!isNavigating.value || !map) return;

  ultimaActualizacionGps = Date.now();
  gpsSenalPerdida.value = false;

  const actual: LatLng = { lat: coords.latitude, lng: coords.longitude };
  const rumbo = resolverRumbo(coords, actual);
  if (rumbo !== null) aplicarRumboGps(rumbo);

  const destino = destinoActivo.value;
  if (destino) {
    const precisionAceptable = !Number.isFinite(coords.accuracy) || coords.accuracy <= PRECISION_MAX_AVANCE_M;
    const avance = evaluarAvance(actual, pasosNavegacion.value, currentStepIndex.value, destino, precisionAceptable);

    if (avance.indice !== currentStepIndex.value) currentStepIndex.value = avance.indice;
    distanceToNextStep.value = avance.distanciaAlPaso;

    if (avance.llegada) {
      void finalizarPorLlegada();
      return;
    }
  }

  if (siguiendo.value) centrarCamaraNavegacion(false);
}

async function iniciarViaje() {
  const destino = destinoActivo.value;
  if (!map || isNavigating.value || !rutaInfo.value || !destino) return;
  if (pasosNavegacion.value.length === 0) {
    void mostrarToast('Esta ruta no tiene instrucciones de guiado', alertCircle);
    return;
  }

  const tienePermiso = await solicitarPermisosUbicacion(true);
  if (!tienePermiso || !map) return;

  map.closePopup();
  cerrarSugerencias();
  quitarFoco();
  estadoSheet.value = 'colapsado';

  currentStepIndex.value = 0;
  llegadaProcesada = false;
  posicionPrevia = null;
  gpsSenalPerdida.value = false;
  isNavigating.value = true;
  siguiendo.value = true;
  iniciarVigilanciaSenal();

  if (!watchId) void iniciarSeguimiento();

  const u = ubicacion.value;
  if (u) {
    const primero = evaluarAvance(u, pasosNavegacion.value, 0, destino);
    currentStepIndex.value = primero.indice;
    distanceToNextStep.value = primero.distanciaAlPaso;
    centrarCamaraNavegacion(true);
  } else {
    distanceToNextStep.value = pasosNavegacion.value[0].distanceFromStart;
    gpsSenalPerdida.value = true;
  }
}

/** Sale del modo navegación, limpia la ruta y restaura la vista normal del mapa. */
function detenerNavegacion() {
  isNavigating.value = false;
  detenerVigilanciaSenal();
  gpsSenalPerdida.value = false;
  posicionPrevia = null;
  siguiendo.value = false;
  finalizarRuta();
  estadoSheet.value = 'colapsado';

  const u = ubicacion.value;
  if (map && u) {
    map.flyTo([u.lat, u.lng], 16, { duration: 0.8 });
  }
}

function finalizarViaje() {
  if (!isNavigating.value) return;
  detenerNavegacion();
  void mostrarToast('Viaje finalizado', checkmarkCircle);
}

async function finalizarPorLlegada() {
  if (llegadaProcesada) return;
  llegadaProcesada = true;

  const nombre = destinoActivo.value?.nombre ?? 'tu destino';
  detenerNavegacion();

  void vibrarAlLlegar();
  void notificarLlegadaDestino(nombre);
  await mostrarToast(`¡Has llegado a tu destino! ${nombre}`, checkmarkCircle, 4500);
}

// ── Grabación de recorridos en vivo (Breadcrumbs) ─────
function extenderPolilineaTrack(punto: TrackPoint): void {
  if (!map) return;
  const latLng = L.latLng(punto.lat, punto.lng);
  if (!capaTrackPolyline) {
    capaTrackPolyline = L.polyline([latLng], {
      color: '#FF5722',
      weight: 5,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
      className: 'mx-track-polyline',
    }).addTo(map);
  } else {
    capaTrackPolyline.addLatLng(latLng);
  }
}

async function iniciarGrabacionTrack(): Promise<void> {
  if (isNavigating.value) {
    void mostrarToast('Finaliza la navegación activa antes de grabar un recorrido', alertCircle);
    return;
  }

  const tienePermiso = await solicitarPermisosUbicacion(true);
  if (!tienePermiso) return;

  if (capaTrackPolyline) {
    capaTrackPolyline.remove();
    capaTrackPolyline = undefined;
  }

  startRecording();

  if (ubicacion.value) {
    const primerPunto = addGpsPoint({
      latitude: ubicacion.value.lat,
      longitude: ubicacion.value.lng,
      accuracy: 10,
    });
    if (primerPunto) {
      extenderPolilineaTrack(primerPunto);
    }
  }

  if (!watchId) {
    void iniciarSeguimiento();
  }

  void mostrarToast('Grabación de recorrido iniciada', radioButtonOn);
}

function abrirModalGuardarTrack(): void {
  pauseRecording();
  mostrarModalGuardarTrack.value = true;
}

async function confirmarGuardarTrack(datos: { name: string; color: string }): Promise<void> {
  try {
    const track: RecordedTrack = {
      id: `track-${Date.now()}`,
      name: datos.name,
      createdAt: new Date().toISOString(),
      durationSeconds: elapsedSeconds.value,
      distanceMeters: Math.round(totalDistanceMeters.value),
      averageSpeedKmh: averageSpeedKmh.value,
      points: [...recordedPoints.value],
      color: datos.color,
    };

    await saveTrack(track);

    if (capaTrackPolyline) {
      capaTrackPolyline.setStyle({ color: datos.color });
    }

    stopRecording();
    mostrarModalGuardarTrack.value = false;
    void mostrarToast(`Recorrido "${track.name}" guardado exitosamente`, checkmarkCircle);
  } catch (err) {
    console.error('Error al guardar recorrido:', err);
    void mostrarToast('No se pudo guardar el recorrido', alertCircle);
  }
}

function confirmarDescartarTrack(): void {
  if (capaTrackPolyline) {
    capaTrackPolyline.remove();
    capaTrackPolyline = undefined;
  }
  resetRecording();
  mostrarModalGuardarTrack.value = false;
  void mostrarToast('Recorrido descartado', trashOutline);
}

function cerrarModalGuardarTrack(): void {
  mostrarModalGuardarTrack.value = false;
  if (isRecording.value && isPaused.value) {
    resumeRecording();
  }
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
    isFavorite: false,
    categoria: data.tipo === 'restaurante' || data.tipo === 'cafeteria' ? 'Restaurantes' : 'Mis Sitios',
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

async function alternarFavorito(l: Lugar) {
  l.isFavorite = !l.isFavorite;
  if (l.personalizado) {
    void guardarSitios();
  }
  const favIds = todos.value.filter(s => s.isFavorite).map(s => s.id);
  await Preferences.set({ key: CLAVE_FAVORITOS, value: JSON.stringify(favIds) });
  actualizarVisibilidad();
  const m = marcadores.get(l.id);
  if (m?.isPopupOpen()) {
    m.setPopupContent(construirPopup(l));
  }
  void mostrarToast(l.isFavorite ? 'Añadido a favoritos' : 'Eliminado de favoritos', star);
}

async function cargarFavoritos() {
  try {
    const { value } = await Preferences.get({ key: CLAVE_FAVORITOS });
    if (value) {
      const favIds = new Set<string>(JSON.parse(value));
      todos.value.forEach(p => {
        if (favIds.has(p.id)) p.isFavorite = true;
      });
    }
  } catch (err) {
    console.warn('Error al cargar favoritos:', err);
  }
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

async function mostrarToast(message: string, icon?: string, duration = 1800) {
  const toast = await toastController.create({ message, icon, duration, position: 'top' });
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
  aplicarEstilo(estiloActual.value);
  attachMeasureMap(map);

  capaLugares = L.layerGroup().addTo(map);
  await cargarFavoritos();
  PUNTOS.forEach(crearMarcador);
  await cargarSitios();
  sitios.value.forEach(crearMarcador);

  map.on('click', () => {
    cerrarSugerencias();
    if (estadoSheet.value === 'expandido') estadoSheet.value = 'colapsado';
    quitarFoco();
  });
  map.on('dragstart', () => {
    siguiendo.value = false;
    cerrarSugerencias();
  });
  map.on('movestart', () => (moviendo.value = true));
  map.on('moveend', () => (moviendo.value = false));
  map.on('move', () => {
    if (!modoAgregar.value || !map) return;
    const c = map.getCenter();
    centro.value = { lat: c.lat, lng: c.lng };
  });
  setTimeout(() => map?.invalidateSize(), 250);

  // Inicializar canal de notificaciones nativas en segundo plano
  void inicializarCanalNotificaciones();

  // Obtener posición inicial sin bloquear el renderizado
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    const { latitude, longitude, accuracy } = pos.coords;
    actualizarUsuario(latitude, longitude, accuracy);
    map.flyTo([latitude, longitude], 15, { duration: 1.2 });
  } catch (err) {
    console.warn('Geolocalización inicial no disponible, usando Bogotá:', err);
  }
  void iniciarSeguimiento();
}

async function limpiarRecursos() {
  cancelarPulsacionLargaUbicacion();
  cleanupCompass();
  detenerVigilanciaSenal();
  cleanupTrackRecorder();
  cleanupMeasure();
  resetGeofenceRadar();
  if (capaTrackPolyline) {
    capaTrackPolyline.remove();
    capaTrackPolyline = undefined;
  }
  descartarMarcadorBusqueda();
  if (watchId) {
    try {
      await Geolocation.clearWatch({ id: watchId });
    } catch (e) {
      console.warn('Error al limpiar watchPosition:', e);
    }
    watchId = undefined;
  }
  map?.remove();
  map = undefined;
}

onMounted(() => {
  paginaEl.value = paginaRef.value?.$el;
  inicializarMapa();
  setupCompass();
});

onIonViewWillEnter(async () => {
  if (!map) return;
  await recargarSitios();
  setTimeout(() => map?.invalidateSize(), 150);
});

onBeforeUnmount(() => {
  limpiarRecursos();
});

onUnmounted(() => {
  cleanupCompass();
  limpiarRecursos();
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

/* ── Buscador Flotante Superior (TomTom Search) ────── */
.mx-search-floater {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 12px);
  left: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.2, 0, 0, 1);
}
.mx-search-floater.oculto {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-20px);
}
.mx-search-bar-wrap {
  position: relative;
  width: 100%;
}
.mx-tomtom-searchbar {
  --background: var(--mx-surface);
  --color: var(--mx-text);
  --placeholder-color: var(--mx-text-2);
  --icon-color: var(--ion-color-primary);
  --clear-button-color: var(--mx-text-2);
  --border-radius: 12px;
  --box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 0;
}
.mx-search-spinner {
  position: absolute;
  right: 48px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  pointer-events: none;
  display: flex;
  align-items: center;
}
.mx-search-spinner ion-spinner {
  width: 20px;
  height: 20px;
  color: var(--ion-color-primary);
}

/* Sugerencias TomTom */
.mx-search-dropdown {
  margin-top: 8px;
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  border-radius: var(--mx-radius, 12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  max-height: 280px;
  display: flex;
  flex-direction: column;
}
.mx-search-dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--mx-text-2);
  border-bottom: 1px solid var(--mx-border-subtle);
}
.mx-search-close-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  color: var(--mx-text-2);
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px;
}
.mx-search-results-list {
  background: transparent;
  padding: 0;
  margin: 0;
  overflow-y: auto;
}
.mx-search-item {
  --background: transparent;
  --background-hover: var(--mx-fill);
  --background-activated: var(--mx-fill-strong);
  --padding-start: 12px;
  --padding-end: 12px;
  --inner-padding-end: 0;
  cursor: pointer;
}
.mx-search-item-glyph {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  color: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-right: 12px;
  flex-shrink: 0;
}
.mx-search-item-label {
  margin: 8px 0;
}
.mx-search-item-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--mx-text);
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mx-search-item-subtitle {
  font-size: 12px;
  color: var(--mx-text-2);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Tarjeta inferior de lugar buscado (Bottom Card) ── */
.mx-search-place-card {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: calc(var(--peek, 150px) + 16px);
  max-width: 440px;
  margin: 0 auto;
  z-index: 16;
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  border-radius: var(--mx-radius, 12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mx-search-place-card.oculto {
  display: none;
}
.mx-search-place-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.mx-search-place-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--ion-color-danger);
  color: #fff;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.mx-search-place-info {
  flex: 1;
  min-width: 0;
}
.mx-search-place-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--mx-text);
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mx-search-place-address {
  font-size: 12px;
  color: var(--mx-text-2);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mx-search-place-badge {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--mx-surface-variant);
  color: var(--mx-text-2);
  font-size: 10px;
  font-weight: 600;
}
.mx-search-place-close {
  background: transparent;
  border: none;
  font-size: 18px;
  color: var(--mx-text-2);
  cursor: pointer;
  padding: 2px;
}
.mx-search-place-actions {
  display: flex;
  gap: 8px;
}

/* ── Filtro Dinámico de Categorías (Chips Deslizables) ── */
.mx-category-chips-bar {
  position: absolute;
  z-index: 999;
  top: calc(env(safe-area-inset-top, 0px) + 76px);
  left: 0;
  right: 0;
  padding: 0 16px;
  overflow-x: auto;
  display: flex;
  gap: 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  pointer-events: none; /* No bloquea interacción táctil con el mapa en áreas vacías */
  touch-action: pan-x;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.mx-category-chips-bar::-webkit-scrollbar {
  display: none;
}

.mx-category-chips-bar.oculto {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px);
}
.mx-category-chips-bar.oculto .mx-filter-chip {
  pointer-events: none;
}

.mx-filter-chip {
  pointer-events: auto; /* Permite interacción solo en los chips */
  flex-shrink: 0;
  margin: 0;
  height: 36px;
  border-radius: 18px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.15s ease;
}

.mx-filter-chip:active {
  transform: scale(0.95);
}

.mx-filter-chip ion-icon {
  font-size: 16px;
  margin-right: 4px;
}

.mx-filter-chip:not(.activo) {
  --background: var(--mx-surface);
  --color: var(--mx-text);
  border: 1px solid var(--mx-border);
}

.mx-filter-chip.activo {
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
}

.mx-btn-fav {
  color: #f59e0b !important;
}

/* ── Superficies del UI Kit (Figma Navigation) ─────────────────── */
.mx-controls,
.mx-sheet,
.mx-floating-pill,
.mx-add-bar,
.mx-style-panel {
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  box-shadow: var(--mx-shadow);
}

/* ── Controles Flotantes ───────────────────────────── */
.mx-controls {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 124px);
  right: 14px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  border-radius: var(--mx-radius, 12px);
  box-shadow: var(--mx-shadow);
  overflow: hidden;
  transition: opacity 0.25s, transform 0.3s cubic-bezier(0.2, 0, 0, 1);
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
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--mx-text);
  font-size: 20px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.mx-ctrl:hover { background: var(--mx-fill); }
.mx-ctrl.activo {
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.08);
}
.mx-ctrl-sep {
  height: 1px;
  background: var(--mx-border-subtle);
  margin: 0 6px;
}

/* ── Botón flotante FAB para centrar ubicación (mira GPS) ── */
.mx-fab-locate {
  position: absolute;
  right: 14px;
  bottom: calc(var(--peek, 150px) + 16px);
  z-index: 12;
  width: 48px;
  height: 48px;
  border-radius: var(--mx-radius, 12px);
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  box-shadow: var(--mx-shadow-md);
  color: var(--mx-text);
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
}
.mx-fab-locate:hover {
  background: var(--mx-fill);
}
.mx-fab-locate:active {
  transform: scale(0.92);
}
.mx-fab-locate.activo {
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border-color: var(--ion-color-primary);
}
.mx-fab-locate.oculto {
  opacity: 0;
  pointer-events: none;
  transform: translateY(16px);
}
/* En navegación el FAB solo aparece para "volver a seguir" y se ubica sobre el panel HUD inferior */
.mx-fab-locate.en-navegacion {
  z-index: 1600;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 200px);
}
/* En grabación el botón de centrar se ubica por encima del widget de métricas en el tercio inferior */
.mx-fab-locate.en-grabacion {
  z-index: 1450;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 165px);
}

/* ── Botón flotante FAB para Grabar Recorrido (Breadcrumbs) ── */
.mx-fab-track {
  position: absolute;
  left: 14px;
  bottom: calc(var(--peek, 150px) + 16px);
  z-index: 12;
  height: 48px;
  padding: 0 16px;
  border-radius: var(--mx-radius-pill, 9999px);
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  box-shadow: var(--mx-shadow-md);
  color: var(--mx-text);
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
}
.mx-fab-track:hover {
  background: var(--mx-fill);
}
.mx-fab-track:active {
  transform: scale(0.94);
}
.mx-fab-track.oculto {
  opacity: 0;
  pointer-events: none;
  transform: translateY(16px);
}
.rec-icon-btn {
  color: #ef4444;
  font-size: 20px;
  animation: mx-rec-pulse 1.3s infinite ease-in-out;
}
@keyframes mx-rec-pulse {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.8; }
}

/* ── Botón flotante FAB para Medir Distancias y Áreas ── */
.mx-fab-measure {
  position: absolute;
  left: 14px;
  bottom: calc(var(--peek, 150px) + 72px);
  z-index: 12;
  height: 44px;
  padding: 0 14px;
  border-radius: var(--mx-radius-pill, 9999px);
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  box-shadow: var(--mx-shadow-md);
  color: var(--mx-text);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
}
.mx-fab-measure:hover {
  background: var(--mx-fill);
}
.mx-fab-measure:active {
  transform: scale(0.94);
}
.mx-fab-measure.oculto {
  opacity: 0;
  pointer-events: none;
  transform: translateY(16px);
}
.measure-icon-btn {
  color: var(--ion-color-primary, #3b82f6);
  font-size: 18px;
}

/* Acciones de la tarjeta de ruta (Iniciar / Maps-Waze / Compartir / Cerrar) */
.mx-route-actions {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-shrink: 0;
  min-width: 130px;
}
.mx-route-actions .mx-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 29px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--mx-radius-pill, 9999px);
}
.mx-external-nav-btn {
  background: var(--mx-surface-variant) !important;
  color: var(--mx-text) !important;
  border: 1px solid var(--mx-border) !important;
}
.mx-route-aux-actions {
  display: flex;
  gap: 5px;
}
.mx-route-aux-actions .mx-pill {
  flex: 1;
  padding: 0 6px;
}
.mx-share-route-btn {
  background: rgba(var(--ion-color-primary-rgb), 0.12) !important;
  color: var(--ion-color-primary) !important;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3) !important;
}

/* ── Píldoras flotantes ────────────────────────────── */
.mx-floating-pill {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 76px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--mx-radius-pill, 9999px);
  box-shadow: var(--mx-shadow);
  color: var(--mx-text);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}
.mx-floating-pill ion-spinner { width: 18px; height: 18px; color: var(--ion-color-primary); }
.mx-floating-pill ion-icon { font-size: 18px; color: var(--ion-color-primary); }
.mx-hint {
  top: calc(env(safe-area-inset-top) + 44px);
  animation: mx-drop 0.4s cubic-bezier(0.2, 0, 0, 1);
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
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--ion-color-danger);
  border: 3px solid #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
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
  left: 14px;
  right: 14px;
  bottom: calc(env(safe-area-inset-bottom) + 16px);
  max-width: 480px;
  margin: 0 auto;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--mx-radius, 12px);
  box-shadow: var(--mx-shadow-lg);
  animation: mx-rise 0.4s cubic-bezier(0.2, 0, 0, 1);
}
.mx-add-coords { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.mx-add-title { font-size: 15px; font-weight: 600; color: var(--mx-text); }
.mx-add-sub {
  font-size: 12px;
  color: var(--mx-text-2);
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Botones ───────────────────────────────────────── */
.mx-pill {
  appearance: none;
  border: 1px solid transparent;
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  font: 600 14px var(--ion-font-family);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.mx-pill:active { transform: scale(0.96); opacity: 0.9; }
.mx-pill.primario {
  background: var(--ion-color-primary);
  color: #fff;
  box-shadow: var(--mx-shadow-sm);
}
.mx-pill.secundario {
  background: var(--mx-surface-variant);
  border-color: var(--mx-border);
  color: var(--mx-text);
}
.mx-pill.peligro {
  background: var(--ion-color-danger);
  color: #fff;
}

/* ── Hoja inferior (Drawer / Bottom Sheet UI Kit) ──── */
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
  background: var(--mx-surface);
  border-top: 1px solid var(--mx-border);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 24px rgba(15, 23, 42, 0.08);
  padding-bottom: env(safe-area-inset-bottom);
  transform: translateY(var(--sheet-offset));
  transition: transform 0.4s cubic-bezier(0.2, 0, 0, 1), opacity 0.25s;
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
    width: 400px;
    border-radius: 16px;
    border: 1px solid var(--mx-border);
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
  width: 36px;
  height: 4px;
  margin: 10px auto 8px;
  border-radius: 2px;
  background: var(--mx-border);
}

/* Ruta */
.mx-route-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 16px 8px;
  padding: 12px 14px;
  border-radius: var(--mx-radius, 12px);
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  box-shadow: var(--mx-shadow-sm);
  cursor: default;
  animation: mx-rise 0.35s cubic-bezier(0.2, 0, 0, 1);
}
.mx-route-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--ion-color-primary);
  color: #fff;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s ease;
}
.mx-route-icon.congestion {
  background: #d97706;
}
.mx-route-text {
  flex: 1;
  min-width: 0;
}
.mx-route-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.mx-route-time {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--mx-text);
  line-height: 1.2;
}
.mx-traffic-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
}
.mx-traffic-badge ion-icon {
  font-size: 12px;
}
.mx-traffic-badge.fluido {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}
.mx-traffic-badge.congestion {
  background: rgba(217, 119, 6, 0.14);
  color: #d97706;
}
.mx-route-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--mx-text-2);
  margin-top: 2px;
}
.mx-route-dot {
  opacity: 0.5;
}
.mx-route-dest {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mx-pill.peligro ion-icon {
  font-size: 16px;
  margin-right: 4px;
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
  gap: 8px;
  height: 44px;
  padding: 0 12px;
  border-radius: var(--mx-radius, 12px);
  background: var(--mx-surface-variant);
  border: 1px solid var(--mx-border);
  color: var(--mx-text-2);
  transition: border-color 0.15s;
}
.mx-search:focus-within {
  border-color: var(--ion-color-primary);
  background: var(--mx-surface);
}
.mx-search > ion-icon { font-size: 19px; flex-shrink: 0; color: var(--mx-text-2); }
.mx-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: 500 15px var(--ion-font-family);
  color: var(--mx-text);
}
.mx-search input::placeholder { color: var(--mx-text-3); }
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
  width: 44px;
  height: 44px;
  border-radius: var(--mx-radius, 12px);
  border: none;
  background: var(--ion-color-primary);
  color: #fff;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.12s, opacity 0.12s;
}
.mx-round-btn:active { transform: scale(0.94); }

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
  padding: 0 12px 0 6px;
  border: 1px solid var(--mx-border);
  border-radius: 10px;
  background: var(--mx-surface);
  color: var(--mx-text);
  font: 500 13px var(--ion-font-family);
  box-shadow: var(--mx-shadow-sm);
  cursor: pointer;
  transition: all 0.18s ease;
}
.mx-chip:active { transform: scale(0.96); }
.mx-chip.activo {
  background: var(--ion-color-primary);
  color: #ffffff;
  border-color: var(--ion-color-primary);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}
.mx-chip-dot {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 13px;
  transition: background 0.2s;
}
.mx-chip.activo .mx-chip-dot { background: rgba(255, 255, 255, 0.25) !important; }
.mx-chip-count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--mx-fill);
  font-size: 11px;
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
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--mx-text);
}
.mx-section-count { font-size: 14px; font-weight: 500; color: var(--mx-text-2); }
.mx-list {
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  border-radius: var(--mx-radius, 12px);
  overflow: hidden;
  box-shadow: var(--mx-shadow-sm);
}
.mx-row {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
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
  left: 62px;
  right: 0;
  height: 1px;
  background: var(--mx-border-subtle);
}
.mx-row-glyph {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: var(--mx-shadow-sm);
}
.mx-row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.mx-row-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--mx-text);
  min-width: 0;
}
.mx-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mx-row-star { color: #f59e0b; font-size: 13px; flex-shrink: 0; }
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
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--mx-border);
}
.mx-row-chev { color: var(--mx-text-3); font-size: 16px; flex-shrink: 0; }

.mx-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--mx-text-2);
  font-size: 14px;
}
.mx-empty > ion-icon { font-size: 40px; color: var(--mx-text-3); }
.mx-empty-title { margin: 8px 0 4px; font-size: 16px; font-weight: 600; color: var(--mx-text); }
.mx-empty p { margin: 0; }

/* ── Panel de estilos ──────────────────────────────── */
.mx-backdrop {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(15, 23, 42, 0.4);
}
.mx-style-panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 41;
  max-width: 480px;
  margin: 0 auto;
  border-radius: 20px 20px 0 0;
  border-top: 1px solid var(--mx-border);
  background: var(--mx-surface);
  box-shadow: var(--mx-shadow-lg);
  padding: 16px 16px calc(env(safe-area-inset-bottom) + 16px);
}
.mx-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.mx-panel-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--mx-text);
}
.mx-close {
  width: 32px;
  height: 32px;
  border: 1px solid var(--mx-border);
  border-radius: 50%;
  background: var(--mx-surface-variant);
  color: var(--mx-text-2);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.mx-close:hover { background: var(--mx-fill); color: var(--mx-text); }
.mx-style-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.mx-style-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1.5px solid var(--mx-border);
  border-radius: var(--mx-radius, 12px);
  background: var(--mx-surface-variant);
  font: 500 13px var(--ion-font-family);
  color: var(--mx-text);
  cursor: pointer;
  transition: all 0.18s ease;
}
.mx-style-card img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--mx-border-subtle);
  background: var(--mx-fill);
}
.mx-style-card:active { transform: scale(0.98); }
.mx-style-card.activo {
  border-color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.05);
  box-shadow: 0 0 0 1px var(--ion-color-primary);
}
.mx-style-card.activo span { color: var(--ion-color-primary); font-weight: 600; }

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
