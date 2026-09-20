import type { ExpoConfig } from 'expo/config';

const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_KEY?.trim();

const config: ExpoConfig = {
  name: 'Divergents',
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
    // v1 is verified and marketed for iPhone. Keeping iPad disabled also avoids
    // advertising an untested tablet layout in the initial App Store release.
    supportsTablet: false,
    bundleIdentifier: 'kz.divergents.app',
    // Pinned so a LOCAL build (eas build --local) produces an explicit number
    // instead of asking the EAS server. Bump this for every new TestFlight upload.
    buildNumber: '78',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // audio    — урок продолжает звучать после сворачивания приложения.
      // location — трекер бега и ходьбы пишет маршрут с погашенным экраном.
      //            Без этого iOS обрывает подписку вместе с уходом экрана, и
      //            пробежка обрывалась ровно там, где человек убирал телефон
      //            в карман.
      UIBackgroundModes: ['audio', 'location'],
      NSLocationWhenInUseUsageDescription: 'Divergents использует геолокацию, чтобы показывать вас на карте и строить маршрут до мест сообщества.',
      // Текст видит человек в системном запросе. Он должен объяснять именно
      // фоновый доступ, иначе и человек не понимает, зачем «всегда», и Apple
      // отклоняет сборку на ревью.
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Divergents записывает маршрут вашей пробежки или ходьбы, пока приложение свёрнуто, и показывает вас на карте сообщества.',
      NSLocationAlwaysUsageDescription: 'Divergents записывает маршрут вашей пробежки или ходьбы, пока приложение свёрнуто.',
      NSPhotoLibraryUsageDescription: 'Divergents использует фото, чтобы прикреплять снимки к местам на карте сообщества, добавлять фото в анкету, загружать отчёт Gallup и ставить фон на карточку тренировки.',
      NSPhotoLibraryAddUsageDescription: 'Divergents сохраняет в вашу медиатеку карточку тренировки для сторис и фото мест на карте сообщества.',
      NSCameraUsageDescription: 'Divergents использует камеру, чтобы делать снимки для мест на карте сообщества, фото профиля и снимка отчёта Gallup.',
      NSMicrophoneUsageDescription: 'Divergents использует микрофон для записи голосовых постов в каналах.',
      // Шагомер. Отдельное от геолокации разрешение: iOS считает шаги
      // собственным датчиком, и без этого доступа приложение вынуждено
      // прикидывать их из пройденного расстояния — с погрешностью до четверти.
      NSMotionUsageDescription: 'Divergents считает шаги вашей тренировки датчиком движения — так же, как это делают спортивные часы. Без доступа шаги придётся оценивать по пройденному расстоянию, и число будет менее точным.',
      CFBundleDisplayName: 'Divergents',
    },
  },
  android: {
    package: 'kz.divergents.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundImage: './assets/icon-bg.png',
      backgroundColor: '#234088',
    },
    // FOREGROUND_SERVICE* — для звука, продолжающего играть после сворачивания
    // приложения. Android с 14-й версии убивает такое воспроизведение, если у
    // приложения нет службы переднего плана с типом mediaPlayback.
    // FOREGROUND_SERVICE* — для работы после сворачивания приложения. Android
    // с 14-й версии убивает и звук, и запись маршрута, если у приложения нет
    // службы переднего плана с подходящим типом.
    // ACCESS_BACKGROUND_LOCATION — трекер бега с погашенным экраном.
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'CAMERA',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'FOREGROUND_SERVICE_LOCATION',
      // ACTIVITY_RECOGNITION — доступ к аппаратному счётчику шагов. Начиная с
      // Android 10 без него шагомер молчит.
      'android.permission.ACTIVITY_RECOGNITION',
    ],
    ...(googleMapsApiKey ? { config: { googleMaps: { apiKey: googleMapsApiKey } } } : {}),
  },
  web: { bundler: 'metro' },
  plugins: [
    './plugins/withFmtConstevalWorkaround.js',
    ['expo-location', {
      locationWhenInUsePermission: 'Divergents использует геолокацию, чтобы показывать вас на карте и строить маршрут до мест сообщества.',
      locationAlwaysAndWhenInUsePermission: 'Divergents записывает маршрут вашей пробежки или ходьбы, пока приложение свёрнуто, и показывает вас на карте сообщества.',
      // Включает фоновую геолокацию на нативном уровне. Одних разрешений мало:
      // без этих флагов expo-location не собирает нужные части проекта, и
      // startLocationUpdatesAsync падает в рантайме.
      isIosBackgroundLocationEnabled: true,
      isAndroidBackgroundLocationEnabled: true,
      isAndroidForegroundServiceEnabled: true,
    }],
    ['expo-image-picker', {
      photosPermission: 'Divergents использует фото, чтобы прикреплять снимки к местам на карте сообщества, добавлять фото в анкету, загружать отчёт Gallup и ставить фон на карточку тренировки.',
      cameraPermission: 'Divergents использует камеру, чтобы делать снимки для мест на карте сообщества, фото профиля и снимка отчёта Gallup.',
    }],
    // Сохранение карточки тренировки в галерею. Только запись: читать чужие
    // фото нам незачем, и iOS спросит мягче — «добавлять фото», а не «доступ
    // ко всем фото».
    ['expo-media-library', {
      // Тот же текст, что у image-picker: последний плагин в списке перезаписывает
      // ключ, и короткая формулировка стёрла бы полную.
      photosPermission: 'Divergents использует фото, чтобы прикреплять снимки к местам на карте сообщества, добавлять фото в анкету, загружать отчёт Gallup и ставить фон на карточку тренировки.',
      savePhotosPermission: 'Divergents сохраняет карточку тренировки в вашу галерею, чтобы её можно было выложить в сторис.',
      isAccessMediaLocationEnabled: false,
    }],
    'expo-localization',
    '@maplibre/maplibre-react-native',
    'expo-notifications',
    // Фоновое воспроизведение. Одних флагов у плеера мало: разрешение выдаётся
    // на нативном уровне при сборке — на iOS это режим `audio` в
    // UIBackgroundModes (уже выше), на Android — служба переднего плана,
    // которую заводит этот плагин. Без него звук глохнет при сворачивании,
    // сколько бы `staysActiveInBackground` мы ни выставляли в коде.
    //
    // Картинка-в-картинке идёт заодно: для видеоурока это тот же нативный
    // механизм, и человек может смотреть лекцию поверх других приложений.
    ['expo-video', { supportsBackgroundPlayback: true, supportsPictureInPicture: true }],
  ],
  extra: { eas: { projectId: '82fb2253-cb48-4275-853e-c39b13b41e80' } },
};

export default config;
