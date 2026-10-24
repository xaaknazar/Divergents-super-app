import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
const source = readFileSync(join(__dirname, '../../../modules/reading-focus/ios/ReadingFocusStore.swift'), 'utf8');
function declaration(signature: string): string {
  const start = source.indexOf(signature), opening = source.indexOf('{', start);
  if (start < 0) throw new Error(signature);
  let depth = 0;
  for (let i = opening; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1).replace(/^private static/, 'static');
  }
  throw new Error(signature);
}
test('journal writes schedule only after persistence, and receipts/logout clear reminders', () => {
  const write = declaration('static func write(');
  expect(write.indexOf('try JSONEncoder()')).toBeLessThan(write.indexOf('updatePageReminders'));
  expect(declaration('static func acknowledge(')).toContain('cancelPageReminders(value)');
  expect(declaration('static func endLiveActivities(')).toContain('session.reminderChallengeId = nil');
  expect(declaration('private static func updatePageReminders(')).not.toContain('requestAuthorization');
});
(process.platform === 'darwin' ? test : test.skip)('actual Swift reminders follow pause/resume, deadline, receipts and stale completions without repeated alerts', () => {
  const code = `
import Foundation
typealias ApplicationToken = String
${declaration('struct ReadingFocusSession:')}
struct Sound { static let \`default\` = Sound() }
class UNMutableNotificationContent {
 var title = "", body = "", threadIdentifier = ""
 var sound: Sound?; var userInfo: [AnyHashable: Any] = [:]
}
struct UNTimeIntervalNotificationTrigger { let timeInterval: Double; let repeats: Bool }
struct UNNotificationRequest { let identifier: String; let content: UNMutableNotificationContent; let trigger: UNTimeIntervalNotificationTrigger }
class UNUserNotificationCenter {
 static let shared = UNUserNotificationCenter()
 static func current() -> UNUserNotificationCenter { shared }
 var requests: [String: UNNotificationRequest] = [:], adds = 0
 var completions: [() -> Void] = []
 func add(_ r: UNNotificationRequest, withCompletionHandler: @escaping (Error?) -> Void) {
  adds += 1; requests[r.identifier] = r; completions.append { withCompletionHandler(nil) }
 }
 func removePendingNotificationRequests(withIdentifiers ids: [String]) { ids.forEach { requests.removeValue(forKey: $0) } }
 func removeDeliveredNotifications(withIdentifiers: [String]) {}
}
enum Harness {
 static let storeName = "fixture"
 static var now: Double = 0, journal: ReadingFocusSession?
 static func uptimeMs() -> Double { now }
 static func read() throws -> ReadingFocusSession? { journal }
 static func locked<T>(_ body: () throws -> T) rethrows -> T { try body() }
 static func write(_ s: ReadingFocusSession) throws { let old = journal; journal = s; updatePageReminders(previous: old, session: s) }
 ${declaration('static func elapsed(')}
 ${declaration('static func remaining(')}
 ${declaration('private static func reminderIds(')}
 ${declaration('private static func cancelPageReminders(')}
 ${declaration('static func configurePageReminder(')}
 ${declaration('private static func updatePageReminders(')}
}
var s = ReadingFocusSession(accountId: "a", sessionId: "s", deviceId: "d", book: "private book",
 budgetMs: 900_000, targetMs: 60_000, anchorMs: 0, bootId: "b", integrity: "ok", status: "running",
 blockingMode: "all-apps", resumeVersion: 1, accumulatedMs: 0, deadlineMs: 900_000,
 generation: "start", terminal: false, canResume: false)
let center = UNUserNotificationCenter.current()
var checks: [String: Bool] = [:]
try Harness.write(s)
checks["noContextNoNotification"] = center.requests.isEmpty
try Harness.configurePageReminder(accountId: "other", sessionId: "s", challengeId: "challenge")
checks["foreignAccountIgnored"] = center.requests.isEmpty
try Harness.configurePageReminder(accountId: "a", sessionId: "s", challengeId: "challenge")
s = Harness.journal!
checks["goalScheduled"] = center.requests.values.first!.trigger.timeInterval == 60
checks["noPrivateBook"] = !center.requests.values.first!.content.body.contains("private book")
let firstAdds = center.adds
try Harness.configurePageReminder(accountId: "a", sessionId: "s", challengeId: "challenge")
checks["configureIdempotent"] = center.adds == firstAdds
Harness.now = 20_000; s.status = "paused"; s.elapsedMs = 20_000; s.generation = "pause"
try Harness.write(s)
checks["pauseBeforeGoalCancels"] = center.requests.isEmpty
Harness.now = 100_000; s.status = "running"; s.elapsedMs = nil; s.accumulatedMs = 20_000; s.anchorMs = 100_000; s.generation = "resume"
try Harness.write(s)
checks["resumeUsesActiveTime"] = center.requests.values.first!.trigger.timeInterval == 40
Harness.now = 170_000; s.status = "paused"; s.elapsedMs = 90_000; s.generation = "overtime-pause"
try Harness.write(s)
checks["pausedGoalRemindsOnce"] = center.requests.count == 1 && center.requests.values.first!.trigger.timeInterval == 60
let adds = center.adds; try Harness.write(s)
checks["repeatSnapshotNoSpam"] = center.adds == adds
Harness.journal = nil; Harness.cancelPageReminders(s)
center.completions.forEach { $0() }
checks["savedAndStaleAddsCleared"] = center.requests.isEmpty
s.status = "running"; s.elapsedMs = nil; s.accumulatedMs = 0; s.anchorMs = Harness.now; s.generation = "too-late"; s.reminderChallengeId = "challenge"
// deadline is immutable; remaining goal exceeds the remaining day.
Harness.now = 880_000; s.anchorMs = Harness.now
try Harness.write(s)
checks["noGoalBeyondMidnight"] = center.requests.isEmpty
s.status = "paused"; s.terminal = true; s.elapsedMs = 1000; s.generation = "closed"; try Harness.write(s)
checks["shortApproachNeedsPages"] = center.requests.count == 1
s.reminderChallengeId = nil; try Harness.write(s)
center.completions.forEach { $0() }
checks["logoutClears"] = center.requests.isEmpty
print(String(data: try JSONSerialization.data(withJSONObject: checks), encoding: .utf8)!)
`;
  const result = JSON.parse(execFileSync('xcrun', ['swift', '-swift-version', '5', '-e', code], { encoding: 'utf8', timeout: 45000 }));
  expect(result).toEqual(Object.fromEntries(['noContextNoNotification', 'foreignAccountIgnored', 'goalScheduled', 'noPrivateBook',
    'configureIdempotent', 'pauseBeforeGoalCancels', 'resumeUsesActiveTime', 'pausedGoalRemindsOnce', 'repeatSnapshotNoSpam',
    'savedAndStaleAddsCleared', 'noGoalBeyondMidnight', 'shortApproachNeedsPages', 'logoutClears'].map(k => [k, true])));
}, 60_000);
