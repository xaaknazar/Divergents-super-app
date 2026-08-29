import type { ExpoConfig } from 'expo/config';

const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_KEY?.trim();

const config: ExpoConfig = {
  name: 'Divergents Superapp',
  slug: 'divergents-super-app',
  owner: 'xaknazar',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'divergents',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  icon: './assets/icon.png',
  splash: { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#234088' },
  ios: {
    supportsTablet: true,
    usesAppleSignIn: true,
    bundleIdentifier: 'kz.divergents.app',
    // Pinned so a LOCAL build (eas build --local) produces an explicit number
    // instead of asking the EAS server. Bump this for every new TestFlight upload.
    buildNumber: '44',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ['audio'],
      NSLocationWhenInUseUsageDescription: 'Divergents использует геолокацию, чтобы показывать вас на карте и строить маршрут до мест сообщества.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Divergents использует геолокацию, чтобы показывать вас на карте и строить маршрут до мест сообщества.',
      NSPhotoLibraryUsageDescription: 'Divergents использует фото, чтобы прикреплять снимки к местам на карте сообщества.',
      NSPhotoLibraryAddUsageDescription: 'Divergents сохраняет фото в вашу медиатеку при работе с местами на карте сообщества.',
      NSCameraUsageDescription: 'Divergents использует камеру, чтобы делать снимки для мест на карте сообщества.',
      NSMicrophoneUsageDescription: 'Divergents использует микрофон для записи голосовых постов в каналах.',
      CFBundleDisplayName: 'Divergents Superapp',
    },
  },
  android: {
    package: 'kz.divergents.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundImage: './assets/icon-bg.png',
      backgroundColor: '#234088',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'CAMERA'],
    ...(googleMapsApiKey ? { config: { googleMaps: { apiKey: googleMapsApiKey } } } : {}),
  },
  web: { bundler: 'metro' },
  plugins: [
    ['expo-location', { locationWhenInUsePermission: 'Divergents использует геолокацию, чтобы показывать вас на карте и строить маршрут до мест сообщества.' }],
    ['expo-image-picker', {
      photosPermission: 'Divergents использует фото, чтобы прикреплять снимки к местам на карте сообщества.',
      cameraPermission: 'Divergents использует камеру, чтобы делать снимки для мест на карте сообщества.',
    }],
    'expo-localization',
    '@maplibre/maplibre-react-native',
    'expo-notifications',
  ],
  extra: { eas: { projectId: '82fb2253-cb48-4275-853e-c39b13b41e80' } },
};

export default config;
