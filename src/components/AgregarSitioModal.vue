<template>
  <ion-modal
    :is-open="isOpen"
    :presenting-element="presentingElement"
    mode="md"
    class="modal-sitio"
    @didDismiss="cerrar"
  >
    <ion-header mode="md" class="ion-no-border header-sitio">
      <ion-toolbar mode="md" class="toolbar-sitio">
        <ion-buttons slot="start">
          <ion-button @click="cerrar" fill="clear" aria-label="Cancelar">
            <ion-icon slot="icon-only" :icon="close" />
          </ion-button>
        </ion-buttons>
        <ion-title class="title-sitio">Nuevo Lugar</ion-title>
        <ion-buttons slot="end">
          <ion-button
            @click="guardar"
            :disabled="!esValido"
            fill="solid"
            color="primary"
            class="btn-guardar"
          >
            <ion-icon slot="start" :icon="checkmark" />
            Guardar
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content mode="md" class="content-sitio">
      <div class="form-container">
        <!-- Grupo 1: Información General con inputs modernos de Ionic -->
        <section class="section-block">
          <h3 class="section-title">Información del lugar</h3>
          <div class="input-group">
            <ion-input
              v-model="nombre"
              type="text"
              label="Nombre del lugar *"
              label-placement="floating"
              fill="outline"
              mode="md"
              placeholder="Ej. Mirador de La Candelaria"
              :maxlength="80"
              class="campo-input"
            />

            <ion-textarea
              v-model="descripcion"
              label="Descripción o notas"
              label-placement="floating"
              fill="outline"
              mode="md"
              placeholder="Detalles, recomendaciones o notas..."
              :auto-grow="true"
              :rows="3"
              class="campo-textarea"
            />
          </div>
        </section>

        <!-- Grupo 2: Ubicación seleccionada en el mapa -->
        <section class="section-block">
          <h3 class="section-title">Ubicación en el mapa</h3>
          <div class="ubicacion-card">
            <div class="ubicacion-icono">
              <ion-icon :icon="location" />
            </div>
            <div class="ubicacion-info">
              <span class="ubicacion-titulo">Coordenadas exactas</span>
              <span v-if="lat && lng" class="ubicacion-coords">
                {{ lat.toFixed(6) }}, {{ lng.toFixed(6) }}
              </span>
              <span v-else class="ubicacion-muted">Punto marcado en Bogotá</span>
            </div>
          </div>
        </section>

        <!-- Grupo 3: Selector de categorías Material Design -->
        <section class="section-block">
          <h3 class="section-title">Categoría</h3>
          <div class="categorias-grid">
            <button
              v-for="t in TIPOS"
              :key="t"
              type="button"
              class="cat-chip"
              :class="{ activo: tipoSeleccionado === t }"
              @click="tipoSeleccionado = t"
            >
              <span
                class="cat-icono"
                :style="{ background: CATEGORIAS[t].color }"
              >
                <ion-icon :icon="CATEGORIAS[t].icono" />
              </span>
              <span class="cat-label">{{ CATEGORIAS[t].etiqueta }}</span>
            </button>
          </div>
        </section>

        <!-- Grupo 4: Galería de fotos adjuntas -->
        <section class="section-block">
          <div class="section-header-row">
            <h3 class="section-title">Fotografías ({{ fotos.length }})</h3>
            <span class="section-badge">Opcional</span>
          </div>

          <div class="fotos-container">
            <div class="fotos-grid">
              <div
                v-for="(foto, index) in fotos"
                :key="index"
                class="foto-card"
              >
                <img :src="foto" alt="Foto capturada" />
                <button
                  type="button"
                  class="btn-eliminar-foto"
                  aria-label="Quitar foto"
                  @click="quitarFoto(index)"
                >
                  <ion-icon :icon="trashOutline" />
                </button>
              </div>

              <!-- Botón para añadir foto -->
              <button
                type="button"
                class="btn-agregar-foto"
                @click="mostrarOpcionesFoto"
              >
                <div class="icono-camara-wrap">
                  <ion-icon :icon="camera" />
                </div>
                <span>Añadir foto</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </ion-content>

    <!-- Action Sheet para selección de imagen -->
    <ion-action-sheet
      :is-open="mostrarActionSheet"
      mode="md"
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
  IonButton, IonButtons, IonIcon, IonActionSheet,
  IonInput, IonTextarea
} from '@ionic/vue';
import {
  location, camera, close, cameraOutline, imageOutline,
  checkmark, trashOutline
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
    text: 'Tomar foto',
    icon: cameraOutline,
    handler: () => tomarFoto(CameraSource.Camera),
  },
  {
    text: 'Seleccionar foto de galería',
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
    console.warn('Operación de cámara descartada o cancelada:', err);
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
/* Toolbar y Header Material 3 */
.header-sitio {
  border-bottom: 1px solid var(--mx-border);
}

.toolbar-sitio {
  --background: var(--mx-surface);
  --color: var(--mx-text);
  --border-width: 0;
  padding: 0 4px;
}

.title-sitio {
  font-size: 18px;
  font-weight: 600;
  color: var(--mx-text);
}

.btn-guardar {
  --border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  height: 36px;
  margin-right: 6px;
}

.content-sitio {
  --background: var(--mx-bg);
}

.form-container {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Secciones y Bloques */
.section-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--mx-text-2);
  margin: 0 4px;
  text-transform: uppercase;
}

.section-badge {
  font-size: 11px;
  color: var(--mx-text-3);
  background: var(--mx-fill);
  padding: 2px 8px;
  border-radius: 12px;
}

/* Grupo de Inputs */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--mx-surface);
  padding: 14px;
  border-radius: var(--mx-radius, 12px);
  border: 1px solid var(--mx-border);
  box-shadow: var(--mx-shadow-sm);
}

.campo-input,
.campo-textarea {
  --background: var(--mx-surface);
  --color: var(--mx-text);
  --placeholder-color: var(--mx-text-3);
  --border-color: var(--mx-border);
  --highlight-color-focused: var(--ion-color-primary);
  font-size: 15px;
}

/* Ubicación Card */
.ubicacion-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--mx-surface);
  border-radius: var(--mx-radius, 12px);
  border: 1px solid var(--mx-border);
  box-shadow: var(--mx-shadow-sm);
}

.ubicacion-icono {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(var(--ion-color-primary-rgb, 26, 115, 232), 0.12);
  color: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.ubicacion-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ubicacion-titulo {
  font-size: 14px;
  font-weight: 600;
  color: var(--mx-text);
}

.ubicacion-coords {
  font-size: 13px;
  font-family: monospace;
  color: var(--mx-text-2);
}

.ubicacion-muted {
  font-size: 13px;
  color: var(--mx-text-3);
  font-style: italic;
}

/* Grid de Categorías Material */
.categorias-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

@media (max-width: 380px) {
  .categorias-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.cat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 4px;
  border-radius: var(--mx-radius, 12px);
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: var(--mx-shadow-sm);
}

.cat-chip:active {
  transform: scale(0.96);
}

.cat-chip.activo {
  border-color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb, 26, 115, 232), 0.08);
  box-shadow: 0 0 0 1px var(--ion-color-primary);
}

.cat-icono {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 15px;
}

.cat-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--mx-text);
  text-align: center;
  line-height: 1.2;
}

.cat-chip.activo .cat-label {
  color: var(--ion-color-primary);
  font-weight: 600;
}

/* Fotografías */
.fotos-container {
  background: var(--mx-surface);
  border-radius: var(--mx-radius, 12px);
  border: 1px solid var(--mx-border);
  padding: 12px;
  box-shadow: var(--mx-shadow-sm);
}

.fotos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.foto-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--mx-border);
  box-shadow: var(--mx-shadow-sm);
}

.foto-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.btn-eliminar-foto {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-eliminar-foto:active {
  background: var(--ion-color-danger, #d93025);
}

.btn-agregar-foto {
  aspect-ratio: 1;
  border-radius: 8px;
  border: 1.5px dashed var(--mx-border);
  background: var(--mx-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  color: var(--ion-color-primary);
  transition: all 0.15s ease;
}

.btn-agregar-foto:hover {
  border-color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb, 26, 115, 232), 0.04);
}

.btn-agregar-foto:active {
  transform: scale(0.97);
}

.icono-camara-wrap {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--mx-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--ion-color-primary);
  box-shadow: var(--mx-shadow-sm);
}

.btn-agregar-foto span {
  font-size: 12px;
  font-weight: 500;
}
</style>
