<template>
  <transition name="track-panel-slide">
    <div
      v-if="isRecording"
      class="track-recorder-panel"
      role="region"
      aria-label="Grabación de recorrido en vivo"
    >
      <!-- Cabecera con indicador REC -->
      <div class="track-panel-header">
        <div class="rec-status-wrap">
          <span class="rec-dot" :class="{ pausado: isPaused }"></span>
          <span class="rec-label">{{ isPaused ? 'GRABACIÓN EN PAUSA' : 'GRABANDO EN VIVO (REC)' }}</span>
        </div>
        <span class="rec-live-badge">GPS ACTIVO</span>
      </div>

      <!-- 3 Columnas de métricas en tiempo real -->
      <div class="track-metrics-grid">
        <div class="track-metric-col">
          <span class="metric-num">{{ formattedTime }}</span>
          <span class="metric-tit">Tiempo</span>
        </div>

        <div class="track-metric-divider"></div>

        <div class="track-metric-col">
          <span class="metric-num">{{ formattedDistance }}</span>
          <span class="metric-tit">Distancia</span>
        </div>

        <div class="track-metric-divider"></div>

        <div class="track-metric-col">
          <span class="metric-num">{{ averageSpeedKmh.toFixed(1) }} <small>km/h</small></span>
          <span class="metric-tit">Vel. Media</span>
        </div>
      </div>

      <!-- Botones de Acción: Pausar/Reanudar y Finalizar -->
      <div class="track-panel-actions">
        <button
          type="button"
          class="track-btn track-btn-pause"
          :class="{ reanudar: isPaused }"
          :aria-label="isPaused ? 'Reanudar grabación' : 'Pausar grabación'"
          @click="isPaused ? emit('reanudar') : emit('pausar')"
        >
          <ion-icon :icon="isPaused ? play : pause" />
          <span>{{ isPaused ? 'Reanudar' : 'Pausar' }}</span>
        </button>

        <button
          type="button"
          class="track-btn track-btn-stop"
          aria-label="Finalizar y guardar recorrido"
          @click="emit('finalizar')"
        >
          <ion-icon :icon="stop" />
          <span>Finalizar</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { pause, play, stop } from 'ionicons/icons';

defineProps<{
  isRecording: boolean;
  isPaused: boolean;
  formattedTime: string;
  formattedDistance: string;
  averageSpeedKmh: number;
}>();

const emit = defineEmits<{
  (e: 'pausar'): void;
  (e: 'reanudar'): void;
  (e: 'finalizar'): void;
}>();
</script>

<style scoped>
.track-recorder-panel {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  z-index: 1400;
  background: rgba(18, 18, 18, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 14px 16px 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  color: #ffffff;
  pointer-events: auto;
  will-change: transform, opacity;
}

@media (min-width: 768px) {
  .track-recorder-panel {
    left: auto;
    right: 20px;
    bottom: 24px;
    width: 380px;
  }
}

/* ── Encabezado REC ── */
.track-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.rec-status-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rec-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 10px #ef4444;
  animation: rec-pulse 1.2s infinite ease-in-out;
}

.rec-dot.pausado {
  background: #f59e0b;
  box-shadow: none;
  animation: none;
}

@keyframes rec-pulse {
  0% {
    transform: scale(0.9);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
    box-shadow: 0 0 12px #ef4444;
  }
  100% {
    transform: scale(0.9);
    opacity: 0.8;
  }
}

.rec-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.9);
}

.rec-live-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  letter-spacing: 0.4px;
}

/* ── 3 Columnas de Métricas ── */
.track-metrics-grid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px 8px;
}

.track-metric-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.metric-num {
  font-size: 18px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #ffffff;
  letter-spacing: -0.3px;
}

.metric-num small {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
}

.metric-tit {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.55);
}

.track-metric-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.12);
}

/* ── Botones de Acción ── */
.track-panel-actions {
  display: flex;
  gap: 10px;
}

.track-btn {
  flex: 1;
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.15s ease, opacity 0.15s ease;
}

.track-btn:active {
  transform: scale(0.96);
}

.track-btn ion-icon {
  font-size: 18px;
}

.track-btn-pause {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.track-btn-pause:hover {
  background: rgba(255, 255, 255, 0.2);
}

.track-btn-pause.reanudar {
  background: #2563eb;
  color: #ffffff;
}

.track-btn-stop {
  background: #ef4444;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.track-btn-stop:hover {
  background: #dc2626;
}

/* ── Transición Deslizante ── */
.track-panel-slide-enter-active,
.track-panel-slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.2, 0, 0, 1), opacity 0.25s ease;
}

.track-panel-slide-enter-from,
.track-panel-slide-leave-to {
  transform: translateY(120%);
  opacity: 0;
}
</style>

