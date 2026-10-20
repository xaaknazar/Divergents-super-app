import { readFileSync } from 'fs';
import { join } from 'path';

const source = (path: string) => readFileSync(join(__dirname, '../../..', path), 'utf8');
test('QA app, monitor and widget all explicitly use the QA namespace', () => {
  const project = source('native-tests/reading-focus/project.yml');
  expect(project.match(/DivergentsReadingFocusQA: true/g)).toHaveLength(3);
  for (const target of ['DivergentsReadingQA', 'ReadingFocusMonitor', 'ReadingFocusWidget']) {
    const targetBody = project.split(`  ${target}:\n`)[1]?.split(/\n  [A-Za-z]+:\n/)[0];
    expect(targetBody).toContain('DivergentsReadingFocusQA: true');
  }
  expect(source('plugins/withReadingFocus.js')).not.toContain('DivergentsReadingFocusQA');
});
test('QA isolates disk, monitoring and shields, while production keeps its original namespace', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  expect(store).toContain('isQA ? "divergents.reading.qa" : "divergents.reading"');
  expect(store).toContain('DeviceActivityName(storeName)');
  expect(store).toContain('ManagedSettingsStore(named: .init(storeName))');
  expect(store).toContain('if !isQA { return url }');
  expect(store).toContain('url.appendingPathComponent("qa", isDirectory: true)');
  expect(source('native-tests/reading-focus/ReadingQAApp.swift')).toContain('value.accountId == "qa-no-real-account", value.deviceId == "qa-iphone"');
});
