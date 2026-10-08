<template>
  <ion-modal :is-open="isOpen" mode="md" class="modal-visor-fotos" @didDismiss="cerrar">
    <ion-header mode="md" class="ion-no-border header-visor">
      <ion-toolbar mode="md" class="toolbar-visor">
        <ion-buttons slot="start">
          <ion-button @click="cerrar" fill="clear" aria-label="Cerrar" class="btn-cerrar-visor">
            <ion-icon slot="icon-only" :icon="close" />
          </ion-button>
        </ion-buttons>
        <ion-title class="titulo-visor">{{ nombre }}</ion-title>
        <ion-buttons slot="end">
          <span v-if="fotos.length > 0" class="contador-badge">
            {{ fotoActual + 1 }} / {{ fotos.length }}
          </span>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content mode="md" class="content-visor" :scroll-y="false">
      <div class="visor-wrap">
        <!-- Sin fotos -->
        <div v-if="fotos.length === 0" class="empty-visor">
          <div class="empty-glyph">
            <ion-icon :icon="imagesOutline" />
          </div>
          <h3>Sin fotografías</h3>
          <p>Este lugar aún no tiene fotos adjuntas</p>
        </div>

        <!-- Visor principal -->
        <div v-else class="stage-visor">
          <div class="frame-foto" @click="toggleZoom">
            <img
              :src="fotos[fotoActual]"
              :alt="`${nombre} - Foto ${fotoActual + 1}`"
              class="foto-activa"
              :class="{ 'en-zoom': isZoomed }"
            />
          </div>

          <!-- Flechas de navegación rápida -->
          <div v-if="fotos.length > 1" class="controles-navegacion">
            <button
              class="btn-nav prev"
              :disabled="fotoActual === 0"
              aria-label="Foto anterior"
              @click.stop="fotoAnterior"
            >
              <ion-icon :icon="chevronBack" />
            </button>
            <button
              class="btn-nav next"
              :disabled="fotoActual === fotos.length - 1"
              aria-label="Foto siguiente"
              @click.stop="fotoSiguiente"
            >
              <ion-icon :icon="chevronForward" />
            </button>
          </div>
        </div>

        <!-- Ficha inferior con información del lugar -->
        <div class="meta-visor-card">
          <div class="meta-header">
            <span
              class="meta-glyph"
              :style="{ background: categoriaInfo.color }"
            >
              <ion-icon :icon="categoriaInfo.icono" />
            </span>
            <div class="meta-info">
              <span class="meta-categoria">{{ categoriaInfo.etiqueta }}</span>
              <span v-if="fechaFormateada" class="meta-fecha">{{ fechaFormateada }}</span>
            </div>
          </div>
          <p v-if="descripcion" class="meta-descripcion">{{ descripcion }}</p>

          <!-- Tira de miniaturas -->
          <div v-if="fotos.length > 1" class="tira-miniaturas">
            <button
              v-for="(foto, i) in fotos"
              :key="i"
              class="btn-miniatura"
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
.header-visor {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.toolbar-visor {
  --background: #0f172a;
  --color: #ffffff;
  --border-width: 0;
}

.titulo-visor {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.btn-cerrar-visor {
  --color: #ffffff;
  font-size: 20px;
}

.contador-badge {
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  padding: 0 12px;
}

.content-visor {
  --background: #020617;
}

.visor-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
}

.empty-visor {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  padding: 24px;
  text-align: center;
}

.empty-glyph {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-bottom: 16px;
  color: #64748b;
}

.empty-visor h3 {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 6px;
}

.empty-visor p {
  font-size: 14px;
  margin: 0;
}

/* Escenario principal de la foto */
.stage-visor {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #020617;
}

.frame-foto {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-in;
}

.foto-activa {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.25s ease-out;
  user-select: none;
}

.foto-activa.en-zoom {
  transform: scale(1.6);
  cursor: zoom-out;
}

.controles-navegacion {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  pointer-events: none;
}

.btn-nav {
  pointer-events: auto;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.btn-nav:disabled {
  opacity: 0.25;
  cursor: default;
}

.btn-nav:not(:disabled):active {
  transform: scale(0.94);
}

/* Panel inferior con metadata */
.meta-visor-card {
  background: #0f172a;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px 16px calc(env(safe-area-inset-bottom) + 12px);
}

.meta-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-glyph {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.meta-info {
  display: flex;
  flex-direction: column;
}

.meta-categoria {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
}

.meta-fecha {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 1px;
}

.meta-descripcion {
  font-size: 14px;
  color: #cbd5e1;
  margin: 10px 0 0;
  line-height: 1.45;
}

/* Tira de miniaturas */
.tira-miniaturas {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.tira-miniaturas::-webkit-scrollbar {
  display: none;
}

.btn-miniatura {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  padding: 0;
  background: #1e293b;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s ease;
  opacity: 0.55;
}

.btn-miniatura img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.btn-miniatura.activo {
  border-color: var(--ion-color-primary, #2563eb);
  opacity: 1;
  transform: scale(1.04);
}
</style>
