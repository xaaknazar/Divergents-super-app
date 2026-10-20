const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

const requiredFiles = [
  'modules/reading-focus/expo-module.config.json',
  'modules/reading-focus/ios/ReadingFocus.podspec',
  'modules/reading-focus/ios/ReadingFocusModule.swift',
  'modules/reading-focus/ios/ReadingFocusStore.swift',
  'modules/reading-focus/ios/PrivacyInfo.xcprivacy',
  'modules/reading-focus/extensions/ReadingFocusMonitor.swift',
  'modules/reading-focus/extensions/ReadingFocusWidget.swift',
];

function checkReadingArchive(root = resolve(__dirname, '..'), enabled = process.env.READING_FOCUS_PILOT === 'true', fileExists = existsSync) {
  if (!enabled) return;
  const missing = requiredFiles.filter(file => !fileExists(resolve(root, file)));
  if (missing.length) throw new Error(`В архиве отсутствуют исходники читательского режима:\n${missing.join('\n')}\nПроверьте .easignore: исключать нужно /ios/ и /android/ только в корне проекта.`);
}

module.exports = { checkReadingArchive, requiredFiles };
if (require.main === module) {
  try { checkReadingArchive(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
