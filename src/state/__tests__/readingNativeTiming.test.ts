import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const swift = readFileSync(join(__dirname, '../../../modules/reading-focus/ios/ReadingFocusStore.swift'), 'utf8');
// Execute the actual Swift timing/control bodies, not a separately translated
// JS model. Only platform services (clock, storage, shields, ActivityKit) are fake.
function declaration(signature: string): string {
  const start = swift.indexOf(signature);
  if (start < 0) throw new Error(`Missing Swift declaration: ${signature}`);
  const opening = swift.indexOf('{', start);
  let depth = 0;
  for (let i = opening; i < swift.length; i += 1) {
    if (swift[i] === '{') depth += 1;
    if (swift[i] === '}' && --depth === 0) return swift.slice(start, i + 1).replace(/^private static/, 'static');
  }
  throw new Error(`Unterminated Swift declaration: ${signature}`);
}

(process.platform === 'darwin' ? test : test.skip)('actual Swift excludes paused time, preserves midnight, rejects stale controls and freezes final evidence', () => {
  const code = `
import Foundation
import Dispatch
${declaration('struct ReadingFocusSession:')}
${declaration('enum ReadingFocusFailure:')}
${declaration('enum ReadingAuthorization:')}
struct DeviceActivityName: Equatable { let rawValue: String; init(_ value: String) { rawValue = value } }
struct ReadingActivityAttributes {}
final class Activity<T> {}
final class AuthorizationCenter {
  enum Status { case notDetermined, approved, denied }
  static let shared = AuthorizationCenter()
  var authorizationStatus: Status = .approved
}
enum Harness {
  static var now: Double = 0
  static var boot = "boot"
  static var journal: ReadingFocusSession?
  static var hasShield = true
  static var readFails = false
  static var applyFails = false
  static let pilotEnabled = true
  static let storeName = "test"
  static let activityName = DeviceActivityName(storeName)
  static func uptimeMs() -> Double { now }
  static func bootId() throws -> String { boot }
  static func locked<T>(_ body: () throws -> T) throws -> T { try body() }
  static func read() throws -> ReadingFocusSession? {
    if readFails { throw ReadingFocusFailure.storage }; return journal
  }
  static func write(_ value: ReadingFocusSession) throws { journal = value }
  static func snapshot(authorization: ReadingAuthorization? = nil) throws -> ReadingFocusSession? { try read() }
  static func trace(_ event: String, _ fields: [String: Any] = [:]) {}
  static func authorization() -> ReadingAuthorization {
    switch AuthorizationCenter.shared.authorizationStatus {
    case .approved: return .approved
    case .denied: return .denied
    case .notDetermined: return .unknown
    }
  }
  static func resolvedAuthorization(timeoutMs: UInt64 = 0) async -> ReadingAuthorization { authorization() }
  static func releaseProtection() { hasShield = false }
  static func applyProtection(_ value: ReadingFocusSession) throws {
    if applyFails { throw ReadingFocusFailure.unavailable }; hasShield = true
  }
  static func matchingActivities(sessionId: String) -> [Activity<ReadingActivityAttributes>] { [] }
  static func endActivities(_ values: [Activity<ReadingActivityAttributes>]) async {}
  static func refreshActivities(_ values: [Activity<ReadingActivityAttributes>], session: ReadingFocusSession) async {}
  ${declaration('static func activityName(for')}
  ${declaration('static func elapsed(')}
  ${declaration('static func remaining(')}
  ${declaration('static func deadlineReached(')}
  ${declaration('private static func pauseLocked(')}
  ${declaration('private static func pauseWithActivities(')}
  ${declaration('static func pause()')}
  ${declaration('static func resume(')}
  ${declaration('static func finish(')}
  ${declaration('static func finishMonitoredInterval(')}
}
func initial(deadline: Double = 200_000) -> ReadingFocusSession {
  ReadingFocusSession(accountId: "a", sessionId: "s", deviceId: "d", book: "b",
    budgetMs: deadline, targetMs: 40_000, anchorMs: 0, bootId: "boot", elapsedMs: nil,
    integrity: "ok", status: "running", blockingMode: "all-apps",
    monitoringName: "test.session.s.initial", resumeVersion: 1, accumulatedMs: 0,
    deadlineMs: deadline, generation: "initial", terminal: false, canResume: false)
}
Task {
  do {
    var result: [String: Any] = [:]
    Harness.journal = initial()
    let oldMonitor = DeviceActivityName(Harness.journal!.monitoringName!)
    Harness.now = 10_000
    let paused = try Harness.pause()!
    result["firstPause"] = paused.elapsedMs!
    Harness.now = 110_000
    result["after100SecondPause"] = Harness.elapsed(paused)
    let resumed = try await Harness.resume(accountId: "a", sessionId: "s", generation: paused.generation)
    Harness.now = 130_000
    result["activeElapsed"] = Harness.elapsed(resumed)
    result["targetRemainingWithPrior20Seconds"] = resumed.targetMs! - Harness.elapsed(resumed)
    result["deadlineRemaining"] = resumed.deadlineMs! - Harness.now
    Harness.finishMonitoredInterval(oldMonitor)
    result["oldMonitorIgnored"] = Harness.journal!.status == "running" && Harness.hasShield
    let repeatedResume = try await Harness.resume(accountId: "a", sessionId: "s", generation: resumed.generation)
    result["repeatResumeDoesNotRebase"] = repeatedResume.anchorMs == resumed.anchorMs
    let againPaused = try Harness.pause()!
    Harness.now = 140_000
    let repeatedPause = try Harness.pause()!
    result["repeatPauseStable"] = repeatedPause.elapsedMs == againPaused.elapsedMs && repeatedPause.generation == againPaused.generation
    let againRunning = try await Harness.resume(accountId: "a", sessionId: "s", generation: repeatedPause.generation)
    do { _ = try await Harness.finish(accountId: "a", sessionId: "s", generation: resumed.generation) }
    catch { result["staleFinishProtected"] = Harness.hasShield && Harness.journal!.terminal == false }
    Harness.now = 145_000
    do { _ = try await Harness.finish(accountId: "a", sessionId: "s", generation: againRunning.generation) }
    catch { result["prematureFinishProtected"] = Harness.hasShield && Harness.journal!.terminal == false }
    Harness.now = 150_000
    let final = try await Harness.finish(accountId: "a", sessionId: "s", generation: againRunning.generation)
    result["finishedActiveElapsed"] = final.elapsedMs!
    Harness.boot = "new-boot"; AuthorizationCenter.shared.authorizationStatus = .denied
    let afterSignout = try Harness.pause()!
    result["terminalEvidenceImmutable"] = afterSignout.elapsedMs == final.elapsedMs && afterSignout.integrity == final.integrity && afterSignout.generation == final.generation
    Harness.boot = "boot"; AuthorizationCenter.shared.authorizationStatus = .approved
    Harness.journal = initial(deadline: 50_000); Harness.now = 10_000; Harness.hasShield = true
    let dayPause = try Harness.pause()!
    Harness.now = 60_000
    do { _ = try await Harness.resume(accountId: "a", sessionId: "s", generation: dayPause.generation) }
    catch { result["midnightCannotExtend"] = Harness.journal!.terminal == true && Harness.journal!.elapsedMs == 10_000 && !Harness.hasShield }
    Harness.journal = initial(); Harness.now = 10_000; Harness.hasShield = true
    let rollbackPause = try Harness.pause()!
    Harness.now = 20_000; Harness.applyFails = true
    do { _ = try await Harness.resume(accountId: "a", sessionId: "s", generation: rollbackPause.generation) }
    catch { result["failedResumeNoCredit"] = Harness.journal!.elapsedMs == 10_000 && Harness.journal!.generation == rollbackPause.generation && Harness.journal!.status == "paused" && !Harness.hasShield }
    Harness.applyFails = false; Harness.journal = initial(); Harness.hasShield = true; Harness.now = 10_000
    // A lock-screen intent in a cold process sees notDetermined: not a revocation.
    let coldPause = try Harness.pauseLocked(Harness.journal!, wasShielded: true, authorization: .unknown)
    result["unknownAuthorizationPauseResumable"] = coldPause.integrity == "ok" && coldPause.terminal == false && coldPause.canResume == true
    AuthorizationCenter.shared.authorizationStatus = .notDetermined; Harness.hasShield = false; Harness.now = 30_000
    do { _ = try await Harness.resume(accountId: "a", sessionId: "s", generation: coldPause.generation) }
    catch { result["unknownAuthorizationNoProtectionKeepsPause"] = !Harness.hasShield && Harness.journal!.terminal == false && Harness.journal!.generation == coldPause.generation }
    AuthorizationCenter.shared.authorizationStatus = .approved
    let warmResume = try await Harness.resume(accountId: "a", sessionId: "s", generation: coldPause.generation)
    Harness.now = 35_000
    result["resumeContinuesFromSavedPlace"] = Harness.elapsed(warmResume) == 15_000 && Harness.hasShield
    let shieldLost = Harness.journal!; Harness.hasShield = false
    let lostPause = try Harness.pauseLocked(shieldLost, wasShielded: false, authorization: .unknown)
    result["missingShieldStillRevokes"] = lostPause.integrity == "revoked" && lostPause.terminal == true && lostPause.canResume == false
    Harness.journal = initial(); Harness.hasShield = true
    do { _ = try await Harness.finish(accountId: "other", sessionId: "s", generation: "initial") }
    catch { result["wrongOwnerDoesNotUnlock"] = Harness.hasShield }
    Harness.readFails = true
    do { _ = try await Harness.finish(accountId: "a", sessionId: "s", generation: "initial") }
    catch { result["storageFailureUnlocks"] = !Harness.hasShield }
    let data = try JSONSerialization.data(withJSONObject: result, options: .sortedKeys)
    print(String(decoding: data, as: UTF8.self)); exit(0)
  } catch { print("Unexpected Swift failure: \\(error)"); exit(1) }
}
dispatchMain()
`;
  const output = execFileSync('xcrun', ['swift', '-swift-version', '5', '-e', code], { encoding: 'utf8', timeout: 45_000 });
  expect(JSON.parse(output.trim())).toEqual({
    firstPause: 10_000, after100SecondPause: 10_000, activeElapsed: 30_000,
    targetRemainingWithPrior20Seconds: 10_000, deadlineRemaining: 70_000,
    unknownAuthorizationPauseResumable: true, unknownAuthorizationNoProtectionKeepsPause: true,
    resumeContinuesFromSavedPlace: true, missingShieldStillRevokes: true,
    oldMonitorIgnored: true, repeatResumeDoesNotRebase: true, repeatPauseStable: true,
    staleFinishProtected: true, prematureFinishProtected: true, finishedActiveElapsed: 40_000,
    terminalEvidenceImmutable: true, midnightCannotExtend: true, failedResumeNoCredit: true,
    wrongOwnerDoesNotUnlock: true, storageFailureUnlocks: true,
  });
}, 60_000);
