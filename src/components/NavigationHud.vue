<template>
  <div class="nav-hud" role="region" aria-label="Navegación paso a paso">
    <!-- ── Panel superior: próxima maniobra ── -->
    <transition name="nav-hud-top">
      <div v-if="isNavigating" class="nav-hud-card nav-hud-top" aria-live="polite">
        <div class="nav-hud-main">
          <div class="nav-hud-icon" :class="{ llegada: esLlegada }">
            <ion-icon
              :icon="iconoManiobra.icon"
              :style="{ transform: `rotate(${iconoManiobra.rotate}deg)` }"
              aria-hidden="true"
            />
          </div>
          <div class="nav-hud-text">
            <div class="nav-hud-distance">{{ textoDistancia }}</div>
            <div class="nav-hud-instruction">{{ step?.instruction ?? 'Calculando siguiente maniobra…' }}</div>
            <div v-if="calleVisible" class="nav-hud-street">{{ step?.street }}</div>
          </div>
        </div>

        <transition name="nav-hud-fade">
          <div v-if="gpsLost" class="nav-hud-gps" role="status">
            <ion-icon :icon="cloudOfflineOutline" aria-hidden="true" />
            <span>Señal GPS débil · buscando ubicación…</span>
          </div>
        </transition>
      </div>
    </transition>

    <!-- ── Panel inferior: métricas y salida ── -->
    <transition name="nav-hud-bottom">
      <div v-if="isNavigating" class="nav-hud-card nav-hud-bottom">
        <div class="nav-hud-metrics">
          <div class="nav-hud-metric">
            <span class="nav-hud-metric-value">{{ tiempoRestanteTexto }}</span>
            <span class="nav-hud-metric-label">Tiempo</span>
          </div>
          <div class="nav-hud-metric">
            <span class="nav-hud-metric-value">{{ distanciaRestanteTexto }}</span>
            <span class="nav-hud-metric-label">Distancia</span>
          </div>
          <div class="nav-hud-metric">
            <span class="nav-hud-metric-value">{{ horaLlegadaTexto }}</span>
            <span class="nav-hud-metric-label">Llegada</span>
          </div>
        </div>

        <ion-button
          class="nav-hud-exit"
          color="danger"
          expand="block"
          shape="round"
          size="large"
          @click="emit('finalizar')"
        >
          <ion-icon slot="start" :icon="closeCircle" aria-hidden="true" />
          Finalizar viaje
        </ion-button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import {
  arrowBack, arrowForward, arrowUndo, arrowUp, closeCircle, cloudOfflineOutline, flag, sync,
} from 'ionicons/icons';

import { formatearDistancia } from '../data/lugares';
import { esManiobraFinal, formatearDistanciaManiobra } from '../services/navigationService';
import { formatearMinutosLegible, type NavigationStep } from '../services/routingService';

interface IconoManiobra {
  icon: string;
  /** Giro adicional en grados (sentido horario) para variantes como "mantente a la derecha". */
  rotate: number;
}

const props = withDefaults(
  defineProps<{
    isNavigating: boolean;
    step: NavigationStep | null;
    /** Distancia en línea recta (m) hasta la maniobra pendiente. */
    distanceToNextStep: number;
    /** Distancia total restante (m). */
    remainingDistanceMeters: number;
    /** Tiempo total restante (s). */
    remainingSeconds: number;
    /** `true` si se perdió temporalmente la señal GPS. */
    gpsLost?: boolean;
  }>(),
  { gpsLost: false }
);

const emit = defineEmits<{
  (e: 'finalizar'): void;
}>();

function resolverIcono(maneuver: string): IconoManiobra {
  const m = maneuver.toUpperCase();

  if (esManiobraFinal(m)) return { icon: flag, rotate: 0 };
  if (m.includes('ROUNDABOUT')) return { icon: sync, rotate: 0 };
  if (m.includes('UTURN')) return { icon: arrowUndo, rotate: 0 };

  const izquierda = m.includes('LEFT');
  const derecha = m.includes('RIGHT');
  if (izquierda || derecha) {
    const signo = derecha ? 1 : -1;
    const base = derecha ? arrowForward : arrowBack;
    if (m.includes('SHARP')) return { icon: base, rotate: signo * 45 };
    if (m.startsWith('TURN')) return { icon: base, rotate: 0 };
    // BEAR_*, KEEP_*, MOTORWAY_EXIT_*, WAYPOINT_*: desvío suave
    return { icon: arrowUp, rotate: signo * 45 };
  }

  return { icon: arrowUp, rotate: 0 };
}

const iconoManiobra = computed<IconoManiobra>(() => resolverIcono(props.step?.maneuver ?? 'STRAIGHT'));
const esLlegada = computed(() => (props.step ? esManiobraFinal(props.step.maneuver) : false));

const textoDistancia = computed(() => `A ${formatearDistanciaManiobra(props.distanceToNextStep)}`);

/** Muestra la vía por separado solo si la instrucción no la menciona ya. */
const calleVisible = computed(() => {
  const s = props.step;
  return !!s?.street && !s.instruction.toLowerCase().includes(s.street.toLowerCase());
});

const tiempoRestanteTexto = computed(() =>
  formatearMinutosLegible(Math.max(1, Math.round(props.remainingSeconds / 60)))
);
const distanciaRestanteTexto = computed(() => formatearDistancia(Math.max(0, props.remainingDistanceMeters)));

const horaLlegadaTexto = computed(() => {
  const llegada = new Date(Date.now() + Math.max(0, props.remainingSeconds) * 1000);
  return llegada.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
});
</script>

<style scoped>
.nav-hud {
  position: absolute;
  inset: 0;
  z-index: 1500;
  pointer-events: none; /* El mapa sigue siendo interactivo fuera de las tarjetas */
}

.nav-hud-card {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: auto;
  box-sizing: border-box;
  margin: 12px 16px;
  color: #fff;
  background: rgba(18, 18, 18, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  will-change: transform, opacity;
}

/* ── Superior ───────────────────────────────────────── */
.nav-hud-top {
  top: env(safe-area-inset-top, 0px);
  padding: 14px 16px;
}
.nav-hud-main {
  display: flex;
  align-items: center;
  gap: 16px;
}
.nav-hud-icon {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background: var(--ion-color-primary, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  transition: background 0.3s ease;
}
.nav-hud-icon.llegada {
  background: var(--mx-green, #10b981);
}
.nav-hud-icon ion-icon {
  transition: transform 0.35s cubic-bezier(0.2, 0, 0, 1);
}
.nav-hud-text {
  flex: 1;
  min-width: 0;
}
.nav-hud-distance {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.nav-hud-instruction {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.3;
  color: rgba(255, 255, 255, 0.92);
  overflow-wrap: anywhere;
}
.nav-hud-street {
  margin-top: 6px;
  display: inline-block;
  max-width: 100%;
  padding: 2px 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-hud-gps {
  margin-top: 12px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  background: rgba(217, 119, 6, 0.28);
  color: #fcd34d;
  font-size: 13px;
  font-weight: 600;
}
.nav-hud-gps ion-icon {
  font-size: 18px;
  flex-shrink: 0;
}

/* ── Inferior ───────────────────────────────────────── */
.nav-hud-bottom {
  bottom: env(safe-area-inset-bottom, 0px);
  padding: 14px 16px 16px;
}
.nav-hud-metrics {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}
.nav-hud-metric {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.nav-hud-metric + .nav-hud-metric {
  border-left: 1px solid rgba(255, 255, 255, 0.14);
}
.nav-hud-metric-value {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.nav-hud-metric-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}
.nav-hud-exit {
  margin: 0;
  --box-shadow: 0 4px 14px rgba(239, 68, 68, 0.45);
  font-weight: 700;
}

/* ── Transiciones fluidas ───────────────────────────── */
.nav-hud-top-enter-active,
.nav-hud-top-leave-active,
.nav-hud-bottom-enter-active,
.nav-hud-bottom-leave-active {
  transition: transform 0.45s cubic-bezier(0.2, 0, 0, 1), opacity 0.3s ease;
}
.nav-hud-top-enter-from,
.nav-hud-top-leave-to {
  opacity: 0;
  transform: translateY(-120%);
}
.nav-hud-bottom-enter-from,
.nav-hud-bottom-leave-to {
  opacity: 0;
  transform: translateY(120%);
}
.nav-hud-fade-enter-active,
.nav-hud-fade-leave-active {
  transition: opacity 0.25s ease;
}
.nav-hud-fade-enter-from,
.nav-hud-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .nav-hud-top-enter-active,
  .nav-hud-top-leave-active,
  .nav-hud-bottom-enter-active,
  .nav-hud-bottom-leave-active,
  .nav-hud-icon ion-icon {
    transition-duration: 0.01ms;
  }
}

@media (min-width: 768px) {
  .nav-hud-card {
    right: auto;
    width: 420px;
  }
}
</style>

