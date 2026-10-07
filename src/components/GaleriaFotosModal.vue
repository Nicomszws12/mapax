<template>
  <ion-modal :is-open="isOpen" @didDismiss="cerrar">
    <ion-header class="ion-no-border">
      <ion-toolbar class="ios-photo-toolbar">
        <ion-buttons slot="start">
          <ion-button @click="cerrar" class="ios-close-btn" aria-label="Cerrar">
            <ion-icon slot="icon-only" :icon="close" />
          </ion-button>
        </ion-buttons>
        <ion-title class="ios-photo-title">{{ nombre }}</ion-title>
        <ion-buttons slot="end">
          <span v-if="fotos.length > 0" class="ios-counter-badge">
            {{ fotoActual + 1 }} / {{ fotos.length }}
          </span>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ios-viewer-content" :scroll-y="false">
      <div class="ios-viewer-wrap">
        <!-- Sin fotos -->
        <div v-if="fotos.length === 0" class="ios-no-photos">
          <div class="ios-no-photos-glyph">
            <ion-icon :icon="imagesOutline" />
          </div>
          <h3>Sin fotografías</h3>
          <p>Este lugar aún no tiene fotos adjuntas</p>
        </div>

        <!-- Visor principal -->
        <div v-else class="ios-main-stage">
          <div class="ios-photo-frame" @click="toggleZoom">
            <img
              :src="fotos[fotoActual]"
              :alt="`${nombre} - Foto ${fotoActual + 1}`"
              class="ios-active-photo"
              :class="{ 'en-zoom': isZoomed }"
            />
          </div>

          <!-- Flechas de navegación rápida -->
          <div v-if="fotos.length > 1" class="ios-nav-controls">
            <button
              class="ios-nav-btn prev"
              :disabled="fotoActual === 0"
              aria-label="Foto anterior"
              @click.stop="fotoAnterior"
            >
              <ion-icon :icon="chevronBack" />
            </button>
            <button
              class="ios-nav-btn next"
              :disabled="fotoActual === fotos.length - 1"
              aria-label="Foto siguiente"
              @click.stop="fotoSiguiente"
            >
              <ion-icon :icon="chevronForward" />
            </button>
          </div>
        </div>

        <!-- Ficha inferior con información del lugar -->
        <div class="ios-photo-meta">
          <div class="ios-meta-head">
            <span
              class="ios-meta-glyph"
              :style="{ background: categoriaInfo.color }"
            >
              <ion-icon :icon="categoriaInfo.icono" />
            </span>
            <div class="ios-meta-text">
              <span class="ios-meta-category">{{ categoriaInfo.etiqueta }}</span>
              <span v-if="fechaFormateada" class="ios-meta-date">{{ fechaFormateada }}</span>
            </div>
          </div>
          <p v-if="descripcion" class="ios-meta-desc">{{ descripcion }}</p>

          <!-- Tira de miniaturas -->
          <div v-if="fotos.length > 1" class="ios-thumbs-strip">
            <button
              v-for="(foto, i) in fotos"
              :key="i"
              class="ios-thumb-btn"
              :class="{ activo: i === fotoActual }"
              @click="fotoActual = i"
            >
              <img :src="foto" alt="" />
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon
} from '@ionic/vue';
import {
  close, imagesOutline, chevronBack, chevronForward
} from 'ionicons/icons';
import { categoriaDe } from '../data/categorias';

const props = defineProps<{
  isOpen: boolean;
  nombre: string;
  descripcion: string;
  tipo: string;
  fotos: string[];
  fecha?: string;
}>();

const emit = defineEmits<{
  (e: 'cerrar'): void;
}>();

const fotoActual = ref(0);
const isZoomed = ref(false);

const categoriaInfo = computed(() => categoriaDe(props.tipo));

const fechaFormateada = computed(() => {
  if (!props.fecha) return '';
  try {
    const d = new Date(props.fecha);
    return d.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '';
  }
});

watch(() => props.isOpen, (abierto) => {
  if (abierto) {
    fotoActual.value = 0;
    isZoomed.value = false;
  }
});

function toggleZoom() {
  isZoomed.value = !isZoomed.value;
}

function fotoAnterior() {
  if (fotoActual.value > 0) {
    fotoActual.value--;
    isZoomed.value = false;
  }
}

function fotoSiguiente() {
  if (fotoActual.value < props.fotos.length - 1) {
    fotoActual.value++;
    isZoomed.value = false;
  }
}

function cerrar() {
  emit('cerrar');
}
</script>

<style scoped>
.ios-photo-toolbar {
  --background: rgba(18, 18, 20, 0.88);
  --color: #ffffff;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.12);
}

.ios-photo-title {
  font-size: 17px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.2px;
}

.ios-close-btn {
  --color: #ffffff;
  font-size: 20px;
}

.ios-counter-badge {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  padding: 0 12px;
}

.ios-viewer-content {
  --background: #000000;
}

.ios-viewer-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
}

.ios-no-photos {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  padding: 24px;
  text-align: center;
}

.ios-no-photos-glyph {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.4);
}

.ios-no-photos h3 {
  font-size: 19px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 6px;
}

.ios-no-photos p {
  font-size: 14px;
  margin: 0;
}

/* Escenario principal de la foto */
.ios-main-stage {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #000000;
}

.ios-photo-frame {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-in;
}

.ios-active-photo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  user-select: none;
}

.ios-active-photo.en-zoom {
  transform: scale(1.6);
  cursor: zoom-out;
}

.ios-nav-controls {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  pointer-events: none;
}

.ios-nav-btn {
  pointer-events: auto;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(30, 30, 32, 0.65);
  backdrop-filter: blur(12px);
  border: 0.5px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s, opacity 0.2s;
}

.ios-nav-btn:disabled {
  opacity: 0.2;
  cursor: default;
}

.ios-nav-btn:not(:disabled):active {
  transform: scale(0.9);
}

/* Panel inferior con metadata */
.ios-photo-meta {
  background: rgba(18, 18, 20, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 0.5px solid rgba(255, 255, 255, 0.1);
  padding: 16px 16px calc(env(safe-area-inset-bottom) + 12px);
}

.ios-meta-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ios-meta-glyph {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 17px;
  flex-shrink: 0;
}

.ios-meta-text {
  display: flex;
  flex-direction: column;
}

.ios-meta-category {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
}

.ios-meta-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 1px;
}

.ios-meta-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.4;
  margin: 10px 0 0;
}

/* Tira de miniaturas */
.ios-thumbs-strip {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.ios-thumbs-strip::-webkit-scrollbar {
  display: none;
}

.ios-thumb-btn {
  width: 52px;
  height: 52px;
  border-radius: 9px;
  overflow: hidden;
  padding: 0;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.45;
  transition: opacity 0.2s, border-color 0.2s, transform 0.15s;
}

.ios-thumb-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ios-thumb-btn.activo {
  opacity: 1;
  border-color: #007aff;
  transform: scale(1.05);
}
</style>
