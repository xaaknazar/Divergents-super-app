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
test('strict QA is opt-in and cannot change the namespace used to release protection', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  const project = source('native-tests/reading-focus/project.yml');
  expect(store).toContain('strictQA: Bool { isQA && Bundle.main.object(forInfoDictionaryKey: "DivergentsReadingStrictQA") as? Bool == true }');
  expect(store).toContain('isQA && !strictQA ? "selected" : "all-apps"');
  expect(store).toContain('storeName: String { isQA ? "divergents.reading.qa" : "divergents.reading" }');
  expect(project).not.toContain('DivergentsReadingStrictQA: true');
  expect(source('plugins/withReadingFocus.js')).not.toContain('DivergentsReadingStrictQA');
});

test('new monitors and activity cleanup are session-scoped, while old journals remain readable', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  const monitor = source('modules/reading-focus/extensions/ReadingFocusMonitor.swift');
  expect(store).toContain('var monitoringName: String?');
  expect(store).toContain('var sessionId: String? = nil');
  expect(store).toContain('generation.map { ".\\($0)" }');
  expect(store).toContain('name.rawValue == (session.monitoringName ?? activityName.rawValue)');
  const monitorFinish = store.split('static func finishMonitoredInterval')[1].split('static func snapshot')[0];
  expect(monitorFinish.indexOf('guard session.status == "running" else { return }')).toBeLessThan(monitorFinish.indexOf('captured = matchingActivities'));
  expect(store).toContain('$0.rawValue.hasPrefix("\\(storeName).session.")');
  expect(store).toContain('if !names.isEmpty {');
  expect(store).toContain('center.stopMonitoring(names)');
  expect(store).toContain('$0.attributes.sessionId == sessionId');
  expect(store).toContain('let activitiesToEnd = captured');
  expect(store).toContain('Task { await endActivities(activitiesToEnd) }');
  expect(store).not.toContain('Task { await endActivity() }');
  expect(monitor).toContain('ReadingFocusStore.finishMonitoredInterval(activity)');
  expect(monitor).not.toContain('ReadingFocusStore.pause()');
});

test('foreground reconciliation cannot request a replacement without explicit creation permission', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  const lifecycle = store.split('@MainActor static func liveActivityStatus')[1];
  expect(lifecycle).toContain('createIfMissing: Bool = false');
  expect(lifecycle.indexOf('guard createIfMissing && session.status == "running" else')).toBeLessThan(lifecycle.indexOf('Activity.request('));
  expect(lifecycle).toContain('current.accountId == accountId');
  expect(lifecycle).toContain('current.sessionId == sessionId, current.status == "running"');
  expect(lifecycle).toContain('remaining(current) > 0, hasShield');
  expect(lifecycle).toContain('let activity = try locked');
  expect(lifecycle).not.toContain('try? Activity.request');
  const module = source('modules/reading-focus/ios/ReadingFocusModule.swift');
  expect(module).toContain('AsyncFunction("reconcileLiveActivity")');
  expect(module).toContain('AsyncFunction("restoreLiveActivity")');
  expect(module).toContain('createIfMissing: isNewSession');
});

test('widget pause binds its session and cannot let an unbound old card pause a new journal', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  expect(store).toContain('guard session.sessionId == sessionId else { return }');
  expect(store).toContain('guard session.monitoringName == nil else { return }');
  expect(store).toContain('ReadingFocusStore.pauseFromActivity(sessionId: sessionId, generation: generation)');
  const widget = source('modules/reading-focus/extensions/ReadingFocusWidget.swift');
  expect(widget).toContain('sessionId: context.attributes.sessionId');
  expect(widget).toContain('PauseReadingIntent(sessionId: sessionId, generation: state.generation)');
  expect(widget).toContain('ResumeReadingIntent(sessionId: sessionId, generation: state.generation)');
});

test('QA observes the same lifecycle helper without automatically recreating a missing card', () => {
  const qa = source('native-tests/reading-focus/ReadingQAApp.swift');
  expect(qa).not.toContain('Activity.request');
  expect(qa).toContain('ReadingFocusStore.liveActivityStatus');
  expect(qa).toContain('await refresh("foreground")');
  expect(qa).toContain('activity.activityStateUpdates');
  expect(qa).toContain('reading-live-diagnostics.json');
  expect(qa).toContain('guard ReadingFocusStore.isQA');
  expect(qa).toContain('Вернуть карточку на экран блокировки');
  expect(qa).toContain('Включить строгую блокировку?');
});

test('pause keeps the current card and asynchronous content updates converge to the latest journal revision', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  expect(store).toContain('var status: String? = nil');
  expect(store).toContain('var pausedRemainingMs: Double? = nil');
  const userPause = store.split('static func pauseAndUpdateActivity')[1].split('static func endLiveActivities')[0];
  expect(userPause).toContain('refreshActivities(result.activities, session: session)');
  expect(userPause).not.toContain('endActivities(');
  const reconcile = store.split('@MainActor static func liveActivityStatus')[1];
  expect(reconcile).toContain('if activity.content.state.status == "paused"');
  expect(reconcile).toContain('refreshActivities([activity], session: session)');
  expect(reconcile).not.toContain('await activity.update(');
  expect(store).toContain('pausedRemainingMs: session.status == "paused" ? remainingToGoal : nil');
  expect(store).toContain('if sameRevision(desired, after) { break }');
  expect(store).toContain('desired = after');
});

test('acknowledgement closes only the saved approach card, including a partial book, without ending a later session', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  const acknowledge = store.split('static func acknowledge')[1].split('static func endActivities')[0];
  expect(acknowledge).not.toContain('value.targetMs');
  expect(acknowledge).toContain('value.accountId == accountId, value.sessionId == sessionId');
  expect(acknowledge).toContain('value.resumeVersion != 1 || value.terminal == true');
  expect(acknowledge).toContain('completedActivities = matchingActivities(sessionId: sessionId)');
  expect(acknowledge.indexOf('completedActivities = matchingActivities')).toBeLessThan(acknowledge.indexOf('removeItem'));
  expect(acknowledge).toContain('let activitiesToEnd = completedActivities');
  expect(acknowledge).toContain('Task { await endActivities(activitiesToEnd) }');
  expect(acknowledge).not.toContain('Activity<ReadingActivityAttributes>.activities');
  expect(store).toContain('$0.attributes.accountId == accountId && $0.attributes.sessionId != nil && $0.attributes.sessionId != sessionId');
  expect(store).toContain('await endActivities(priorSessions)');
  const replacement = store.split('let priorSessions =')[1].split('// No suspension')[0];
  expect(replacement).not.toContain('content.state.status');
  const qa = source('native-tests/reading-focus/ReadingQAApp.swift');
  expect(qa).toContain('await observeSessionChanges()');
  expect(qa).toContain('current?.status != session?.status');
  expect(qa).toContain('try await ReadingFocusStore.endLiveActivities()');
});

test('sign-out explicitly removes all own-app cards without acknowledging or deleting evidence', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  const cleanup = store.split('static func endLiveActivities()')[1].split('static func activityState')[0];
  expect(cleanup).toContain('captured = Activity<ReadingActivityAttributes>.activities');
  expect(cleanup).toContain('try locked');
  expect(cleanup).toContain('releaseProtection()');
  expect(cleanup).toContain('pauseLocked(session, wasShielded: wasShielded, authorization: auth, terminal: true)');
  expect(cleanup).toContain('await endActivities(captured)');
  expect(cleanup).not.toContain('removeItem');
  expect(cleanup).not.toContain('acknowledge(');
  expect(source('modules/reading-focus/ios/ReadingFocusModule.swift')).toContain('AsyncFunction("endLiveActivities")');
});

test('intentional pause release is serialized with snapshot and lock/read failures still release protection', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  const pause = store.split('private static func pauseWithActivities')[1].split('private static func pauseLocked')[0];
  const beforeLock = pause.split('return try locked')[0];
  expect(beforeLock).not.toContain('releaseProtection()');
  const lockedBody = pause.split('return try locked')[1].split('} catch {')[0];
  expect(lockedBody.indexOf('let wasShielded = hasShield')).toBeLessThan(lockedBody.indexOf('releaseProtection()'));
  expect(lockedBody.indexOf('releaseProtection()')).toBeLessThan(lockedBody.indexOf('try read()'));
  expect(pause.split('} catch {')[1]).toContain('releaseProtection()');
  expect(lockedBody).not.toContain('await ');
});

test('resumable sessions have a fixed deadline, generation-bound controls, terminal-only acknowledgement and immutable sealed evidence', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  expect(store).toContain('deadlineMs: anchor + budgetMs');
  expect(store).toContain('next.anchorMs = uptimeMs(); next.accumulatedMs = current.elapsedMs ?? current.accumulatedMs ?? 0');
  expect(store).toContain('next.generation = UUID().uuidString');
  expect(store).toContain('current.resumeVersion == 1, current.terminal == false');
  expect(store).toContain('guard let generation, current.generation == generation else');
  expect(store).toContain('guard value.resumeVersion != 1 || value.terminal == true else');
  expect(store).toContain('if value.status == "paused" && (value.terminal == true || value.resumeVersion != 1) { return value }');
  const module = source('modules/reading-focus/ios/ReadingFocusModule.swift');
  expect(module).toContain('AsyncFunction("resume")');
  expect(module).toContain('AsyncFunction("finish")');
  expect(module.match(/expectedGeneration: String/g)).toHaveLength(2);
  const qa = source('native-tests/reading-focus/ReadingQAApp.swift');
  expect(qa).toContain('encoder.encode($0.content.state)');
  expect(qa).toContain('activity.contentUpdates');
});

test('lock-screen pause never treats an unresolved cold-process authorization as revocation', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  const pauseFromActivity = store.split('static func pauseFromActivity')[1].split('static func resumeFromActivity')[0];
  expect(pauseFromActivity).toContain('pauseLocked(session, wasShielded: wasShielded, authorization: .unknown)');
  expect(pauseFromActivity).not.toContain('authorization()');
  const pauseLocked = store.split('private static func pauseLocked')[1].split('static func resume(')[0];
  expect(pauseLocked).toContain('if auth == .denied || !wasShielded { value.integrity = "revoked" }');
  expect(pauseLocked).not.toContain('auth != .approved');
  const resume = store.split('static func resume(')[1].split('static func finish(')[0];
  expect(resume).toContain('let auth = await resolvedAuthorization()');
  expect(resume.indexOf('if auth == .unknown')).toBeLessThan(resume.indexOf('applyProtection(next)'));
  expect(store).toContain('AuthorizationCenter.shared.$authorizationStatus.values');
  expect(store).toContain('Thread.isMainThread ? readOnMain() : DispatchQueue.main.sync(execute: readOnMain)');
  const module = source('modules/reading-focus/ios/ReadingFocusModule.swift');
  expect(module).not.toContain('AuthorizationCenter.shared.authorizationStatus');
  expect(module).toContain('ReadingFocusStore.resolvedAuthorization(timeoutMs: 500)');
});

test('activity refreshes skip identical content and never hop to the main queue', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  const refresh = store.split('static func refreshActivities')[1].split('static func pauseFromActivity')[0];
  expect(refresh).toContain('if sameContent(activity.content.state, state) { break }');
  expect(refresh.indexOf('sameContent(')).toBeLessThan(refresh.indexOf('await activity.update('));
  expect(refresh).not.toMatch(/snapshot\(\)/);
  const same = store.split('static func sameContent')[1].split('private static func sameRevision')[0];
  expect(same).toContain('if lhs.status == "paused" { return lhs.pausedRemainingMs == rhs.pausedRemainingMs }');
});

test('the card shows the Divergents mark and explains a sealed approach instead of hiding resume silently', () => {
  const widget = source('modules/reading-focus/extensions/ReadingFocusWidget.swift');
  expect(widget).toContain('struct DivergentsMark: View');
  expect(widget).toContain('DivergentsMark().frame(width: 30, height: 38)');
  expect(widget).toContain('else if state.terminal == true { self = .finished }');
  expect(widget).toContain('case .finished: return "Подход завершён"');
  const controls = widget.split('struct ReadingActivityControls')[1].split('struct ReadingActivityActionLabel')[0];
  const sealed = controls.split('case .needsApp, .finished:')[1];
  expect(sealed).not.toContain('intent:');
  expect(sealed).toContain('"Открыть"');
  expect(widget).not.toContain('Text(book)');
});

test('monitors are never stopped while the journal lock is held (stopMonitoring waits for the monitor, which needs that lock)', () => {
  const store = source('modules/reading-focus/ios/ReadingFocusStore.swift');
  const release = store.split('static func releaseProtection()')[1].split('static func pause()')[0];
  expect(release.indexOf('if thread[lockDepthKey] != nil')).toBeLessThan(release.indexOf('center.stopMonitoring(names)'));
  const locked = store.split('static func locked<T>')[1].split('static func read()')[0];
  expect(locked.indexOf('flock(fd, LOCK_UN)')).toBeLessThan(locked.indexOf('if outermost { stopDeferredMonitors() }'));
  const deferred = store.split('private static func stopDeferredMonitors()')[1].split('static func read()')[0];
  expect(deferred).toContain('DeviceActivityCenter().stopMonitoring(');
});
