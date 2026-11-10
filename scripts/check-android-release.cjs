// Stop a release before native compilation if the Android map cannot be configured.
function checkAndroidRelease(env = process.env) {
  if (env.EAS_BUILD_PLATFORM !== 'android') return;
  if (!['production', 'production-reading'].includes(env.EAS_BUILD_PROFILE)) return;
  if (!env.GOOGLE_MAPS_ANDROID_KEY?.trim()) {
    throw new Error('Android-релиз остановлен: задайте GOOGLE_MAPS_ANDROID_KEY в окружении сборки. Нельзя отправлять приложение с ненастроенной картой.');
  }
}

module.exports = { checkAndroidRelease };
if (require.main === module) {
  try { checkAndroidRelease(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
