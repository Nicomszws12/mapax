<template>
  <ion-modal
    :is-open="isOpen"
    :presenting-element="presentingElement"
    mode="md"
    class="modal-guardar-track"
    @didDismiss="onCerrar"
  >
    <ion-header mode="md" class="ion-no-border header-track">
      <ion-toolbar mode="md" class="toolbar-track">
        <ion-buttons slot="start">
          <ion-button @click="onCerrar" fill="clear" aria-label="Cancelar">
            <ion-icon slot="icon-only" :icon="close" />
          </ion-button>
        </ion-buttons>
        <ion-title class="title-track">Resumen del Recorrido</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content mode="md" class="content-track">
      <div class="track-modal-container">
        <!-- ── Resumen de métricas destacadas ── -->
        <section class="metrics-hero-card" :style="{ '--track-accent': colorSeleccionado }">
          <div class="metrics-grid">
            <div class="metric-box principal">
              <span class="metric-label">Distancia Total</span>
              <span class="metric-val">{{ distanciaFormateada }}</span>
            </div>

            <div class="metric-box">
              <span class="metric-label">Tiempo</span>
              <span class="metric-val">{{ tiempoFormateado }}</span>
            </div>

            <div class="metric-box">
              <span class="metric-label">Velocidad Media</span>
              <span class="metric-val">{{ velocidadFormateada }}</span>
            </div>

            <div class="metric-box">
              <span class="metric-label">Ritmo Medio</span>
              <span class="metric-val">{{ ritmoMedioFormateado }}</span>
            </div>
          </div>

          <div class="metrics-footer">
            <span class="points-badge">
              <ion-icon :icon="analyticsOutline" />
              {{ pointsCount }} puntos GPS registrados
            </span>
          </div>
        </section>

        <!-- ── Formulario de asignación de nombre ── -->
        <section class="section-block">
          <h3 class="section-title">Nombre del recorrido</h3>
          <div class="input-wrap">
            <ion-input
              v-model="nombreRuta"
              type="text"
              label="Nombre de la ruta *"
              label-placement="floating"
              fill="outline"
              mode="md"
              placeholder="Ej. Ruta Parque Simón Bolívar"
              :maxlength="60"
              class="campo-input-track"
            />
          </div>
        </section>

        <!-- ── Selector de color de la ruta ── -->
        <section class="section-block">
          <h3 class="section-title">Color de la traza</h3>
          <p class="section-sub">Elige el color con el que se identificará este recorrido en el mapa</p>
          <div class="colores-palette">
            <button
              v-for="color in PALETA_COLORES"
              :key="color.hex"
              type="button"
              class="color-chip"
              :class="{ activo: colorSeleccionado === color.hex }"
              :style="{ backgroundColor: color.hex }"
              :aria-label="color.nombre"
              @click="colorSeleccionado = color.hex"
            >
              <ion-icon v-if="colorSeleccionado === color.hex" :icon="checkmark" class="check-icon" />
            </button>
          </div>
          <span class="color-nombre-seleccionado">
            Color seleccionado: <strong>{{ nombreColorActual }}</strong>
          </span>
        </section>

        <!-- ── Botones de acción ── -->
        <div class="actions-group">
          <ion-button
            expand="block"
            shape="round"
            color="primary"
            class="btn-action-primary"
            :disabled="!nombreRuta.trim()"
            @click="onGuardar"
          >
            <ion-icon slot="start" :icon="checkmark" />
            Guardar recorrido
          </ion-button>

          <ion-button
            expand="block"
            shape="round"
            fill="outline"
            color="danger"
            class="btn-action-discard"
            @click="onDescartar"
          >
            <ion-icon slot="start" :icon="trashOutline" />
            Descartar recorrido
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonInput,
} from '@ionic/vue';
import { close, checkmark, trashOutline, analyticsOutline } from 'ionicons/icons';
import { formatearTiempoCronometro } from '../composables/useTrackRecorder';

interface PaletaColor {
  nombre: string;
  hex: string;
}

const PALETA_COLORES: PaletaColor[] = [
  { nombre: 'Naranja dinámico', hex: '#FF5722' },
  { nombre: 'Azul eléctrico', hex: '#2563EB' },
  { nombre: 'Verde esmeralda', hex: '#10B981' },
  { nombre: 'Violeta intenso', hex: '#8B5CF6' },
  { nombre: 'Rosa neón', hex: '#EC4899' },
  { nombre: 'Ámbar dorado', hex: '#F59E0B' },
];

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    durationSeconds: number;
    distanceMeters: number;
    averageSpeedKmh: number;
    pointsCount: number;
    initialColor?: string;
    presentingElement?: HTMLElement;
  }>(),
  {
    initialColor: '#FF5722',
  }
);

const emit = defineEmits<{
  (e: 'guardar', payload: { name: string; color: string }): void;
  (e: 'descartar'): void;
  (e: 'cerrar'): void;
}>();

const nombreRuta = ref('');
const colorSeleccionado = ref(props.initialColor);

watch(
  () => props.isOpen,
  abierto => {
    if (abierto) {
      colorSeleccionado.value = props.initialColor || '#FF5722';
      const ahora = new Date();
      const fechaTexto = ahora.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
      });
      const horaTexto = ahora.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });
      nombreRuta.value = `Recorrido ${fechaTexto} ${horaTexto}`;
    }
  }
);

const distanciaFormateada = computed(() => {
  const km = props.distanceMeters / 1000;
  return `${km.toFixed(2)} km`;
});

const tiempoFormateado = computed(() => {
  return formatearTiempoCronometro(props.durationSeconds);
});

const velocidadFormateada = computed(() => {
  return `${props.averageSpeedKmh.toFixed(1)} km/h`;
});

const ritmoMedioFormateado = computed(() => {
  if (props.distanceMeters <= 0 || props.durationSeconds <= 0) {
    return '--:-- /km';
  }
  const km = props.distanceMeters / 1000;
  const segundosPorKm = Math.round(props.durationSeconds / km);
  const minutos = Math.floor(segundosPorKm / 60);
  const segs = segundosPorKm % 60;
  return `${minutos}:${segs.toString().padStart(2, '0')} /km`;
});

const nombreColorActual = computed(() => {
  const encontrado = PALETA_COLORES.find(c => c.hex.toLowerCase() === colorSeleccionado.value.toLowerCase());
  return encontrado ? encontrado.nombre : 'Personalizado';
});

function onGuardar(): void {
  const nombreLimpio = nombreRuta.value.trim();
  if (!nombreLimpio) return;
  emit('guardar', {
    name: nombreLimpio,
    color: colorSeleccionado.value,
  });
}

function onDescartar(): void {
  emit('descartar');
}

function onCerrar(): void {
  emit('cerrar');
}
</script>

<style scoped>
.modal-guardar-track {
  --background: var(--mx-surface);
  --border-radius: 20px 20px 0 0;
}

@media (min-width: 768px) {
  .modal-guardar-track {
    --width: 520px;
    --height: 640px;
    --border-radius: 16px;
  }
}

.header-track {
  background: var(--mx-surface);
  border-bottom: 1px solid var(--mx-border);
}

.toolbar-track {
  --background: var(--mx-surface);
  --color: var(--mx-text);
  padding: 0 4px;
}

.title-track {
  font-size: 17px;
  font-weight: 700;
  color: var(--mx-text);
}

.content-track {
  --background: var(--mx-bg);
}

.track-modal-container {
  padding: 16px 20px 32px;
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Tarjeta de Métricas Hero ── */
.metrics-hero-card {
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  border-radius: 16px;
  padding: 18px 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.metrics-hero-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--track-accent, #ff5722);
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.metric-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-box.principal .metric-val {
  color: var(--track-accent, #ff5722);
  font-size: 26px;
}

.metric-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--mx-text-2);
}

.metric-val {
  font-size: 20px;
  font-weight: 800;
  color: var(--mx-text);
  font-variant-numeric: tabular-nums;
}

.metrics-footer {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--mx-border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.points-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--mx-text-2);
  font-weight: 500;
}

.points-badge ion-icon {
  font-size: 16px;
  color: var(--ion-color-primary);
}

/* ── Secciones y Campos ── */
.section-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--mx-text);
}

.section-sub {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--mx-text-2);
}

.input-wrap {
  background: var(--mx-surface);
  border-radius: 12px;
}

.campo-input-track {
  --background: var(--mx-surface);
  --color: var(--mx-text);
  --placeholder-color: var(--mx-text-2);
  --border-color: var(--mx-border);
  --border-radius: 12px;
}

/* ── Paleta de Colores ── */
.colores-palette {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 6px 0;
}

.color-chip {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  padding: 0;
}

.color-chip:active {
  transform: scale(0.92);
}

.color-chip.activo {
  border-color: #ffffff;
  box-shadow: 0 0 0 3px var(--mx-border, #cbd5e1), 0 4px 10px rgba(0, 0, 0, 0.2);
  transform: scale(1.08);
}

.check-icon {
  color: #ffffff;
  font-size: 22px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
}

.color-nombre-seleccionado {
  font-size: 12px;
  color: var(--mx-text-2);
}

.color-nombre-seleccionado strong {
  color: var(--mx-text);
}

/* ── Botones de Acción ── */
.actions-group {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-action-primary {
  margin: 0;
  font-weight: 700;
  --box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
}

.btn-action-discard {
  margin: 0;
  font-weight: 600;
}
</style>
