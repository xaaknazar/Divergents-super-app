import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const swift = readFileSync(join(__dirname, '../../../modules/reading-focus/ios/ReadingFocusStore.swift'), 'utf8');
function declaration(signature: string) {
  const start = swift.indexOf(signature), open = swift.indexOf('{', start);
  if (start < 0) throw Error(signature);
  let depth = 0;
  for (let i = open; i < swift.length; i++) {
    if (swift[i] === '{') depth++;
    if (swift[i] === '}' && --depth === 0) return swift.slice(start, i + 1).replace(/^private static/, 'static');
  }
  throw Error(signature);
}
const nativeTest = process.platform === 'darwin' ? test : test.skip;

nativeTest('actual Swift preserves 58 minutes, handles clock epochs, checkpoints and legacy journals', () => {
  const code = `
import Foundation
import Dispatch
typealias ApplicationToken = String
${declaration('struct ReadingFocusSession:')}
${declaration('enum ReadingFocusFailure:')}
${declaration('enum ReadingAuthorization:')}
struct ReadingActivityAttributes {}
final class Activity<T> {}
enum Harness {
  static var now: Double = 100_000_000
  static var boot = "shm-v1:first-boot"
  static var bootFails = false
  static var journal: ReadingFocusSession?
  static var hasShield = true
  static var writes = 0
  static var writeFails = false
  static func uptimeMs() -> Double { now }
  static func bootId() throws -> String { if bootFails { throw ReadingFocusFailure.storage }; return boot }
  static func authorization() -> ReadingAuthorization { .approved }
  static func locked<T>(_ body: () throws -> T) throws -> T { try body() }
  static func read() throws -> ReadingFocusSession? { journal }
  static func write(_ value: ReadingFocusSession) throws {
    if writeFails { throw ReadingFocusFailure.storage }
    journal = value; writes += 1
  }
  static func releaseProtection() { hasShield = false }
  static func allowedAppsAuthorizationLocked(_ auth: ReadingAuthorization) throws -> Bool { true }
  static func trace(_ event: String, _ fields: [String: Any] = [:]) {}
  static func matchingActivities(sessionId: String) -> [Activity<ReadingActivityAttributes>] { [] }
  static func endActivities(_ values: [Activity<ReadingActivityAttributes>]) async {}
  ${declaration('static func clockRebooted(')}
  ${declaration('static func savedElapsed(')}
  ${declaration('static func elapsed(')}
  ${declaration('static func remaining(')}
  ${declaration('static func deadlineReached(')}
  ${declaration('private static func pauseLocked(')}
  ${declaration('static func snapshot(')}
}
func initial(legacy: Bool = false) -> ReadingFocusSession {
  ReadingFocusSession(accountId: "a", sessionId: "s", deviceId: "d", book: "b",
    budgetMs: 20_000_000, targetMs: 3_600_000, anchorMs: 100_000_000,
    bootId: legacy ? "1790000000:123456" : "shm-v1:first-boot", elapsedMs: nil,
    integrity: "ok", status: "running", blockingMode: "all-apps", resumeVersion: 1,
    accumulatedMs: 0, deadlineMs: 120_000_000, generation: "initial", terminal: false, canResume: false)
}
func check(_ ok: Bool, _ name: String) { if !ok { fatalError(name) } }
do {
  // Real old-calendar identity is ignored even if the wall clock moved; the
  // source no longer queries calendar time or sysctl for reboot identity.
  Harness.journal = initial(legacy: true)
  Harness.now += 3_480_000
  let first = try Harness.snapshot()!
  check(first.status == "running" && first.measuredElapsedMs == 3_480_000, "58 minutes retained")
  check(first.targetMs! - first.measuredElapsedMs! == 120_000, "two minutes remaining")
  check(Harness.journal!.checkpointElapsedMs == 3_480_000, "durable checkpoint")
  check(Harness.journal!.bootId == Harness.boot, "legacy migration")
  check(Harness.journal!.measuredElapsedMs == nil, "sample not used as frozen journal elapsed")
  // Suspension / process death needs no in-memory counter. Re-read the journal.
  Harness.now += 1_000
  let next = try Harness.snapshot()!
  check(next.measuredElapsedMs == 3_481_000 && Harness.writes == 1, "sample advances without excessive writes")
  Harness.now += 4_000
  _ = try Harness.snapshot()
  check(Harness.writes == 2 && Harness.journal!.checkpointElapsedMs == 3_485_000, "bounded checkpoint writes")
  // Real reboot, including when new uptime already exceeds the old anchor.
  let checkpoint = Harness.journal!
  Harness.boot = "shm-v1:next-boot"; Harness.now += 10_000
  let rebooted = try Harness.snapshot()!
  check(rebooted.elapsedMs == 3_485_000 && rebooted.integrity == "rebooted" && rebooted.terminal == true, "reboot preserves high-water mark")
  check(!Harness.hasShield, "reboot releases protection")
  Harness.now = 999_000_000
  let repeated = try Harness.snapshot()!
  check(repeated.elapsedMs == rebooted.elapsedMs && repeated.generation == rebooted.generation, "sealed evidence immutable")
  // Missing access is not a claimed reboot, and never grants an unmeasured gap.
  Harness.journal = checkpoint; Harness.hasShield = true; Harness.bootFails = true; Harness.now = 103_490_000
  let unknown = try Harness.snapshot()!
  check(unknown.elapsedMs == 3_485_000 && unknown.integrity != "rebooted" && unknown.terminal == true, "unavailable marker retains evidence")
  Harness.bootFails = false; Harness.boot = "shm-v1:first-boot"
  Harness.journal = checkpoint; Harness.hasShield = true; Harness.now = 5_000
  let regression = try Harness.snapshot()!
  check(regression.elapsedMs == 3_485_000 && regression.integrity == "rebooted", "monotonic regression detected")
  // Soft pause and a revoked shield cannot erase confirmed time either.
  Harness.journal = checkpoint; Harness.hasShield = true; Harness.now = 103_490_000
  let pause = try Harness.pauseLocked(checkpoint, wasShielded: true, authorization: .approved)
  Harness.now += 500_000
  check(Harness.elapsed(pause) == 3_490_000 && pause.canResume == true, "paused time excluded")
  Harness.journal = checkpoint; Harness.hasShield = false; Harness.now = 103_490_000
  let revoked = try Harness.snapshot()!
  check(revoked.elapsedMs == 3_490_000 && revoked.integrity == "revoked", "revocation retained")
  // An advisory checkpoint failure is not a failed timer transition. Keep the
  // valid running journal and shields; retry the checkpoint on the next read.
  Harness.journal = checkpoint; Harness.hasShield = true; Harness.now = 103_490_000; Harness.writeFails = true
  let unsavedCheckpoint = try Harness.snapshot()!
  check(unsavedCheckpoint.status == "running" && unsavedCheckpoint.measuredElapsedMs == 3_490_000, "checkpoint failure preserves display")
  check(Harness.hasShield && Harness.journal!.checkpointElapsedMs == 3_485_000, "checkpoint failure does not unlock or erase")
  Harness.writeFails = false; Harness.now += 1_000
  _ = try Harness.snapshot()
  check(Harness.journal!.checkpointElapsedMs == 3_491_000, "checkpoint retry catches up exactly")
  print("clock-regressions-passed")
} catch { fatalError("Unexpected failure: \\(error)") }
`;
  expect(execFileSync('xcrun', ['swift', '-swift-version', '5', '-e', code], { encoding: 'utf8', timeout: 45_000 }).trim()).toBe('clock-regressions-passed');
}, 60_000);

nativeTest('real shared-memory boot identity survives two processes and changes when its kernel object is recreated', () => {
  // A unique test-only IPC name. Never use/unlink production or QA markers.
  const group = `dvg-test-${randomUUID().slice(0, 12)}`;
  const code = `import Foundation\nimport Darwin\n${declaration('enum ReadingFocusFailure:')}
enum Harness { static let group = "${group}"; static let isQA = false
${declaration('static func bootId()')}
}
print(try Harness.bootId())`;
  const run = (source: string) => execFileSync('xcrun', ['swift', '-import-objc-header',
    join(__dirname, '../../../modules/reading-focus/ios/ReadingBootMarker.h'), '-e', source], { encoding: 'utf8', timeout: 30_000 }).trim();
  const unlink = `import Darwin\nshm_unlink("${group}/p")`;
  try {
    const first = run(code), second = run(code);
    expect(first).toMatch(/^shm-v1:[0-9A-F-]{36}$/);
    expect(second).toBe(first);
    run(unlink);
    expect(run(code)).not.toBe(first);
  } finally { run(unlink); }
}, 90_000);

test('boot checks never use mutable calendar boot times or denied kernel UUID sysctls', () => {
  expect(swift).not.toContain('KERN_BOOTTIME]');
  expect(swift).not.toContain('sysctl(');
  expect(declaration('static func bootId()')).toContain('ReadingBootMarkerOpen');
});
