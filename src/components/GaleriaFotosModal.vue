<template>
  <ion-modal :is-open="isOpen" @didDismiss="cerrar">
    <ion-header>
      <ion-toolbar class="modal-toolbar">
        <ion-buttons slot="start">
          <ion-button @click="cerrar">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ nombre }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="modal-content">
      <div class="galeria-container">
        <!-- Sin fotos -->
        <div v-if="fotos.length === 0" class="no-fotos">
          <ion-icon :icon="imagesOutline" class="no-fotos-icon" />
          <p>Este lugar no tiene fotos</p>
        </div>

        <!-- Foto principal -->
        <div v-else class="foto-principal-wrapper">
          <img
            :src="fotos[fotoActual]"
            :alt="`Foto ${fotoActual + 1}`"
            class="foto-principal"
            @click="toggleZoom"
            :class="{ zoomed: isZoomed }"
          />

          <!-- Navegación -->
          <div class="foto-nav" v-if="fotos.length > 1">
            <ion-button
              fill="clear"
              @click="fotoAnterior"
              :disabled="fotoActual === 0"
              class="nav-btn"
            >
              <ion-icon slot="icon-only" :icon="chevronBackOutline" />
            </ion-button>
            <span class="foto-counter">{{ fotoActual + 1 }} / {{ fotos.length }}</span>
            <ion-button
              fill="clear"
              @click="fotoSiguiente"
              :disabled="fotoActual === fotos.length - 1"
              class="nav-btn"
            >
              <ion-icon slot="icon-only" :icon="chevronForwardOutline" />
            </ion-button>
          </div>

          <!-- Indicadores de punto -->
          <div class="foto-dots" v-if="fotos.length > 1">
            <span
              v-for="(_, i) in fotos"
              :key="i"
              class="dot"
              :class="{ active: i === fotoActual }"
              @click="fotoActual = i"
            />
          </div>
        </div>

        <!-- Info del lugar -->
        <div class="lugar-info">
          <div class="lugar-tipo">
            <img :src="`/assets/icon/${iconoArchivo}`" class="tipo-icono" />
            <span>{{ etiquetaTipo }}</span>
          </div>
          <p v-if="descripcion" class="lugar-desc">{{ descripcion }}</p>
        </div>

        <!-- Grid de miniaturas -->
        <div class="thumbnails" v-if="fotos.length > 1">
          <div
            v-for="(foto, i) in fotos"
            :key="i"
            class="thumb"
            :class="{ active: i === fotoActual }"
            @click="fotoActual = i"
          >
            <img :src="foto" :alt="`Miniatura ${i + 1}`" />
          </div>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon
} from '@ionic/vue';
import {
  closeOutline, imagesOutline,
  chevronBackOutline, chevronForwardOutline
} from 'ionicons/icons';

const props = defineProps<{
  isOpen: boolean;
  nombre: string;
  descripcion: string;
  tipo: string;
  fotos: string[];
}>();

const emit = defineEmits<{
  (e: 'cerrar'): void;
}>();

const fotoActual = ref(0);
const isZoomed = ref(false);

// Mapeo de tipo a archivo de icono
const iconosPorTipo: Record<string, string> = {
  cafeteria: 'cafe.svg', biblioteca: 'book.svg', bano: 'bano.svg',
  parque: 'parque.svg', hospital: 'hospital.svg', tienda: 'tienda.svg',
  restaurante: 'restaurante.svg', iglesia: 'iglesia.svg', museo: 'museo.svg',
  universidad: 'universidad.svg', gimnasio: 'gimnasio.svg',
};

const etiquetasPorTipo: Record<string, string> = {
  cafeteria: '☕ Cafetería', biblioteca: '📚 Biblioteca', bano: '🚻 Baño',
  parque: '🌳 Parque', hospital: '🏥 Hospital', tienda: '🛍️ Tienda',
  restaurante: '🍽️ Restaurante', iglesia: '⛪ Iglesia', museo: '🏛️ Museo',
  universidad: '🎓 Universidad', gimnasio: '💪 Gimnasio',
};

const iconoArchivo = ref(iconosPorTipo[props.tipo] || 'marker.svg');
const etiquetaTipo = ref(etiquetasPorTipo[props.tipo] || props.tipo);

watch(() => props.tipo, (t) => {
  iconoArchivo.value = iconosPorTipo[t] || 'marker.svg';
  etiquetaTipo.value = etiquetasPorTipo[t] || t;
});

watch(() => props.isOpen, (open) => {
  if (open) {
    fotoActual.value = 0;
    isZoomed.value = false;
  }
});

function toggleZoom() {
  isZoomed.value = !isZoomed.value;
}

function fotoAnterior() {
  if (fotoActual.value > 0) fotoActual.value--;
}

function fotoSiguiente() {
  if (fotoActual.value < props.fotos.length - 1) fotoActual.value++;
}

function cerrar() {
  emit('cerrar');
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

.galeria-container {
  padding: 0;
}

.no-fotos {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #5a6380;
}

.no-fotos-icon {
  font-size: 64px;
  margin-bottom: 12px;
  color: #2a2a4a;
}

.foto-principal-wrapper {
  position: relative;
  background: #000;
}

.foto-principal {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  display: block;
  transition: transform 0.3s;
  cursor: zoom-in;
}

.foto-principal.zoomed {
  transform: scale(1.5);
  cursor: zoom-out;
}

.foto-nav {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.nav-btn {
  --color: white;
  --background: rgba(0, 0, 0, 0.5);
  --border-radius: 50%;
  width: 40px;
  height: 40px;
}

.foto-counter {
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
}

.foto-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.2s;
}

.dot.active {
  background: #00d2ff;
  width: 20px;
  border-radius: 4px;
}

.lugar-info {
  padding: 16px;
  border-bottom: 1px solid #1a1a2e;
}

.lugar-tipo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #ccd6f6;
  font-size: 15px;
  font-weight: 600;
}

.tipo-icono {
  width: 24px;
  height: 24px;
}

.lugar-desc {
  color: #8892b0;
  font-size: 14px;
  margin: 10px 0 0;
  line-height: 1.5;
}

.thumbnails {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
}

.thumb {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s;
}

.thumb.active {
  border-color: #00d2ff;
  opacity: 1;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

