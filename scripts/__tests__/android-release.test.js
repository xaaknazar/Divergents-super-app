const { checkAndroidRelease } = require('../check-android-release.cjs');

test.each(['production', 'production-reading'])('blocks Android %s without a map key', profile => {
  for (const key of [undefined, '', '   ']) {
    expect(() => checkAndroidRelease({ EAS_BUILD_PLATFORM: 'android', EAS_BUILD_PROFILE: profile, GOOGLE_MAPS_ANDROID_KEY: key })).toThrow('GOOGLE_MAPS_ANDROID_KEY');
  }
});
test('allows a configured Android release without logging its key', () => {
  expect(() => checkAndroidRelease({ EAS_BUILD_PLATFORM: 'android', EAS_BUILD_PROFILE: 'production-reading', GOOGLE_MAPS_ANDROID_KEY: 'synthetic-configured-key' })).not.toThrow();
});
test('does not affect iOS, development, or local config evaluation', () => {
  for (const env of [{}, { EAS_BUILD_PLATFORM: 'ios', EAS_BUILD_PROFILE: 'production-reading' }, { EAS_BUILD_PLATFORM: 'android', EAS_BUILD_PROFILE: 'development' }]) {
    expect(() => checkAndroidRelease(env)).not.toThrow();
  }
});
