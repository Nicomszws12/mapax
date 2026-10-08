<template>
  <transition name="mx-slide-down">
    <div
      v-if="isMeasuring"
      class="mx-measure-bar"
      role="region"
      aria-label="Barra de medición de mapa"
    >
      <div class="mx-measure-header">
        <!-- Selector Segmentado: Distancia / Área -->
        <ion-segment
          :value="measureMode"
          mode="md"
          class="mx-measure-segment"
          @ionChange="onSegmentChange"
        >
          <ion-segment-button value="distance">
            <ion-icon :icon="resizeOutline" class="seg-icon" />
            <ion-label>Distancia</ion-label>
          </ion-segment-button>
          <ion-segment-button value="area">
            <ion-icon :icon="shapesOutline" class="seg-icon" />
            <ion-label>Área</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Botón Salir / Cerrar -->
        <button
          type="button"
          class="mx-measure-btn mx-btn-close"
          aria-label="Salir del modo medición"
          title="Salir"
          @click="emit('close')"
        >
          <ion-icon :icon="close" />
        </button>
      </div>

      <!-- Fila inferior: Resultado en tiempo real y controles auxiliares -->
      <div class="mx-measure-body">
        <div class="mx-measure-result">
          <span class="mx-measure-badge">
            <span class="pulse-dot"></span>
            {{ pointsCount }} {{ pointsCount === 1 ? 'punto' : 'puntos' }}
          </span>
          <span class="mx-measure-value">{{ resultText || 'Toca el mapa para comenzar' }}</span>
        </div>

        <div class="mx-measure-actions">
          <!-- Deshacer último punto -->
          <button
            type="button"
            class="mx-measure-btn"
            :disabled="pointsCount === 0"
            aria-label="Deshacer último punto"
            title="Deshacer último punto"
            @click="emit('undo')"
          >
            <ion-icon :icon="arrowUndoOutline" />
          </button>

          <!-- Limpiar todo -->
          <button
            type="button"
            class="mx-measure-btn"
            :disabled="pointsCount === 0"
            aria-label="Borrar todos los puntos"
            title="Limpiar"
            @click="emit('clear')"
          >
            <ion-icon :icon="trashOutline" />
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import {
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
} from '@ionic/vue';
import {
  resizeOutline,
  shapesOutline,
  arrowUndoOutline,
  trashOutline,
  close,
} from 'ionicons/icons';
import type { MeasureMode } from '../composables/useMapMeasure';

defineProps<{
  isMeasuring: boolean;
  measureMode: MeasureMode;
  pointsCount: number;
  resultText: string;
}>();

const emit = defineEmits<{
  (e: 'changeMode', mode: MeasureMode): void;
  (e: 'undo'): void;
  (e: 'clear'): void;
  (e: 'close'): void;
}>();

function onSegmentChange(ev: CustomEvent): void {
  const mode = ev.detail.value as MeasureMode;
  if (mode === 'distance' || mode === 'area') {
    emit('changeMode', mode);
  }
}
</script>

<style scoped>
.mx-measure-bar {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  left: 14px;
  right: 14px;
  z-index: 1500;
  background: rgba(18, 18, 18, 0.95);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  padding: 10px 14px 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  color: #ffffff;
  pointer-events: auto;
  transition: all 0.25s ease;
}

@media (min-width: 768px) {
  .mx-measure-bar {
    left: 50%;
    transform: translateX(-50%);
    width: 480px;
    right: auto;
  }
}

.mx-measure-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.mx-measure-segment {
  --background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  min-height: 36px;
  flex: 1;
}

.mx-measure-segment ion-segment-button {
  --color: rgba(255, 255, 255, 0.7);
  --color-checked: #ffffff;
  --indicator-color: #2563eb;
  --indicator-box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
  min-height: 34px;
  font-size: 13px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

.seg-icon {
  font-size: 16px;
  margin-right: 4px;
}

.mx-measure-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 8px 12px;
}

.mx-measure-result {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mx-measure-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #60a5fa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 8px #3b82f6;
  animation: pulse-ring 1.3s infinite ease-in-out;
}

@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.8; }
}

.mx-measure-value {
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.3px;
}

.mx-measure-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mx-measure-btn {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mx-measure-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.mx-measure-btn:active:not(:disabled) {
  transform: scale(0.93);
}

.mx-measure-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.mx-btn-close {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
}

.mx-btn-close:hover {
  background: #ef4444;
  color: #ffffff;
}

.mx-slide-down-enter-active,
.mx-slide-down-leave-active {
  transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease;
}

.mx-slide-down-enter-from,
.mx-slide-down-leave-to {
  transform: translateY(-110%);
  opacity: 0;
}
</style>

