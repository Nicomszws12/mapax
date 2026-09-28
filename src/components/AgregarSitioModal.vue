<template>
  <ion-modal :is-open="isOpen" @didDismiss="cerrar">
    <ion-header>
      <ion-toolbar class="modal-toolbar">
        <ion-buttons slot="start">
          <ion-button @click="cerrar">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>Agregar Sitio</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="guardar" :disabled="!esValido" strong>
            Guardar
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="modal-content">
      <div class="form-container">
        <!-- Nombre -->
        <ion-item class="form-item">
          <ion-label position="stacked">Nombre del sitio *</ion-label>
          <ion-input v-model="nombre" placeholder="Ej: Mi cafetería favorita" />
        </ion-item>

        <!-- Descripción -->
        <ion-item class="form-item">
          <ion-label position="stacked">Descripción</ion-label>
          <ion-textarea v-model="descripcion" placeholder="Describe este lugar..." :rows="3" />
        </ion-item>

        <!-- Ubicación -->
        <ion-item class="form-item">
          <ion-label position="stacked">Ubicación</ion-label>
          <div class="ubicacion-info">
            <ion-icon :icon="locationOutline" color="primary" />
            <span v-if="lat && lng">{{ lat.toFixed(6) }}, {{ lng.toFixed(6) }}</span>
            <span v-else class="muted">Toca en el mapa para seleccionar</span>
          </div>
        </ion-item>

        <!-- Selector de tipo/icono -->
        <div class="section-title">Selecciona el tipo de lugar *</div>
        <div class="icon-grid">
          <div
            v-for="(info, key) in tiposDisponibles"
            :key="key"
            class="icon-option"
            :class="{ selected: tipoSeleccionado === key }"
            @click="tipoSeleccionado = key"
          >
            <img :src="`/assets/icon/${info.icono}`" :alt="info.etiqueta" class="icon-img" />
            <span class="icon-label">{{ info.etiqueta }}</span>
          </div>
        </div>

        <!-- Fotos -->
        <div class="section-title">Fotos del lugar</div>
        <div class="fotos-container">
          <div class="fotos-grid">
            <div
              v-for="(foto, index) in fotos"
              :key="index"
              class="foto-item"
            >
              <img :src="foto" alt="Foto del lugar" />
              <ion-button
                fill="clear"
                class="foto-remove"
                @click="quitarFoto(index)"
              >
                <ion-icon slot="icon-only" :icon="closeCircleOutline" />
              </ion-button>
            </div>

            <!-- Botón agregar foto -->
            <div class="foto-add" @click="mostrarOpcionesFoto">
              <ion-icon :icon="cameraOutline" class="add-icon" />
              <span>Agregar</span>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <!-- Action Sheet para seleccionar origen de foto -->
    <ion-action-sheet
      :is-open="mostrarActionSheet"
      header="Agregar foto"
      :buttons="botonesActionSheet"
      @didDismiss="mostrarActionSheet = false"
    />
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon, IonItem, IonLabel,
  IonInput, IonTextarea, IonActionSheet
} from '@ionic/vue';
import {
  closeOutline, locationOutline, cameraOutline,
  closeCircleOutline, cameraSharp, imageOutline
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Props
const props = defineProps<{
  isOpen: boolean;
  lat: number | null;
  lng: number | null;
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

// Estado del formulario
const nombre = ref('');
const descripcion = ref('');
const tipoSeleccionado = ref<string | null>(null);
const fotos = ref<string[]>([]);
const mostrarActionSheet = ref(false);

// Tipos de lugares disponibles
const tiposDisponibles: Record<string, { icono: string; etiqueta: string }> = {
  cafeteria:    { icono: 'cafe.svg', etiqueta: '☕ Cafetería' },
  biblioteca:   { icono: 'book.svg', etiqueta: '📚 Biblioteca' },
  bano:         { icono: 'bano.svg', etiqueta: '🚻 Baño' },
  parque:       { icono: 'parque.svg', etiqueta: '🌳 Parque' },
  hospital:     { icono: 'hospital.svg', etiqueta: '🏥 Hospital' },
  tienda:       { icono: 'tienda.svg', etiqueta: '🛍️ Tienda' },
  restaurante:  { icono: 'restaurante.svg', etiqueta: '🍽️ Restaurante' },
  iglesia:      { icono: 'iglesia.svg', etiqueta: '⛪ Iglesia' },
  museo:        { icono: 'museo.svg', etiqueta: '🏛️ Museo' },
  universidad:  { icono: 'universidad.svg', etiqueta: '🎓 Universidad' },
  gimnasio:     { icono: 'gimnasio.svg', etiqueta: '💪 Gimnasio' },
};

// Validación
const esValido = computed(() => {
  return nombre.value.trim().length > 0
    && tipoSeleccionado.value !== null
    && props.lat !== null
    && props.lng !== null;
});

// Resetear formulario cuando se abre
watch(() => props.isOpen, (open) => {
  if (open) {
    nombre.value = '';
    descripcion.value = '';
    tipoSeleccionado.value = null;
    fotos.value = [];
  }
});

// Botones del action sheet
const botonesActionSheet = [
  {
    text: 'Tomar foto',
    icon: cameraSharp,
    handler: () => tomarFoto(CameraSource.Camera),
  },
  {
    text: 'Elegir de galería',
    icon: imageOutline,
    handler: () => tomarFoto(CameraSource.Photos),
  },
  {
    text: 'Cancelar',
    role: 'cancel' as const,
  },
];

// Funciones
function mostrarOpcionesFoto() {
  mostrarActionSheet.value = true;
}

async function tomarFoto(source: CameraSource) {
  try {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source,
      width: 800,
      height: 800,
    });

    if (image.dataUrl) {
      fotos.value.push(image.dataUrl);
    }
  } catch (err) {
    console.error('Error al tomar foto:', err);
  }
}

function quitarFoto(index: number) {
  fotos.value.splice(index, 1);
}

function cerrar() {
  emit('cerrar');
}

function guardar() {
  if (!esValido.value || props.lat === null || props.lng === null) return;

  emit('guardar', {
    nombre: nombre.value.trim(),
    descripcion: descripcion.value.trim(),
    tipo: tipoSeleccionado.value!,
    lat: props.lat,
    lng: props.lng,
    fotos: [...fotos.value],
  });

  cerrar();
}
</script>

<style scoped>
.modal-toolbar {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  --color: #e0e0e0;
}

.modal-content {
  --background: #0f0f23;
}

.form-container {
  padding: 16px;
}

.form-item {
  --background: #1a1a2e;
  --color: #e0e0e0;
  --border-color: #2a2a4a;
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
}

.form-item ion-label {
  color: #8892b0 !important;
  font-size: 13px !important;
}

.form-item ion-input,
.form-item ion-textarea {
  --color: #e0e0e0;
  --placeholder-color: #5a6380;
}

.ubicacion-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  color: #ccd6f6;
  font-size: 14px;
}

.muted {
  color: #5a6380;
  font-style: italic;
}

.section-title {
  color: #8892b0;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 20px 0 12px;
  padding-left: 4px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.icon-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  border-radius: 12px;
  background: #1a1a2e;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-option.selected {
  border-color: #00d2ff;
  background: #16213e;
  box-shadow: 0 0 12px rgba(0, 210, 255, 0.2);
}

.icon-img {
  width: 28px;
  height: 28px;
}

.icon-label {
  font-size: 10px;
  color: #8892b0;
  text-align: center;
  line-height: 1.2;
}

.icon-option.selected .icon-label {
  color: #00d2ff;
}

.fotos-container {
  margin-top: 8px;
}

.fotos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.foto-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
}

.foto-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.foto-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  --color: #ff4444;
  --padding-start: 4px;
  --padding-end: 4px;
  font-size: 22px;
  z-index: 10;
}

.foto-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  aspect-ratio: 1;
  border-radius: 12px;
  border: 2px dashed #2a2a4a;
  background: #1a1a2e;
  cursor: pointer;
  transition: all 0.2s;
}

.foto-add:active {
  border-color: #00d2ff;
  background: #16213e;
}

.foto-add .add-icon {
  font-size: 28px;
  color: #00d2ff;
}

.foto-add span {
  font-size: 11px;
  color: #8892b0;
}
</style>

