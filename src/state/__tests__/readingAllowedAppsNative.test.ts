import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const store = readFileSync(join(__dirname, '../../../modules/reading-focus/ios/ReadingFocusStore.swift'), 'utf8');
const moduleSource = readFileSync(join(__dirname, '../../../modules/reading-focus/ios/ReadingFocusModule.swift'), 'utf8');
function declaration(signature: string) {
  const start = store.indexOf(signature), opening = store.indexOf('{', start);
  if (start < 0) throw new Error(`Missing ${signature}`);
  let depth = 0;
  for (let i = opening; i < store.length; i += 1) {
    if (store[i] === '{') depth++;
    if (store[i] === '}' && --depth === 0) return store.slice(start, i + 1);
  }
  throw new Error(`Unterminated ${signature}`);
}

test('session export helper preserves the native pod deployment target and guards the newer Store API', () => {
  const podspec = readFileSync(join(__dirname, '../../../modules/reading-focus/ios/ReadingFocus.podspec'), 'utf8');
  expect(podspec).toContain("s.platforms = { :ios => '15.1' }");
  expect(moduleSource).toMatch(/@available\(iOS 16\.2, \*\)\s+private func encodeSession\(/);
});

test('strict exceptions use only frozen app tokens; websites and old selected-mode QA keep their original policy', () => {
  const apply = store.split('private static func applyProtection')[1].split('static var hasShield')[0];
  expect(apply).toContain('try frozenAllowedAppsLocked(value)');
  expect(apply).toContain('.all(except: allowed)');
  expect(apply).toContain('settings.shield.webDomainCategories = .all(except: [])');
  expect(apply).toContain('picked.applicationTokens.subtracting(exceptions)');
  expect(apply).not.toContain('allowedAppsRecordLocked');
  const start = store.split('static func start(')[1].split('static func releaseProtection')[0];
  expect(start).toContain('try allowedAppsForStartLocked(accountId: accountId)');
  expect(start.indexOf('value.allowedApplicationTokens =')).toBeLessThan(start.indexOf('try write(value)'));
  expect(start).toContain('value.allowedAppsAuthorizationEpoch =');
  expect(store).toContain('value.removeValue(forKey: "allowedApplicationTokens")');
  expect(store).toContain('value.removeValue(forKey: "allowedAppsAuthorizationEpoch")');
  expect(store).toContain('value.removeValue(forKey: "allowedAppsRevision")');
  expect(moduleSource).toContain('ReadingFocusStore.exportedSession(session)');
  expect(moduleSource).not.toContain('JSONEncoder().encode(session)');
  const qa = readFileSync(join(__dirname, '../../../native-tests/reading-focus/ReadingQAApp.swift'), 'utf8');
  expect(qa).toContain('ReadingFocusStore.exportedSession(current)');
  expect(qa).not.toContain('JSONEncoder().encode(current)');
  expect(moduleSource).toContain('allowedAppsStatus(accountId: accountId, activate: false)');
  expect(moduleSource).toContain('Button("Отмена", action: cancel)');
});

(process.platform === 'darwin' ? test : test.skip)('actual Swift account-bound allowlist rejects stale edits, freezes sessions and requires re-selection after revocation', () => {
  const code = `
import Foundation
import CryptoKit
typealias ApplicationToken = String
struct FamilyActivitySelection {
  var applicationTokens: Set<String> = []
  var categoryTokens: Set<String> = []
  var webDomainTokens: Set<String> = []
  init(includeEntireCategory: Bool) {}
}
struct ReadingFocusSession: Codable {
  var allowedApplicationTokens: Set<ApplicationToken>?
  var allowedAppsAuthorizationEpoch: String?
  var allowedAppsRevision: String?
}
${declaration('enum ReadingFocusFailure:')}
${declaration('enum ReadingAuthorization:')}
${declaration('struct ReadingAllowedAppsRecord:')}
${declaration('struct ReadingAllowedAppsAuthorization:')}
${declaration('struct ReadingAllowedAppsStatus:')}
enum Harness {
  static let root = FileManager.default.temporaryDirectory.appendingPathComponent("reading-allowlist-test-" + UUID().uuidString)
  static let pilotEnabled = true
  static let blockingMode = "all-apps"
  static var auth: ReadingAuthorization = .approved
  static var journal: String? = nil
  private static var allowedAppsAccountContext: String?
  private static var allowedAppsAccountGeneration = UUID().uuidString
  static func authorization() -> ReadingAuthorization { auth }
  static func locked<T>(_ body: () throws -> T) rethrows -> T { try body() }
  static func read() throws -> String? { journal }
  static func directory() throws -> URL {
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true); return root
  }
  ${declaration('static func allowedAppsFile(')}
  ${declaration('static func exportedSession(')}
  ${declaration('static func allowedAppsAuthorizationLocked(')}
  ${declaration('static func allowedAppsRecordLocked(')}
  ${declaration('static func allowedAppsStatus(')}
  ${declaration('static func allowedAppsSelection(')}
  ${declaration('static func saveAllowedApps(')}
  ${declaration('static func allowedAppsForStartLocked(')}
  ${declaration('static func frozenAllowedAppsLocked(')}
}
func chosen(_ tokens: Set<String>) -> FamilyActivitySelection {
  var value = FamilyActivitySelection(includeEntireCategory: false); value.applicationTokens = tokens; return value
}
var result: [String: Bool] = [:]
do {
  defer { try? FileManager.default.removeItem(at: Harness.root) }
  let initial = try Harness.allowedAppsStatus(accountId: "reader-a")
  result["defaultStrict"] = initial.count == 0 && initial.revision == "none:initial" && initial.editable
  var (_, _, context) = try Harness.allowedAppsSelection(accountId: "reader-a", expectedRevision: initial.revision)
  let saved = try Harness.saveAllowedApps(chosen(["books", "reader"]), accountId: "reader-a", expectedRevision: initial.revision, expectedContext: context)
  let record = try Harness.allowedAppsForStartLocked(accountId: "reader-a")!
  let frozen = ReadingFocusSession(allowedApplicationTokens: record.applicationTokens, allowedAppsAuthorizationEpoch: record.authorizationEpoch, allowedAppsRevision: record.revision)
  let exported = try Harness.exportedSession(frozen)
  result["exportsCountWithoutTokens"] = exported["allowedAppCount"] as? Int == 2 && exported["allowedApplicationTokens"] == nil && exported["allowedAppsAuthorizationEpoch"] == nil && exported["allowedAppsRevision"] == nil
  let other = try Harness.allowedAppsStatus(accountId: "reader-b")
  result["differentAccountIsEmpty"] = other.count == 0
  do { _ = try Harness.saveAllowedApps(chosen(["bad"]), accountId: "reader-a", expectedRevision: saved.revision, expectedContext: context) }
  catch { result["staleAccountRejected"] = true }
  _ = try Harness.allowedAppsStatus(accountId: "reader-a")
  do { _ = try Harness.saveAllowedApps(chosen(["bad"]), accountId: "reader-a", expectedRevision: saved.revision, expectedContext: context) }
  catch { result["accountRoundTripRejected"] = true }
  (_, _, context) = try Harness.allowedAppsSelection(accountId: "reader-a", expectedRevision: saved.revision)
  for web in [false, true] {
    var invalid = chosen(["books"])
    if web { invalid.webDomainTokens = ["site"] } else { invalid.categoryTokens = ["category"] }
    do { _ = try Harness.saveAllowedApps(invalid, accountId: "reader-a", expectedRevision: saved.revision, expectedContext: context) }
    catch { result[web ? "webRejected" : "categoryRejected"] = true }
  }
  do { _ = try Harness.saveAllowedApps(chosen(Set((0...50).map(String.init))), accountId: "reader-a", expectedRevision: saved.revision, expectedContext: context) }
  catch { result["limit51Rejected"] = true }
  let fifty = try Harness.saveAllowedApps(chosen(Set((0..<50).map(String.init))), accountId: "reader-a", expectedRevision: saved.revision, expectedContext: context)
  result["limit50Accepted"] = fifty.count == 50
  result["frozenUnaffectedByNextConfig"] = try Harness.frozenAllowedAppsLocked(frozen) == ["books", "reader"]
  result["legacyHasNoExceptions"] = try Harness.frozenAllowedAppsLocked(ReadingFocusSession()) == []
  do { _ = try Harness.saveAllowedApps(chosen(["bad"]), accountId: "reader-a", expectedRevision: saved.revision, expectedContext: context) }
  catch { result["staleRevisionRejected"] = true }
  Harness.journal = "paused-or-terminal-awaiting-report"
  result["existingApproachNotEditable"] = try !Harness.allowedAppsStatus(accountId: "reader-a").editable
  do { _ = try Harness.allowedAppsSelection(accountId: "reader-a", expectedRevision: fifty.revision) }
  catch { result["existingApproachPickerRejected"] = true }
  do { _ = try Harness.saveAllowedApps(chosen(["bad"]), accountId: "reader-a", expectedRevision: fifty.revision, expectedContext: context) }
  catch { result["startedWhilePickerOpenRejected"] = true }
  Harness.journal = nil; Harness.auth = .denied
  let revoked = try Harness.allowedAppsStatus(accountId: "reader-a")
  result["revokedNeedsReselection"] = revoked.needsReselection && !revoked.editable
  do { _ = try Harness.frozenAllowedAppsLocked(frozen) }
  catch { result["revokedFrozenTokensRejected"] = true }
  Harness.auth = .unknown
  let unknown = try Harness.allowedAppsAuthorizationLocked(.unknown)
  let repeatUnknown = try Harness.allowedAppsAuthorizationLocked(.unknown)
  result["coldUnknownDoesNotRotateEpoch"] = unknown.epoch == repeatUnknown.epoch
  Harness.auth = .approved
  let reauthorized = try Harness.allowedAppsStatus(accountId: "reader-a")
  result["reauthorizationStillNeedsSelection"] = reauthorized.needsReselection
  do { _ = try Harness.saveAllowedApps(chosen(["books"]), accountId: "reader-a", expectedRevision: fifty.revision, expectedContext: context) }
  catch { result["pickerDraftBeforeRevocationRejected"] = true }
  do { _ = try Harness.allowedAppsForStartLocked(accountId: "reader-a") }
  catch { result["staleStartRejected"] = true }
  let (selection, revision, resetContext) = try Harness.allowedAppsSelection(accountId: "reader-a", expectedRevision: reauthorized.revision)
  result["stalePickerStartsEmpty"] = selection.applicationTokens.isEmpty
  let reset = try Harness.saveAllowedApps(chosen([]), accountId: "reader-a", expectedRevision: revision, expectedContext: resetContext)
  result["emptySelectionRestoresStrict"] = reset.count == 0 && !reset.needsReselection && reset.revision != revision
  let forged = ReadingAllowedAppsRecord(accountId: "reader-a", revision: "bad-owner", authorizationEpoch: "initial", applicationTokens: ["bad"])
  try JSONEncoder().encode(forged).write(to: Harness.allowedAppsFile(accountId: "reader-b"))
  do { _ = try Harness.allowedAppsStatus(accountId: "reader-b") }
  catch { result["wrongRecordOwnerRejected"] = true }
  let data = try JSONSerialization.data(withJSONObject: result, options: .sortedKeys)
  print(String(decoding: data, as: UTF8.self))
} catch { print("Unexpected Swift failure: \\(error)"); exit(1) }
`;
  const output = execFileSync('xcrun', ['swift', '-swift-version', '5', '-e', code], { encoding: 'utf8', timeout: 45_000 });
  expect(JSON.parse(output.trim())).toEqual(Object.fromEntries([
    'defaultStrict', 'exportsCountWithoutTokens', 'differentAccountIsEmpty', 'staleAccountRejected', 'accountRoundTripRejected', 'webRejected', 'categoryRejected',
    'limit51Rejected', 'limit50Accepted', 'frozenUnaffectedByNextConfig', 'legacyHasNoExceptions',
    'staleRevisionRejected', 'existingApproachNotEditable', 'existingApproachPickerRejected', 'startedWhilePickerOpenRejected',
    'revokedNeedsReselection', 'revokedFrozenTokensRejected', 'coldUnknownDoesNotRotateEpoch',
    'reauthorizationStillNeedsSelection', 'pickerDraftBeforeRevocationRejected', 'staleStartRejected', 'stalePickerStartsEmpty', 'emptySelectionRestoresStrict',
    'wrongRecordOwnerRejected',
  ].map(key => [key, true])));
}, 60_000);
