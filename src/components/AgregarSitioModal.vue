<template>
  <ion-modal
    :is-open="isOpen"
    :presenting-element="presentingElement"
    @didDismiss="cerrar"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar class="ios-toolbar">
        <ion-buttons slot="start">
          <ion-button @click="cerrar" class="ios-btn-text">
            Cancelar
          </ion-button>
        </ion-buttons>
        <ion-title class="ios-title">Nuevo Lugar</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="guardar" :disabled="!esValido" strong class="ios-btn-save">
            Guardar
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ios-modal-content">
      <div class="ios-form-body">
        <!-- Grupo 1: Datos del lugar -->
        <div class="ios-group-label">INFORMACIÓN GENERAL</div>
        <div class="ios-grouped-card">
          <div class="ios-row-field">
            <span class="ios-field-label">Nombre</span>
            <input
              v-model="nombre"
              type="text"
              placeholder="Ej. Mirador de La Candelaria"
              class="ios-input"
            />
          </div>
          <div class="ios-row-divider"></div>
          <div class="ios-row-field multi">
            <span class="ios-field-label">Descripción</span>
            <textarea
              v-model="descripcion"
              placeholder="Detalles, recomendaciones o notas..."
              rows="3"
              class="ios-textarea"
            ></textarea>
          </div>
        </div>

        <!-- Grupo 2: Ubicación seleccionada -->
        <div class="ios-group-label">UBICACIÓN EN EL MAPA</div>
        <div class="ios-grouped-card">
          <div class="ios-location-row">
            <div class="ios-loc-glyph">
              <ion-icon :icon="location" />
            </div>
            <div class="ios-loc-data">
              <span class="ios-loc-title">Coordenadas exactas</span>
              <span v-if="lat && lng" class="ios-loc-coords">
                {{ lat.toFixed(6) }}, {{ lng.toFixed(6) }}
              </span>
              <span v-else class="ios-loc-muted">Punto marcado en Bogotá</span>
            </div>
          </div>
        </div>

        <!-- Grupo 3: Selector de categoría estilo iOS -->
        <div class="ios-group-label">CATEGORÍA DEL LUGAR</div>
        <div class="ios-category-grid">
          <button
            v-for="t in TIPOS"
            :key="t"
            type="button"
            class="ios-cat-btn"
            :class="{ activo: tipoSeleccionado === t }"
            @click="tipoSeleccionado = t"
          >
            <span
              class="ios-cat-glyph"
              :style="{ background: CATEGORIAS[t].color }"
            >
              <ion-icon :icon="CATEGORIAS[t].icono" />
            </span>
            <span class="ios-cat-label">{{ CATEGORIAS[t].etiqueta }}</span>
          </button>
        </div>

        <!-- Grupo 4: Galería de fotos -->
        <div class="ios-group-label">FOTOGRAFÍAS ({{ fotos.length }})</div>
        <div class="ios-grouped-card ios-photos-card">
          <div class="ios-photos-grid">
            <div
              v-for="(foto, index) in fotos"
              :key="index"
              class="ios-photo-item"
            >
              <img :src="foto" alt="Foto capturada" />
              <button
                type="button"
                class="ios-photo-delete"
                aria-label="Quitar foto"
                @click="quitarFoto(index)"
              >
                <ion-icon :icon="close" />
              </button>
            </div>

            <!-- Botón agregar con icono de cámara -->
            <button
              type="button"
              class="ios-photo-add-btn"
              @click="mostrarOpcionesFoto"
            >
              <div class="ios-add-icon-wrap">
                <ion-icon :icon="camera" />
              </div>
              <span>Agregar foto</span>
            </button>
          </div>
        </div>
      </div>
    </ion-content>

    <!-- Action Sheet estilo iOS -->
    <ion-action-sheet
      :is-open="mostrarActionSheet"
      header="Seleccionar imagen"
      :buttons="botonesActionSheet"
      @didDismiss="mostrarActionSheet = false"
    />
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon, IonActionSheet
} from '@ionic/vue';
import {
  location, camera, close, cameraOutline, imageOutline
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CATEGORIAS, TIPOS, type TipoPunto } from '../data/categorias';

const props = defineProps<{
  isOpen: boolean;
  lat: number | null;
  lng: number | null;
  presentingElement?: HTMLElement;
}>();

const emit = defineEmits<{
  (e: 'cerrar'): void;
  (e: 'guardar', data: {
    nombre: string;
    descripcion: string;
    tipo: string;
    lat: number;
    lng: number;
    fotos: string[];
  }): void;
}>();

const nombre = ref('');
const descripcion = ref('');
const tipoSeleccionado = ref<TipoPunto | null>('cafeteria');
const fotos = ref<string[]>([]);
const mostrarActionSheet = ref(false);

const esValido = computed(() => {
  return nombre.value.trim().length > 0
    && tipoSeleccionado.value !== null
    && props.lat !== null
    && props.lng !== null;
});

watch(() => props.isOpen, (abierto) => {
  if (abierto) {
    nombre.value = '';
    descripcion.value = '';
    tipoSeleccionado.value = 'cafeteria';
    fotos.value = [];
  }
});

const botonesActionSheet = [
  {
    text: 'Hacer fotografía',
    icon: cameraOutline,
    handler: () => tomarFoto(CameraSource.Camera),
  },
  {
    text: 'Seleccionar de fototeca',
    icon: imageOutline,
    handler: () => tomarFoto(CameraSource.Photos),
  },
  {
    text: 'Cancelar',
    role: 'cancel' as const,
  },
];

function mostrarOpcionesFoto() {
  mostrarActionSheet.value = true;
}

async function tomarFoto(source: CameraSource) {
  try {
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source,
      width: 1024,
      height: 1024,
    });

    if (image.dataUrl) {
      fotos.value.push(image.dataUrl);
    }
  } catch (err) {
    console.warn('Operación de cámara descartada:', err);
  }
}

function quitarFoto(index: number) {
  fotos.value.splice(index, 1);
}

function cerrar() {
  emit('cerrar');
}

function guardar() {
  if (!esValido.value || props.lat === null || props.lng === null || !tipoSeleccionado.value) return;

  emit('guardar', {
    nombre: nombre.value.trim(),
    descripcion: descripcion.value.trim(),
    tipo: tipoSeleccionado.value,
    lat: props.lat,
    lng: props.lng,
    fotos: [...fotos.value],
  });
}
</script>

<style scoped>
.ios-toolbar {
  --background: var(--mx-surface);
  --border-width: 0;
  border-bottom: 0.5px solid var(--mx-separator);
}

.ios-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--mx-text);
  letter-spacing: -0.2px;
}

.ios-btn-text {
  --color: var(--mx-blue);
  font-size: 17px;
  font-weight: 400;
  text-transform: none;
}

.ios-btn-save {
  --color: var(--mx-blue);
  font-size: 17px;
  font-weight: 600;
  text-transform: none;
}

.ios-modal-content {
  --background: var(--mx-bg);
}

.ios-form-body {
  padding: 18px 16px 36px;
  max-width: 580px;
  margin: 0 auto;
}

.ios-group-label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: var(--mx-text-2);
  margin: 16px 8px 6px;
  text-transform: uppercase;
}

.ios-grouped-card {
  background: var(--mx-surface);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.ios-row-field {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
}

.ios-row-field.multi {
  align-items: flex-start;
}

.ios-field-label {
  font-size: 16px;
  font-weight: 500;
  color: var(--mx-text);
  min-width: 90px;
}

.ios-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font: 16px var(--ion-font-family);
  color: var(--mx-text);
}

.ios-input::placeholder,
.ios-textarea::placeholder {
  color: var(--mx-text-3);
}

.ios-textarea {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font: 16px var(--ion-font-family);
  color: var(--mx-text);
  resize: none;
  line-height: 1.4;
}

.ios-row-divider {
  height: 0.5px;
  background: var(--mx-separator);
  margin-left: 16px;
}

/* Ubicación */
.ios-location-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 14px;
}

.ios-loc-glyph {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--mx-blue);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.ios-loc-data {
  display: flex;
  flex-direction: column;
}

.ios-loc-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--mx-text);
}

.ios-loc-coords {
  font-size: 13px;
  color: var(--mx-text-2);
  font-variant-numeric: tabular-nums;
  margin-top: 1px;
}

.ios-loc-muted {
  font-size: 13px;
  color: var(--mx-text-3);
  font-style: italic;
}

/* Categorías */
.ios-category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

@media (max-width: 380px) {
  .ios-category-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.ios-cat-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 6px;
  border-radius: 14px;
  background: var(--mx-surface);
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.2s, background 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.ios-cat-btn:active {
  transform: scale(0.95);
}

.ios-cat-btn.activo {
  border-color: var(--mx-blue);
  background: var(--mx-fill);
}

.ios-cat-glyph {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
}

.ios-cat-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--mx-text);
  text-align: center;
  line-height: 1.2;
}

.ios-cat-btn.activo .ios-cat-label {
  color: var(--mx-blue);
  font-weight: 600;
}

/* Fotos */
.ios-photos-card {
  padding: 14px;
}

.ios-photos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.ios-photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--mx-shadow-sm);
}

.ios-photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ios-photo-delete {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
}

.ios-photo-add-btn {
  aspect-ratio: 1;
  border-radius: 12px;
  border: 1.5px dashed var(--mx-separator);
  background: var(--mx-fill);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  color: var(--mx-blue);
  transition: background 0.15s, transform 0.12s;
}

.ios-photo-add-btn:active {
  transform: scale(0.96);
  background: var(--mx-fill-strong);
}

.ios-add-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--mx-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.ios-photo-add-btn span {
  font-size: 12px;
  font-weight: 500;
}
</style>
