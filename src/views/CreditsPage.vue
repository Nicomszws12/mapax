<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar class="ios-settings-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" text="Atrás" class="ios-back-btn" />
        </ion-buttons>
        <ion-title class="ios-settings-title">Información</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ios-settings-bg">
      <div class="ios-settings-container">
        <!-- Tarjeta Hero de la App -->
        <div class="ios-app-hero">
          <div class="ios-app-icon-wrap">
            <div class="ios-app-icon">
              <ion-icon :icon="map" />
            </div>
          </div>
          <h1 class="ios-hero-title">MapX Bogotá</h1>
          <p class="ios-hero-subtitle">Explorador Urbano & Navegación</p>
          <span class="ios-hero-badge">Versión 1.0.0</span>
        </div>

        <!-- Grupo: Autoría y Créditos -->
        <div class="ios-group-label">AUTORÍA Y DESARROLLO</div>
        <div class="ios-grouped-card">
          <div class="ios-cell">
            <div class="ios-cell-icon" style="background: #007aff">
              <ion-icon :icon="person" />
            </div>
            <div class="ios-cell-body">
              <span class="ios-cell-title">Desarrollado por</span>
              <span class="ios-cell-value author-highlight">Nicolás Nieto</span>
            </div>
          </div>

          <div class="ios-cell-divider"></div>

          <div class="ios-cell">
            <div class="ios-cell-icon" style="background: #5856d6">
              <ion-icon :icon="sparkles" />
            </div>
            <div class="ios-cell-body">
              <span class="ios-cell-title">Edición</span>
              <span class="ios-cell-value">iOS Pro Design</span>
            </div>
          </div>
        </div>

        <!-- Grupo: Funcionalidades del Sistema -->
        <div class="ios-group-label">CAPACIDADES DEL MAPA</div>
        <div class="ios-grouped-card">
          <div class="ios-cell">
            <div class="ios-cell-icon" style="background: #ff9500">
              <ion-icon :icon="location" />
            </div>
            <div class="ios-cell-body">
              <span class="ios-cell-title">Puntos de Interés</span>
              <span class="ios-cell-value">22 predefinidos</span>
            </div>
          </div>

          <div class="ios-cell-divider"></div>

          <div class="ios-cell">
            <div class="ios-cell-icon" style="background: #34c759">
              <ion-icon :icon="navigate" />
            </div>
            <div class="ios-cell-body">
              <span class="ios-cell-title">Rastreo GPS</span>
              <span class="ios-cell-value">Tiempo real</span>
            </div>
          </div>

          <div class="ios-cell-divider"></div>

          <div class="ios-cell">
            <div class="ios-cell-icon" style="background: #00c7be">
              <ion-icon :icon="walk" />
            </div>
            <div class="ios-cell-body">
              <span class="ios-cell-title">Rutas Peatonales</span>
              <span class="ios-cell-value">OSRM Routing</span>
            </div>
          </div>

          <div class="ios-cell-divider"></div>

          <div class="ios-cell">
            <div class="ios-cell-icon" style="background: #ff2d55">
              <ion-icon :icon="camera" />
            </div>
            <div class="ios-cell-body">
              <span class="ios-cell-title">Registro Multimedia</span>
              <span class="ios-cell-value">Cámara y Fototeca</span>
            </div>
          </div>

          <div class="ios-cell-divider"></div>

          <div class="ios-cell">
            <div class="ios-cell-icon" style="background: #af52de">
              <ion-icon :icon="layers" />
            </div>
            <div class="ios-cell-body">
              <span class="ios-cell-title">Capas Cartográficas</span>
              <span class="ios-cell-value">4 estilos disponibles</span>
            </div>
          </div>
        </div>

        <!-- Grupo: Arquitectura y Tecnologías -->
        <div class="ios-group-label">TECNOLOGÍA</div>
        <div class="ios-grouped-card">
          <div class="ios-cell">
            <div class="ios-cell-icon" style="background: #32ade6">
              <ion-icon :icon="codeSlash" />
            </div>
            <div class="ios-cell-body">
              <span class="ios-cell-title">Framework</span>
              <span class="ios-cell-value">Ionic 9 · Vue 3</span>
            </div>
          </div>

          <div class="ios-cell-divider"></div>

          <div class="ios-cell">
            <div class="ios-cell-icon" style="background: #30d158">
              <ion-icon :icon="mapOutline" />
            </div>
            <div class="ios-cell-body">
              <span class="ios-cell-title">Motor de Mapas</span>
              <span class="ios-cell-value">Leaflet · CARTO · OSM</span>
            </div>
          </div>

          <div class="ios-cell-divider"></div>

          <div class="ios-cell">
            <div class="ios-cell-icon" style="background: #007aff">
              <ion-icon :icon="phonePortrait" />
            </div>
            <div class="ios-cell-body">
              <span class="ios-cell-title">Plataforma Nativa</span>
              <span class="ios-cell-value">Capacitor 8</span>
            </div>
          </div>
        </div>

        <!-- Pie de página legal estilo iOS -->
        <div class="ios-footer-legal">
          <p>© 2026 Nicolás Nieto</p>
          <p>Bogotá D.C., Colombia · Todos los derechos reservados</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonBackButton, IonButtons, IonIcon
} from '@ionic/vue';
import {
  map, person, sparkles, location, navigate, walk, camera,
  layers, codeSlash, mapOutline, phonePortrait
} from 'ionicons/icons';
</script>

<style scoped>
.ios-settings-toolbar {
  --background: var(--mx-surface);
  --border-width: 0;
  border-bottom: 0.5px solid var(--mx-separator);
}

.ios-back-btn {
  --color: var(--mx-blue);
  font-size: 17px;
}

.ios-settings-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--mx-text);
  letter-spacing: -0.2px;
}

.ios-settings-bg {
  --background: var(--mx-bg);
}

.ios-settings-container {
  max-width: 580px;
  margin: 0 auto;
  padding: 24px 16px 48px;
}

/* App Hero */
.ios-app-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 28px;
}

.ios-app-icon-wrap {
  margin-bottom: 14px;
}

.ios-app-icon {
  width: 76px;
  height: 76px;
  border-radius: 18px;
  background: linear-gradient(135deg, #007aff 0%, #0051ba 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 40px;
  box-shadow: 0 10px 24px rgba(0, 122, 255, 0.3), 0 2px 6px rgba(0, 0, 0, 0.1);
}

.ios-hero-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.4px;
  color: var(--mx-text);
  margin: 0 0 4px;
}

.ios-hero-subtitle {
  font-size: 15px;
  color: var(--mx-text-2);
  margin: 0 0 10px;
}

.ios-hero-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  background: var(--mx-fill);
  color: var(--mx-text-2);
  font-size: 12px;
  font-weight: 500;
}

/* Grouped List */
.ios-group-label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: var(--mx-text-2);
  margin: 22px 14px 7px;
  text-transform: uppercase;
}

.ios-grouped-card {
  background: var(--mx-surface);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.ios-cell {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 14px;
}

.ios-cell-icon {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 17px;
  flex-shrink: 0;
}

.ios-cell-body {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ios-cell-title {
  font-size: 16px;
  color: var(--mx-text);
  font-weight: 400;
}

.ios-cell-value {
  font-size: 15px;
  color: var(--mx-text-2);
  font-weight: 400;
}

.author-highlight {
  color: var(--mx-blue);
  font-weight: 600;
}

.ios-cell-divider {
  height: 0.5px;
  background: var(--mx-separator);
  margin-left: 60px;
}

/* Footer Legal */
.ios-footer-legal {
  margin-top: 36px;
  text-align: center;
  color: var(--mx-text-3);
  font-size: 12px;
  line-height: 1.5;
}

.ios-footer-legal p {
  margin: 0;
}
</style>
