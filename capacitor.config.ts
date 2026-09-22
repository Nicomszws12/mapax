import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nicolasnieto.mapabogota',
  appName: 'Mapa Bogotá',
  webDir: 'dist',
  plugins: {
    Geolocation: {
      permissions: ['location', 'coarseLocation'],
    },
  },
};

export default config;
