<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar class="custom-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" color="light" />
        </ion-buttons>
        <ion-title>Créditos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="credits-bg">
      <div class="credits-container">
        <div class="credits-card">
          <div class="avatar">
            <ion-icon :icon="personCircleOutline" class="avatar-icon" />
          </div>
          <h1 class="app-name">Mapa Bogotá</h1>
          <p class="app-subtitle">Explorador interactivo de la ciudad</p>
          <div class="divider"></div>
          <p class="credit-label">Desarrollado por</p>
          <h2 class="author-name">Nicolás Nieto</h2>
          <div class="divider"></div>
          <div class="info-section">
            <div class="info-item">
              <ion-icon :icon="codeSlashOutline" />
              <span>Ionic + Vue + Leaflet</span>
            </div>
            <div class="info-item">
              <ion-icon :icon="mapOutline" />
              <span>OpenStreetMap & OSRM</span>
            </div>
            <div class="info-item">
              <ion-icon :icon="locationOutline" />
              <span>22 Puntos de Interés</span>
            </div>
            <div class="info-item">
              <ion-icon :icon="navigateOutline" />
              <span>GPS en tiempo real</span>
            </div>
            <div class="info-item">
              <ion-icon :icon="walkOutline" />
              <span>Rutas peatonales con duración</span>
            </div>
          </div>
          <div class="divider"></div>
          <p class="version">Versión 1.0.0</p>
          <p class="year">© 2026 Nicolás Nieto</p>
          <p class="year">Todos los derechos reservados</p>
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
  personCircleOutline, codeSlashOutline, mapOutline,
  locationOutline, navigateOutline, walkOutline
} from 'ionicons/icons';
</script>

<style scoped>
.custom-toolbar {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  --color: #e0e0e0;
}

.credits-bg {
  --background: #0f0f23;
}

.credits-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  padding: 20px;
}

.credits-card {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 24px;
  padding: 40px 30px;
  text-align: center;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 12px 40px rgba(0, 210, 255, 0.08), 0 4px 16px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 210, 255, 0.15);
}

.avatar {
  margin-bottom: 16px;
}

.avatar-icon {
  font-size: 80px;
  color: #00d2ff;
}

.app-name {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 4px;
}

.app-subtitle {
  font-size: 13px;
  color: #8892b0;
  margin: 0 0 8px;
}

.divider {
  height: 2px;
  background: linear-gradient(to right, transparent, #00d2ff, transparent);
  margin: 18px 0;
}

.credit-label {
  font-size: 12px;
  color: #8892b0;
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 3px;
}

.author-name {
  font-size: 30px;
  font-weight: 700;
  background: linear-gradient(135deg, #00d2ff, #e91e63);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #ccd6f6;
}

.info-item ion-icon {
  font-size: 20px;
  color: #00d2ff;
}

.version {
  font-size: 14px;
  color: #8892b0;
  margin: 0 0 4px;
}

.year {
  font-size: 12px;
  color: #5a6380;
  margin: 0;
}
</style>
