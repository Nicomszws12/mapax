import { shallowMount } from '@vue/test-utils';
import HomePage from '@/views/HomePage.vue';
import { describe, expect, test, vi } from 'vitest';

vi.mock('leaflet', () => {
  const mockLayerGroup = {
    addTo: vi.fn().mockReturnThis(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    hasLayer: vi.fn().mockReturnValue(false),
    remove: vi.fn(),
  };
  const mockMap = {
    on: vi.fn(),
    flyTo: vi.fn(),
    panTo: vi.fn(),
    flyToBounds: vi.fn(),
    getZoom: vi.fn().mockReturnValue(14),
    getCenter: vi.fn().mockReturnValue({ lat: 4.6097, lng: -74.0817 }),
    invalidateSize: vi.fn(),
    closePopup: vi.fn(),
    remove: vi.fn(),
  };
  return {
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn(() => ({ addTo: vi.fn().mockReturnThis(), remove: vi.fn() })),
    layerGroup: vi.fn(() => mockLayerGroup),
    marker: vi.fn(() => ({
      bindPopup: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      setLatLng: vi.fn().mockReturnThis(),
      getElement: vi.fn(),
    })),
    circle: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      setLatLng: vi.fn().mockReturnThis(),
      setRadius: vi.fn().mockReturnThis(),
    })),
    polyline: vi.fn(() => ({})),
    divIcon: vi.fn(() => ({})),
    latLng: vi.fn((lat: number, lng: number) => ({ lat, lng })),
    latLngBounds: vi.fn(() => ({})),
    point: vi.fn((x: number, y: number) => ({ x, y })),
    control: {
      attribution: vi.fn(() => ({ addTo: vi.fn() })),
    },
    DomEvent: {
      disableClickPropagation: vi.fn(),
    },
  };
});

vi.mock('@ionic/vue', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@ionic/vue');
  return {
    ...actual,
    useIonRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      canGoBack: () => false,
    }),
    alertController: {
      create: vi.fn().mockResolvedValue({ present: vi.fn() }),
    },
    toastController: {
      create: vi.fn().mockResolvedValue({ present: vi.fn() }),
    },
  };
});

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    checkPermissions: vi.fn().mockResolvedValue({ location: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ location: 'granted' }),
    getCurrentPosition: vi.fn().mockResolvedValue({
      coords: { latitude: 4.6097, longitude: -74.0817, accuracy: 10 },
    }),
    watchPosition: vi.fn().mockResolvedValue('watch-123'),
    clearWatch: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    createChannel: vi.fn().mockResolvedValue(undefined),
    schedule: vi.fn().mockResolvedValue({ notifications: [] }),
  },
}));

describe('HomePage.vue', () => {
  test('monta el componente correctamente', () => {
    const wrapper = shallowMount(HomePage);
    expect(wrapper.exists()).toBe(true);
  });
});
