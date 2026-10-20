const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { checkReadingArchive, requiredFiles } = require('./check-reading-archive.cjs');

test('reading build refuses incomplete native archive', () => {
  assert.throws(() => checkReadingArchive('/fixture', true, file => !file.endsWith('ReadingFocusStore.swift')), /ReadingFocusStore.swift/);
});
test('complete reading archive passes; disabled mode does not require native files', () => {
  assert.doesNotThrow(() => checkReadingArchive('/fixture', true, () => true));
  assert.doesNotThrow(() => checkReadingArchive('/fixture', false, () => false));
  assert.ok(requiredFiles.length > 0);
});
test('native project exclusions are root-only, preserving local Expo modules', () => {
  for (const name of ['.gitignore', '.easignore']) {
    const lines = readFileSync(resolve(__dirname, '..', name), 'utf8').split(/\r?\n/);
    for (const platform of ['ios', 'android']) {
      assert.ok(lines.includes(`/${platform}/`), name);
      assert.ok(!lines.includes(`${platform}/`), name);
    }
  }
});
