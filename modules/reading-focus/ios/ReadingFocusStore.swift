import Foundation
import Darwin
import FamilyControls
import ManagedSettings
import DeviceActivity
import ActivityKit
import AppIntents

// Shared by app, DeviceActivity monitor and Live Activity. No token/credentials here.
struct ReadingFocusSession: Codable {
  let accountId: String
  let sessionId: String
  let deviceId: String
  let book: String
  let budgetMs: Double
  let targetMs: Double?
  let anchorMs: Double
  let bootId: String
  var elapsedMs: Double?
  var integrity: String
  var status: String
}

enum ReadingFocusFailure: LocalizedError {
  case unavailable, permission, selection, active, storage, boot
  var errorDescription: String? {
    switch self {
    case .unavailable: return "Блокировка ещё не подключена в этой сборке."
    case .permission: return "Разрешите доступ к Экранному времени."
    case .selection: return "Выберите отвлекающие приложения и браузеры."
    case .active: return "Сначала сохраните предыдущий сеанс."
    case .storage: return "Не удалось надёжно сохранить сеанс. Чтение не начато."
    case .boot: return "После перезагрузки время требует проверки."
    }
  }
}

@available(iOS 16.2, *)
enum ReadingFocusStore {
  static let group = "group.kz.divergents.reading"
  // The QA app and both of its extensions share an isolated namespace. They
  // cannot read, pause or acknowledge the production session in this App Group.
  static var isQA: Bool { Bundle.main.object(forInfoDictionaryKey: "DivergentsReadingFocusQA") as? Bool == true }
  static var storeName: String { isQA ? "divergents.reading.qa" : "divergents.reading" }
  static let activityName = DeviceActivityName(storeName)
  static let settings = ManagedSettingsStore(named: .init(storeName))
  static var pilotEnabled: Bool { Bundle.main.object(forInfoDictionaryKey: "DivergentsReadingFocusPilot") as? Bool == true }
  static func directory() throws -> URL {
    guard let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else { throw ReadingFocusFailure.storage }
    if !isQA { return url }
    let qa = url.appendingPathComponent("qa", isDirectory: true)
    try FileManager.default.createDirectory(at: qa, withIntermediateDirectories: true)
    return qa
  }
  static func uptimeMs() -> Double {
    var info = mach_timebase_info_data_t(); mach_timebase_info(&info)
    return Double(mach_continuous_time()) * Double(info.numer) / Double(info.denom) / 1_000_000
  }
  static func bootId() throws -> String {
    // kern.bootsessionuuid is sandbox-denied on physical iPhones. Boot time is
    // available through the supported BSD sysctl; any discontinuity is reviewed.
    var value = timeval(), size = MemoryLayout<timeval>.size
    var mib: [Int32] = [CTL_KERN, KERN_BOOTTIME]
    guard sysctl(&mib, 2, &value, &size, nil, 0) == 0 else { throw ReadingFocusFailure.boot }
    return "\(value.tv_sec):\(value.tv_usec)"
  }
  static func locked<T>(_ body: () throws -> T) throws -> T {
    let file = try directory().appendingPathComponent("reading.lock").path
    let fd = open(file, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard fd >= 0 else { throw ReadingFocusFailure.storage }
    defer { close(fd) }
    guard flock(fd, LOCK_EX) == 0 else { throw ReadingFocusFailure.storage }
    defer { flock(fd, LOCK_UN) }
    return try body()
  }
  static func read() throws -> ReadingFocusSession? {
    let file = try directory().appendingPathComponent("session.json")
    if !FileManager.default.fileExists(atPath: file.path) { return nil }
    return try JSONDecoder().decode(ReadingFocusSession.self, from: Data(contentsOf: file))
  }
  static func write(_ session: ReadingFocusSession) throws {
    try JSONEncoder().encode(session).write(to: directory().appendingPathComponent("session.json"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }
  static func selection() throws -> FamilyActivitySelection {
    let file = try directory().appendingPathComponent("selection.json")
    guard FileManager.default.fileExists(atPath: file.path) else { throw ReadingFocusFailure.selection }
    return try JSONDecoder().decode(FamilyActivitySelection.self, from: Data(contentsOf: file))
  }
  static func saveSelection(_ value: FamilyActivitySelection) throws {
    try JSONEncoder().encode(value).write(to: directory().appendingPathComponent("selection.json"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }
  static func selectedCount() -> Int {
    guard let value = try? selection() else { return 0 }
    return value.applicationTokens.count + value.categoryTokens.count + value.webDomainTokens.count
  }
  static func remaining(_ value: ReadingFocusSession) -> Double {
    max(0, value.budgetMs - (value.elapsedMs ?? max(0, uptimeMs() - value.anchorMs)))
  }
  static var hasShield: Bool {
    settings.shield.applications != nil || settings.shield.applicationCategories != nil ||
      settings.shield.webDomains != nil || settings.shield.webDomainCategories != nil
  }
  static func start(accountId: String, sessionId: String, deviceId: String, book: String, budgetMs: Double, targetMs: Double? = nil) throws -> ReadingFocusSession {
    guard pilotEnabled else { throw ReadingFocusFailure.unavailable }
    guard AuthorizationCenter.shared.authorizationStatus == .approved else { throw ReadingFocusFailure.permission }
    guard budgetMs > 0 && budgetMs <= 86_400_000 else { throw ReadingFocusFailure.unavailable }
    let picked = try selection()
    guard selectedCount() > 0 else { throw ReadingFocusFailure.selection }
    return try locked {
      if let previous = try read() {
        if previous.sessionId == sessionId && previous.accountId == accountId { return previous }
        throw ReadingFocusFailure.active
      }
      let value = ReadingFocusSession(accountId: accountId, sessionId: sessionId, deviceId: deviceId, book: book,
        budgetMs: budgetMs, targetMs: targetMs, anchorMs: uptimeMs(), bootId: try bootId(), elapsedMs: nil, integrity: "ok", status: "running")
      try write(value) // Fail closed BEFORE applying any shields.
      do {
        let duration = max(15 * 60, ceil(budgetMs / 1000))
        let start = Date(), end = start.addingTimeInterval(duration)
        let calendar = Calendar.current
        let fields: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
        // Short final segments use an end warning; real-device acceptance is mandatory.
        let warning = duration - ceil(budgetMs / 1000)
        try DeviceActivityCenter().startMonitoring(activityName, during: DeviceActivitySchedule(
          intervalStart: calendar.dateComponents(fields, from: start), intervalEnd: calendar.dateComponents(fields, from: end),
          repeats: false, warningTime: warning > 0 ? DateComponents(second: Int(warning)) : nil))
        let ownToken = Application(bundleIdentifier: Bundle.main.bundleIdentifier ?? "kz.divergents.app").token
        let exceptions = Set(ownToken.map { [$0] } ?? [])
        settings.shield.applications = picked.applicationTokens.subtracting(exceptions)
        settings.shield.applicationCategories = .specific(picked.categoryTokens, except: exceptions)
        settings.shield.webDomains = picked.webDomainTokens
        settings.shield.webDomainCategories = .specific(picked.categoryTokens)
      } catch {
        settings.clearAllSettings()
        DeviceActivityCenter().stopMonitoring([activityName])
        var failed = value; failed.elapsedMs = 0; failed.status = "paused"
        try write(failed)
        throw error
      }
      return value
    }
  }
  // Release first, even if disk fails. A storage/server error must never hold the phone hostage.
  @discardableResult static func pause() throws -> ReadingFocusSession? {
    let wasShielded = hasShield
    settings.clearAllSettings()
    DeviceActivityCenter().stopMonitoring([activityName])
    return try locked {
      guard var value = try read() else { return nil }
      guard value.status == "running" else { return value }
      if (try? bootId()) != value.bootId || uptimeMs() < value.anchorMs {
        value.elapsedMs = 0; value.integrity = "rebooted"
      } else {
        value.elapsedMs = floor(min(value.budgetMs, max(0, uptimeMs() - value.anchorMs)))
        if AuthorizationCenter.shared.authorizationStatus != .approved || !wasShielded { value.integrity = "revoked" }
      }
      value.status = "paused"
      try write(value)
      return value
    }
  }
  static func snapshot() throws -> ReadingFocusSession? {
    guard let value = try locked({ try read() }) else { return nil }
    if value.status == "running" && (remaining(value) <= 0 || (try? bootId()) != value.bootId || AuthorizationCenter.shared.authorizationStatus != .approved || !hasShield) {
      return try pause()
    }
    return value
  }
  static func acknowledge(accountId: String, sessionId: String) throws {
    try locked {
      guard let value = try read(), value.accountId == accountId, value.sessionId == sessionId, value.status == "paused" else { throw ReadingFocusFailure.active }
      try FileManager.default.removeItem(at: directory().appendingPathComponent("session.json"))
    }
  }
  static func endActivity() async {
    for activity in Activity<ReadingActivityAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }
}

@available(iOS 16.2, *)
struct ReadingActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable { let end: Date }
  let book: String
}

@available(iOS 17.0, *)
struct PauseReadingIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Приостановить чтение"
  static var openAppWhenRun = false
  func perform() async throws -> some IntentResult {
    try ReadingFocusStore.pause()
    await ReadingFocusStore.endActivity()
    return .result()
  }
}
