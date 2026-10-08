<template>
  <ion-page>
    <ion-header class="ion-no-border header-credits">
      <ion-toolbar class="toolbar-credits">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" text="" class="btn-back-credits" />
        </ion-buttons>
        <ion-title class="title-credits">Información y Créditos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="content-credits">
      <div class="credits-container">
        <!-- Tarjeta Hero de la App (Figma Navigation Kit Style) -->
        <div class="app-hero-card">
          <div class="hero-icon-wrap">
            <div class="hero-icon">
              <img src="/assets/logoMapx.png" alt="Logo MapX Bogotá" class="hero-logo-img" />
            </div>
          </div>
          <h1 class="hero-title">MapX Bogotá</h1>
          <p class="hero-subtitle">Navegación Urbana & Puntos de Interés</p>
          <div class="hero-badge-wrap">
            <span class="hero-badge">Versión 1.0.0 · Edición Multiplataforma</span>
          </div>
        </div>

        <!-- Grupo: Autoría y Desarrollo -->
        <div class="group-header">
          <span class="group-title">Autoría y Desarrollo</span>
        </div>
        <div class="card-section">
          <div class="cell-row">
            <div class="cell-glyph" style="background: var(--ion-color-primary)">
              <ion-icon :icon="person" />
            </div>
            <div class="cell-content">
              <span class="cell-label">Desarrollado por</span>
              <span class="cell-value author-name">Nicolás Nieto</span>
            </div>
          </div>

          <div class="cell-divider"></div>

          <div class="cell-row">
            <div class="cell-glyph" style="background: #6366f1">
              <ion-icon :icon="sparkles" />
            </div>
            <div class="cell-content">
              <span class="cell-label">Diseño</span>
              <span class="cell-value">Universal Mobile UI Kit</span>
            </div>
          </div>
        </div>

        <!-- Grupo: Capacidades del Sistema -->
        <div class="group-header">
          <span class="group-title">Capacidades del Mapa</span>
        </div>
        <div class="card-section">
          <div class="cell-row">
            <div class="cell-glyph" style="background: #f59e0b">
              <ion-icon :icon="location" />
            </div>
            <div class="cell-content">
              <span class="cell-label">Puntos de Interés</span>
              <span class="cell-value">22 predefinidos</span>
            </div>
          </div>

          <div class="cell-divider"></div>

          <div class="cell-row">
            <div class="cell-glyph" style="background: #10b981">
              <ion-icon :icon="navigate" />
            </div>
            <div class="cell-content">
              <span class="cell-label">Rastreo GPS</span>
              <span class="cell-value">Tiempo real</span>
            </div>
          </div>

          <div class="cell-divider"></div>

          <div class="cell-row">
            <div class="cell-glyph" style="background: #06b6d4">
              <ion-icon :icon="walk" />
            </div>
            <div class="cell-content">
              <span class="cell-label">Rutas Peatonales</span>
              <span class="cell-value">OSRM Routing</span>
            </div>
          </div>

          <div class="cell-divider"></div>

          <div class="cell-row">
            <div class="cell-glyph" style="background: #ec4899">
              <ion-icon :icon="camera" />
            </div>
            <div class="cell-content">
              <span class="cell-label">Registro Multimedia</span>
              <span class="cell-value">Cámara y Galería</span>
            </div>
          </div>

          <div class="cell-divider"></div>

          <div class="cell-row">
            <div class="cell-glyph" style="background: #8b5cf6">
              <ion-icon :icon="layers" />
            </div>
            <div class="cell-content">
              <span class="cell-label">Capas Cartográficas</span>
              <span class="cell-value">OSM & Esri ArcGIS</span>
            </div>
          </div>
        </div>

        <!-- Grupo: Tecnologías -->
        <div class="group-header">
          <span class="group-title">Tecnología</span>
        </div>
        <div class="card-section">
          <div class="cell-row">
            <div class="cell-glyph" style="background: #0284c7">
              <ion-icon :icon="codeSlash" />
            </div>
            <div class="cell-content">
              <span class="cell-label">Framework</span>
              <span class="cell-value">Ionic 9 · Vue 3</span>
            </div>
          </div>

          <div class="cell-divider"></div>

          <div class="cell-row">
            <div class="cell-glyph" style="background: #059669">
              <ion-icon :icon="mapOutline" />
            </div>
            <div class="cell-content">
              <span class="cell-label">Motor de Mapas</span>
              <span class="cell-value">Leaflet · Esri · OSM</span>
            </div>
          </div>

          <div class="cell-divider"></div>

          <div class="cell-row">
            <div class="cell-glyph" style="background: var(--ion-color-primary)">
              <ion-icon :icon="phonePortrait" />
            </div>
            <div class="cell-content">
              <span class="cell-label">Plataforma Nativa</span>
              <span class="cell-value">Capacitor 8</span>
            </div>
          </div>
        </div>

        <!-- Grupo: Derechos de Autor y Atribución Cartográfica -->
        <div class="group-header">
          <span class="group-title">Derechos de Autor y Atribución</span>
        </div>
        <div class="card-section">
          <div class="cell-row">
            <div class="cell-glyph" style="background: #10b981">
              <ion-icon :icon="globeOutline" />
            </div>
            <div class="cell-content-col">
              <div class="cell-row-header">
                <span class="cell-label">OpenStreetMap</span>
                <span class="cell-tag">ODbL</span>
              </div>
              <span class="cell-subdesc">© Colaboradores de OpenStreetMap · Datos cartográficos libres y abiertos</span>
            </div>
          </div>

          <div class="cell-divider"></div>

          <div class="cell-row">
            <div class="cell-glyph" style="background: #0284c7">
              <ion-icon :icon="earthOutline" />
            </div>
            <div class="cell-content-col">
              <div class="cell-row-header">
                <span class="cell-label">Esri ArcGIS</span>
                <span class="cell-tag">GIS</span>
              </div>
              <span class="cell-subdesc">© Esri, Maxar, Earthstar Geographics, USGS · Capas satelitales y minimal</span>
            </div>
          </div>

          <div class="cell-divider"></div>

          <div class="cell-row">
            <div class="cell-glyph" style="background: #e11d48">
              <ion-icon :icon="navigateOutline" />
            </div>
            <div class="cell-content-col">
              <div class="cell-row-header">
                <span class="cell-label">TomTom</span>
                <span class="cell-tag">Routing & Search</span>
              </div>
              <span class="cell-subdesc">© TomTom NV · Geocodificación y cálculo de rutas con tráfico en tiempo real</span>
            </div>
          </div>

          <div class="cell-divider"></div>

          <div class="cell-row">
            <div class="cell-glyph" style="background: #8b5cf6">
              <ion-icon :icon="shieldCheckmarkOutline" />
            </div>
            <div class="cell-content-col">
              <div class="cell-row-header">
                <span class="cell-label">Leaflet</span>
                <span class="cell-tag">BSD-2</span>
              </div>
              <span class="cell-subdesc">© Volodymyr Agafonkin · Motor de mapas web interactivo</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-legal">
          <p>© 2026 Nicolás Nieto</p>
          <p>Bogotá D.C., Colombia · Navegación Móvil Multiplataforma</p>
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
  layers, codeSlash, mapOutline, phonePortrait,
  globeOutline, earthOutline, navigateOutline, shieldCheckmarkOutline
} from 'ionicons/icons';
</script>

<style scoped>
.header-credits {
  border-bottom: 1px solid var(--mx-border);
}

.toolbar-credits {
  --background: var(--mx-surface);
  --color: var(--mx-text);
  --border-width: 0;
}

.btn-back-credits {
  --color: var(--mx-text);
}

.title-credits {
  font-size: 17px;
  font-weight: 600;
  color: var(--mx-text);
}

.content-credits {
  --background: var(--mx-bg);
}

.credits-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px 16px 40px;
}

/* App Hero Card */
.app-hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 16px;
  margin-bottom: 24px;
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  border-radius: var(--mx-radius, 12px);
  box-shadow: var(--mx-shadow-sm);
}

.hero-icon-wrap {
  margin-bottom: 12px;
}

.hero-icon {
  width: 76px;
  height: 76px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16);
  border: 1px solid var(--mx-border);
}

.hero-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--mx-text);
  margin: 0 0 4px;
  letter-spacing: -0.3px;
}

.hero-subtitle {
  font-size: 14px;
  color: var(--mx-text-2);
  margin: 0 0 12px;
}

.hero-badge-wrap {
  display: flex;
  justify-content: center;
}

.hero-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  background: var(--mx-fill);
  border: 1px solid var(--mx-border-subtle);
  color: var(--mx-text-2);
  font-size: 12px;
  font-weight: 500;
}

/* Group Headers & Cards */
.group-header {
  margin: 16px 4px 8px;
}

.group-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--mx-text-2);
  text-transform: uppercase;
}

.card-section {
  background: var(--mx-surface);
  border: 1px solid var(--mx-border);
  border-radius: var(--mx-radius, 12px);
  box-shadow: var(--mx-shadow-sm);
  overflow: hidden;
}

.cell-row {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  gap: 12px;
}

.cell-glyph {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: var(--mx-shadow-sm);
}

.cell-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cell-label {
  font-size: 15px;
  color: var(--mx-text);
  font-weight: 500;
}

.cell-value {
  font-size: 14px;
  color: var(--mx-text-2);
  font-weight: 500;
}

.author-name {
  color: var(--ion-color-primary);
  font-weight: 600;
}

.cell-content-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cell-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cell-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--mx-text-2);
  background: var(--mx-fill);
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid var(--mx-border-subtle);
}

.cell-subdesc {
  font-size: 12px;
  color: var(--mx-text-2);
  line-height: 1.35;
}

.cell-divider {
  height: 1px;
  background: var(--mx-border-subtle);
  margin-left: 58px;
}

/* Footer Legal */
.footer-legal {
  margin-top: 32px;
  text-align: center;
  color: var(--mx-text-3);
  font-size: 12px;
  line-height: 1.5;
}

.footer-legal p {
  margin: 0;
}
</style>
