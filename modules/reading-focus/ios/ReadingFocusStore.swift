import Foundation
import Darwin
import FamilyControls
import ManagedSettings
import DeviceActivity
import ActivityKit
import AppIntents
import Combine

// Shared by app, DeviceActivity monitor and Live Activity. No token/credentials here.
struct ReadingFocusSession: Codable {
  let accountId: String
  let sessionId: String
  let deviceId: String
  let book: String
  let budgetMs: Double
  let targetMs: Double?
  var anchorMs: Double
  let bootId: String
  var elapsedMs: Double?
  var integrity: String
  var status: String
  // Optional so journals written before strict protection remain readable.
  // An absent value describes a legacy session with manually selected apps.
  let blockingMode: String?
  // Each new monitor belongs to one session. Absent in older journals.
  var monitoringName: String?
  let resumeVersion: Int?
  var accumulatedMs: Double?
  let deadlineMs: Double?
  var generation: String?
  var terminal: Bool?
  var canResume: Bool?
}

struct ReadingLiveActivityStatus: Codable {
  let state: String
  let activityId: String?
  let error: String?
  let canRestore: Bool
}

enum ReadingFocusFailure: LocalizedError {
  case unavailable, permission, selection, active, storage, boot, deadline, cannotResume, goal
  var errorDescription: String? {
    switch self {
    case .unavailable: return "Блокировка ещё не подключена в этой сборке."
    case .permission: return "Разрешите доступ к Экранному времени."
    case .selection: return "Выберите отвлекающие приложения и браузеры."
    case .active: return "Сначала сохраните предыдущий сеанс."
    case .storage: return "Не удалось надёжно сохранить сеанс. Чтение не начато."
    case .boot: return "После перезагрузки время требует проверки."
    case .deadline: return "День завершился. Откройте Divergents и сохраните результат."
    case .cannotResume: return "Этот подход уже завершён. Откройте Divergents."
    case .goal: return "До 60 минут доступна пауза. Завершить чтение можно после дневной цели."
    }
  }
}

// `notDetermined` is also the documented initial value of a newly launched
// process. It is not evidence that an existing authorization was revoked.
enum ReadingAuthorization: String {
  case unknown, denied, approved
}

@available(iOS 16.2, *)
enum ReadingFocusStore {
  static let group = "group.kz.divergents.reading"
  // The QA app and both of its extensions share an isolated namespace. They
  // cannot read, pause or acknowledge the production session in this App Group.
  static var isQA: Bool { Bundle.main.object(forInfoDictionaryKey: "DivergentsReadingFocusQA") as? Bool == true }
  static var storeName: String { isQA ? "divergents.reading.qa" : "divergents.reading" }
  // An explicitly configured QA build can exercise the production policy while
  // retaining the isolated QA journal, monitor and settings store.
  static var strictQA: Bool { isQA && Bundle.main.object(forInfoDictionaryKey: "DivergentsReadingStrictQA") as? Bool == true }
  static var blockingMode: String { isQA && !strictQA ? "selected" : "all-apps" }
  static let activityName = DeviceActivityName(storeName)
  static func activityName(for sessionId: String, generation: String? = nil) -> DeviceActivityName {
    DeviceActivityName("\(storeName).session.\(sessionId)\(generation.map { ".\($0)" } ?? "")")
  }
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
  static func authorization() -> ReadingAuthorization {
    // Apple requires access on the main queue. Every caller captures this
    // BEFORE flock: a background lock owner must never wait on the main queue.
    let readOnMain = { readingAuthorization(AuthorizationCenter.shared.authorizationStatus) }
    return Thread.isMainThread ? readOnMain() : DispatchQueue.main.sync(execute: readOnMain)
  }
  static func readingAuthorization(_ status: AuthorizationStatus) -> ReadingAuthorization {
    if status == .approved { return .approved }
    if #available(iOS 26.4, *), status == .approvedWithDataAccess { return .approved }
    return status == .denied ? .denied : .unknown
  }
  // A Live Activity intent may run in a freshly launched background process,
  // where the status is notDetermined until FamilyControls publishes it. Wait
  // briefly for a definite value; an unresolved one never applies protection.
  static func resolvedAuthorization(timeoutMs: UInt64 = 2_000) async -> ReadingAuthorization {
    let initial = await MainActor.run { readingAuthorization(AuthorizationCenter.shared.authorizationStatus) }
    if initial != .unknown { return initial }
    let startedAt = uptimeMs()
    let resolved = await withTaskGroup(of: ReadingAuthorization.self) { group -> ReadingAuthorization in
      group.addTask { @MainActor in
        for await status in AuthorizationCenter.shared.$authorizationStatus.values {
          let value = readingAuthorization(status)
          if value != .unknown { return value }
        }
        return .unknown
      }
      group.addTask {
        try? await Task.sleep(nanoseconds: timeoutMs * 1_000_000)
        return .unknown
      }
      let first = await group.next() ?? .unknown
      group.cancelAll()
      return first
    }
    trace("authorization-resolved", ["authorization": resolved.rawValue, "waitMs": uptimeMs() - startedAt])
    return resolved
  }
  static func trace(_ event: String, _ fields: [String: Any] = [:]) {
    // QA only, separate bounded diagnostic file/lock. Never read a journal or
    // authorization here, and never acquire the session lock from this helper.
    guard isQA, let folder = try? directory() else { return }
    let fd = open(folder.appendingPathComponent("diagnostics.lock").path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard fd >= 0 else { return }
    defer { close(fd) }
    guard flock(fd, LOCK_EX) == 0 else { return }
    defer { flock(fd, LOCK_UN) }
    let file = folder.appendingPathComponent("native-diagnostics.json")
    var events = (try? Data(contentsOf: file)).flatMap { try? JSONSerialization.jsonObject(with: $0) as? [[String: Any]] } ?? []
    var entry = fields
    entry["event"] = event; entry["at"] = ISO8601DateFormatter().string(from: Date())
    entry["uptimeMs"] = uptimeMs(); entry["pid"] = ProcessInfo.processInfo.processIdentifier
    entry["bundle"] = Bundle.main.bundleIdentifier ?? ""; entry["mainThread"] = Thread.isMainThread
    events.append(entry)
    if let data = try? JSONSerialization.data(withJSONObject: Array(events.suffix(160)), options: [.sortedKeys]) {
      try? data.write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
  }
  static func diagnosticTrace() -> [[String: Any]] {
    guard isQA, let folder = try? directory(),
      let data = try? Data(contentsOf: folder.appendingPathComponent("native-diagnostics.json")),
      let events = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return [] }
    return events
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
    let requestedAt = uptimeMs()
    guard flock(fd, LOCK_EX) == 0 else { throw ReadingFocusFailure.storage }
    let acquiredAt = uptimeMs()
    let thread = Thread.current.threadDictionary
    let outermost = thread[lockDepthKey] == nil
    thread[lockDepthKey] = true
    defer {
      let releasedAt = uptimeMs()
      if outermost { thread[lockDepthKey] = nil }
      flock(fd, LOCK_UN)
      if acquiredAt - requestedAt > 25 || releasedAt - acquiredAt > 25 {
        trace("journal-lock", ["waitMs": acquiredAt - requestedAt, "heldMs": releasedAt - acquiredAt])
      }
      if outermost { stopDeferredMonitors() }
    }
    return try body()
  }
  // stopMonitoring waits for the monitor extension's intervalDidEnd, which
  // needs this same journal lock. Calling it under the lock deadlocked a
  // lock-screen pause for ~30 s until iOS killed the intent, after which the
  // monitor sealed the unwritten session as revoked. Inside the lock we only
  // clear shields; monitors stop after unlock, once the paused journal exists.
  private static let lockDepthKey = "kz.divergents.reading.lockDepth"
  private static let deferredStopsKey = "kz.divergents.reading.deferredMonitorStops"
  private static func stopDeferredMonitors() {
    let thread = Thread.current.threadDictionary
    guard let names = thread[deferredStopsKey] as? [String], !names.isEmpty else { return }
    thread[deferredStopsKey] = nil
    let startedAt = uptimeMs()
    DeviceActivityCenter().stopMonitoring(names.map { DeviceActivityName($0) })
    trace("monitor-stop-after-unlock", ["monitorCount": names.count, "stopMs": uptimeMs() - startedAt])
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
    max(0, value.budgetMs - elapsed(value))
  }
  static func elapsed(_ value: ReadingFocusSession) -> Double {
    if let elapsedMs = value.elapsedMs { return elapsedMs }
    let now = min(uptimeMs(), value.deadlineMs ?? .greatestFiniteMagnitude)
    return min(value.budgetMs, (value.accumulatedMs ?? 0) + max(0, now - value.anchorMs))
  }
  static func deadlineReached(_ value: ReadingFocusSession) -> Bool {
    value.resumeVersion == 1 && uptimeMs() >= (value.deadlineMs ?? value.anchorMs + value.budgetMs)
  }
  private static func applyProtection(_ value: ReadingFocusSession) throws {
    let availableMs = value.resumeVersion == 1
      ? max(0, (value.deadlineMs ?? value.anchorMs + value.budgetMs) - uptimeMs())
      : remaining(value)
    guard availableMs > 0 else { throw ReadingFocusFailure.deadline }
    let duration = max(15 * 60, ceil(availableMs / 1000))
    let start = Date(), end = start.addingTimeInterval(duration)
    let fields: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
    let warning = duration - ceil(availableMs / 1000)
    let monitoringStartedAt = uptimeMs()
    trace("monitor-start-begin", ["generation": value.generation ?? "", "availableMs": availableMs])
    try DeviceActivityCenter().startMonitoring(DeviceActivityName(value.monitoringName ?? activityName.rawValue), during: DeviceActivitySchedule(
      intervalStart: Calendar.current.dateComponents(fields, from: start), intervalEnd: Calendar.current.dateComponents(fields, from: end),
      repeats: false, warningTime: warning > 0 ? DateComponents(second: Int(warning)) : nil))
    trace("monitor-start-end", ["durationMs": uptimeMs() - monitoringStartedAt])
    let ownToken = Application(bundleIdentifier: Bundle.main.bundleIdentifier ?? "kz.divergents.app").token
    let exceptions = Set(ownToken.map { [$0] } ?? [])
    if (value.blockingMode ?? "selected") == "selected" {
      let picked = try selection()
      guard !picked.applicationTokens.isEmpty || !picked.categoryTokens.isEmpty || !picked.webDomainTokens.isEmpty
        else { throw ReadingFocusFailure.selection }
      settings.shield.applications = picked.applicationTokens.subtracting(exceptions)
      settings.shield.applicationCategories = .specific(picked.categoryTokens, except: exceptions)
      settings.shield.webDomains = picked.webDomainTokens
      settings.shield.webDomainCategories = .specific(picked.categoryTokens)
    } else {
      settings.shield.applications = nil
      settings.shield.applicationCategories = .all(except: exceptions)
      settings.shield.webDomains = nil
      settings.shield.webDomainCategories = .all(except: [])
    }
  }
  static var hasShield: Bool {
    settings.shield.applications != nil || settings.shield.applicationCategories != nil ||
      settings.shield.webDomains != nil || settings.shield.webDomainCategories != nil
  }
  static func start(accountId: String, sessionId: String, deviceId: String, book: String, budgetMs: Double, targetMs: Double? = nil) throws -> ReadingFocusSession {
    guard pilotEnabled else { throw ReadingFocusFailure.unavailable }
    guard authorization() == .approved else { throw ReadingFocusFailure.permission }
    guard budgetMs > 0 && budgetMs <= 86_400_000 else { throw ReadingFocusFailure.unavailable }
    if blockingMode == "selected" {
      let selection = try selection()
      guard !selection.applicationTokens.isEmpty || !selection.categoryTokens.isEmpty || !selection.webDomainTokens.isEmpty
        else { throw ReadingFocusFailure.selection }
    }
    return try locked {
      if let previous = try read() {
        if previous.sessionId == sessionId && previous.accountId == accountId { return previous }
        throw ReadingFocusFailure.active
      }
      let anchor = uptimeMs(), generation = UUID().uuidString
      let value = ReadingFocusSession(accountId: accountId, sessionId: sessionId, deviceId: deviceId, book: book,
        budgetMs: budgetMs, targetMs: targetMs, anchorMs: anchor, bootId: try bootId(), elapsedMs: nil, integrity: "ok", status: "running",
        blockingMode: blockingMode, monitoringName: activityName(for: sessionId, generation: generation).rawValue,
        resumeVersion: 1, accumulatedMs: 0, deadlineMs: anchor + budgetMs, generation: generation, terminal: false, canResume: false)
      try write(value) // Fail closed BEFORE applying any shields.
      do {
        try applyProtection(value)
      } catch {
        releaseProtection()
        var failed = value; failed.elapsedMs = 0; failed.status = "paused"; failed.terminal = true; failed.canResume = false
        try write(failed)
        throw error
      }
      return value
    }
  }
  static func releaseProtection() {
    let startedAt = uptimeMs()
    let hadShield = hasShield
    settings.clearAllSettings()
    let clearedAt = uptimeMs()
    let center = DeviceActivityCenter()
    // The ".session." boundary prevents production from matching the QA store.
    let names = center.activities.filter {
      $0 == activityName || $0.rawValue.hasPrefix("\(storeName).session.")
    }
    let listedAt = uptimeMs()
    if hadShield || !names.isEmpty {
      trace("release-before-monitor-stop", ["hadShield": hadShield, "clearMs": clearedAt - startedAt,
        "listMs": listedAt - clearedAt, "monitorCount": names.count])
    }
    // An empty list means "stop all" to DeviceActivityCenter, not "do nothing".
    if !names.isEmpty {
      let thread = Thread.current.threadDictionary
      if thread[lockDepthKey] != nil {
        let pending = thread[deferredStopsKey] as? [String] ?? []
        thread[deferredStopsKey] = pending + names.map(\.rawValue)
        return
      }
      center.stopMonitoring(names)
    }
    if hadShield || !names.isEmpty {
      trace("release-complete", ["stopMs": uptimeMs() - listedAt, "totalMs": uptimeMs() - startedAt])
    }
  }
  // Serialize intentional release with snapshot; always fail open if locking
  // or reading the journal fails. No network/await occurs inside the lock.
  @discardableResult static func pause() throws -> ReadingFocusSession? {
    try pauseWithActivities().session
  }
  private static func pauseWithActivities() throws -> (session: ReadingFocusSession?, activities: [Activity<ReadingActivityAttributes>]) {
    var captured: [Activity<ReadingActivityAttributes>] = []
    let auth = authorization()
    trace("pause-app-begin", ["authorization": auth.rawValue])
    do {
      return try locked {
        // Snapshot cannot mistake this intentional release for revocation.
        let wasShielded = hasShield
        releaseProtection()
        guard let value = try read() else { return (nil, []) }
        // Capture under the same lock used by Activity.request. A concurrently
        // requested card must be included if it appeared while we awaited the lock.
        captured = matchingActivities(sessionId: value.sessionId)
        return (try pauseLocked(value, wasShielded: wasShielded, authorization: auth), captured)
      }
    } catch {
      releaseProtection()
      let activitiesToEnd = captured
      Task { await endActivities(activitiesToEnd) }
      throw error
    }
  }
  private static func pauseLocked(_ session: ReadingFocusSession, wasShielded: Bool, authorization auth: ReadingAuthorization, terminal: Bool = false) throws -> ReadingFocusSession {
    var value = session
    // Once a stop payload can enter the immutable outbox, reboot, revocation
    // or sign-out must not rewrite that evidence under the same operation ID.
    if value.status == "paused" && (value.terminal == true || value.resumeVersion != 1) { return value }
    let rebooted = (try? bootId()) != value.bootId || uptimeMs() < value.anchorMs
    if value.status == "running" {
      if rebooted {
        value.elapsedMs = value.resumeVersion == 1 ? value.accumulatedMs ?? 0 : 0
        value.integrity = "rebooted"
      } else {
        value.elapsedMs = floor(elapsed(value))
        if auth == .denied || !wasShielded { value.integrity = "revoked" }
      }
    } else if rebooted {
      value.integrity = "rebooted"
    } else if auth == .denied {
      value.integrity = "revoked"
    }
    value.status = "paused"
    if value.resumeVersion == 1 { value.accumulatedMs = value.elapsedMs ?? value.accumulatedMs ?? 0 }
    value.terminal = terminal || value.terminal == true || value.resumeVersion != 1 || deadlineReached(value) || value.integrity != "ok"
    value.canResume = value.resumeVersion == 1 && value.terminal == false
    if value.resumeVersion == 1 && (session.status != value.status || session.terminal != value.terminal) {
      value.generation = UUID().uuidString
    }
    try write(value)
    trace("pause-persisted", ["authorization": auth.rawValue, "wasShielded": wasShielded,
      "status": value.status, "integrity": value.integrity, "terminal": value.terminal ?? false,
      "canResume": value.canResume ?? false, "generation": value.generation ?? "",
      "elapsedMs": value.elapsedMs ?? 0, "deadlineReached": deadlineReached(value)])
    return value
  }
  static func resume(accountId: String, sessionId: String, generation: String? = nil) async throws -> ReadingFocusSession {
    guard pilotEnabled else { throw ReadingFocusFailure.unavailable }
    let auth = await resolvedAuthorization()
    trace("resume-begin", ["authorization": auth.rawValue, "generation": generation ?? ""])
    let value = try locked { () throws -> ReadingFocusSession in
      guard let current = try read(), current.accountId == accountId, current.sessionId == sessionId,
        current.resumeVersion == 1, current.terminal == false else { throw ReadingFocusFailure.cannotResume }
      guard let generation, current.generation == generation else { throw ReadingFocusFailure.cannotResume }
      if (try? bootId()) != current.bootId || uptimeMs() < current.anchorMs {
        let wasShielded = hasShield
        releaseProtection(); _ = try pauseLocked(current, wasShielded: wasShielded, authorization: auth, terminal: true)
        throw ReadingFocusFailure.boot
      }
      if deadlineReached(current) {
        let wasShielded = hasShield
        releaseProtection(); _ = try pauseLocked(current, wasShielded: wasShielded, authorization: auth, terminal: true)
        throw ReadingFocusFailure.deadline
      }
      if auth == .unknown {
        trace("resume-authorization-unresolved", ["generation": current.generation ?? ""])
        // No new protection or consent prompt from an unresolved process.
        // Leave a valid soft pause intact; the card directs the user to the app.
        throw ReadingFocusFailure.permission
      }
      guard auth == .approved, current.integrity == "ok" else {
        let wasShielded = hasShield
        releaseProtection(); _ = try pauseLocked(current, wasShielded: wasShielded, authorization: auth, terminal: true)
        throw ReadingFocusFailure.permission
      }
      if current.status == "running" { return current } // Idempotent; never rebase a live interval.
      guard current.canResume == true else { throw ReadingFocusFailure.cannotResume }
      var next = current
      next.anchorMs = uptimeMs(); next.accumulatedMs = current.elapsedMs ?? current.accumulatedMs ?? 0
      next.elapsedMs = nil; next.status = "running"; next.canResume = false
      next.generation = UUID().uuidString
      next.monitoringName = activityName(for: sessionId, generation: next.generation).rawValue
      do {
        try write(next)
        try applyProtection(next)
      } catch {
        releaseProtection()
        // Failed resume grants no new time and leaves the original paused evidence.
        try write(current)
        throw error
      }
      return next
    }
    await refreshActivities(matchingActivities(sessionId: sessionId), session: value)
    guard let latest = try snapshot(authorization: auth), latest.accountId == accountId, latest.sessionId == sessionId else { throw ReadingFocusFailure.cannotResume }
    return latest
  }
  static func finish(accountId: String, sessionId: String, generation: String?) async throws -> ReadingFocusSession {
    let auth = authorization()
    let captured = matchingActivities(sessionId: sessionId)
    let value: ReadingFocusSession
    do {
      value = try locked { () throws -> ReadingFocusSession in
        guard let current = try read(), current.accountId == accountId, current.sessionId == sessionId else { throw ReadingFocusFailure.active }
        if current.resumeVersion == 1 {
          guard let generation, current.generation == generation else { throw ReadingFocusFailure.cannotResume }
        }
        // A soft pause may close the approach before the hour: the daily goal can be collected in several approaches.
        // A running interval still cannot be finished before the goal; it must be paused first.
        guard current.terminal == true || current.status == "paused" || deadlineReached(current) || current.integrity != "ok" ||
          elapsed(current) >= (current.targetMs ?? current.budgetMs) else { throw ReadingFocusFailure.goal }
        let wasShielded = hasShield
        releaseProtection()
        return try pauseLocked(current, wasShielded: wasShielded, authorization: auth, terminal: true)
      }
    } catch let failure as ReadingFocusFailure {
      switch failure {
      case .active, .cannotResume, .goal: throw failure // Rejected controls must not release someone else's/live unfinished session.
      default:
        releaseProtection(); await endActivities(captured); throw failure
      }
    } catch {
      // Storage/decoding errors fail open, without writing a synthetic stop.
      releaseProtection()
      await endActivities(captured)
      throw error
    }
    await refreshActivities(matchingActivities(sessionId: sessionId), session: value)
    guard let latest = try snapshot(), latest.accountId == accountId, latest.sessionId == sessionId else { throw ReadingFocusFailure.active }
    return latest
  }
  static func matchingActivities(sessionId: String) -> [Activity<ReadingActivityAttributes>] {
    // Never adopt an unbound legacy card by book title or end time.
    Activity<ReadingActivityAttributes>.activities.filter { $0.attributes.sessionId == sessionId }
  }
  static func finishMonitoredInterval(_ name: DeviceActivityName) {
    guard name == activityName || name.rawValue.hasPrefix("\(storeName).session.") else { return }
    let auth = authorization()
    trace("monitor-finish", ["name": name.rawValue, "authorization": auth.rawValue])
    var captured: [Activity<ReadingActivityAttributes>] = []
    do {
      try locked {
        guard let session = try read() else { releaseProtection(); return }
        guard name.rawValue == (session.monitoringName ?? activityName.rawValue) else { return }
        // stopMonitoring may already have queued a deadline callback. A manual
        // pause owns its frozen card; a late callback must leave it unchanged.
        guard session.status == "running" else { return }
        captured = matchingActivities(sessionId: session.sessionId)
        let wasShielded = hasShield
        releaseProtection()
        _ = try pauseLocked(session, wasShielded: wasShielded, authorization: auth, terminal: true)
      }
    } catch {
      // Fail open, retain unreadable evidence, and never manufacture credit.
      releaseProtection()
    }
    // Capture before scheduling: a delayed callback cannot discover/end a
    // new session's activity after it has started.
    let activitiesToEnd = captured
    Task { await endActivities(activitiesToEnd) }
  }
  // Activity refreshes pass .unknown: they must not wait on a busy main queue,
  // and revocation also clears the shield, which this check still observes.
  static func snapshot(authorization known: ReadingAuthorization? = nil) throws -> ReadingFocusSession? {
    let auth = known ?? authorization()
    var captured: [Activity<ReadingActivityAttributes>] = []
    defer {
      let activitiesToEnd = captured
      Task { await endActivities(activitiesToEnd) }
    }
    do {
      // Keep missing-journal cleanup under the same lock as start(), so an
      // overlapping poll cannot clear a newly persisted session's protection.
      return try locked { () throws -> ReadingFocusSession? in
        guard let value = try read() else { releaseProtection(); return nil }
        let invalid = (try? bootId()) != value.bootId || auth == .denied
        if (value.status == "running" && (remaining(value) <= 0 || invalid || !hasShield || deadlineReached(value))) ||
          (value.resumeVersion == 1 && value.terminal != true && (deadlineReached(value) || invalid)) {
          captured = matchingActivities(sessionId: value.sessionId)
          let wasShielded = hasShield
          releaseProtection()
          return try pauseLocked(value, wasShielded: wasShielded, authorization: auth, terminal: true)
        }
        return value
      }
    } catch {
      // Retain unreadable evidence for recovery; never invent elapsed time or
      // keep a device restricted because its journal cannot be read/written.
      releaseProtection()
      throw error
    }
  }
  static func acknowledge(accountId: String, sessionId: String) throws {
    var completedActivities: [Activity<ReadingActivityAttributes>] = []
    try locked {
      guard let value = try read(), value.accountId == accountId, value.sessionId == sessionId, value.status == "paused" else { throw ReadingFocusFailure.active }
      guard value.resumeVersion != 1 || value.terminal == true else { throw ReadingFocusFailure.active }
      if (value.targetMs ?? value.budgetMs) - (value.elapsedMs ?? 0) <= 0 {
        // Acknowledgement alone is only a segment upload. End the card only
        // once that accepted report has actually fulfilled the reading goal.
        completedActivities = matchingActivities(sessionId: sessionId)
      }
      try FileManager.default.removeItem(at: directory().appendingPathComponent("session.json"))
    }
    let activitiesToEnd = completedActivities
    Task { await endActivities(activitiesToEnd) }
  }
  static func endActivities(_ activities: [Activity<ReadingActivityAttributes>]) async {
    for activity in activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }
  static func pauseAndUpdateActivity() async throws -> ReadingFocusSession? {
    let result = try pauseWithActivities()
    if let session = result.session { await refreshActivities(result.activities, session: session) }
    return try snapshot()
  }
  static func endLiveActivities() async throws {
    let auth = authorization()
    // Sign-out/account reset differs from a reading pause: even an acknowledged
    // segment may still have a retained card containing the previous user's book.
    // ActivityKit enumerates this app's activities, not another app's QA cards.
    var captured = Activity<ReadingActivityAttributes>.activities
    do {
      try locked {
        let wasShielded = hasShield
        releaseProtection()
        // Include a card whose request completed while we waited for the lock.
        captured = Activity<ReadingActivityAttributes>.activities
        if let session = try read() {
          _ = try pauseLocked(session, wasShielded: wasShielded, authorization: auth, terminal: true)
        }
      }
      await endActivities(captured)
    } catch {
      // Leave corrupt/unsent evidence in place, but never retain the account's
      // lock-screen content or restrictions because the journal is unavailable.
      releaseProtection()
      await endActivities(captured)
      throw error
    }
  }
  static func activityState(_ session: ReadingFocusSession, errorMessage: String? = nil) -> ReadingActivityAttributes.ContentState {
    let remainingToGoal = (session.targetMs ?? session.budgetMs) - elapsed(session)
    return .init(end: Date().addingTimeInterval(remainingToGoal / 1000), status: session.status,
      pausedRemainingMs: session.status == "paused" ? remainingToGoal : nil,
      canResume: session.canResume == true && session.terminal == false,
      generation: session.generation, errorMessage: errorMessage, terminal: session.terminal)
  }
  // A paused card shows pausedRemainingMs, so its end is irrelevant; a running
  // end recomputed from the monotonic clock differs only by milliseconds.
  static func sameContent(_ lhs: ReadingActivityAttributes.ContentState, _ rhs: ReadingActivityAttributes.ContentState) -> Bool {
    guard lhs.status == rhs.status, lhs.canResume == rhs.canResume, lhs.generation == rhs.generation,
      lhs.errorMessage == rhs.errorMessage, lhs.terminal == rhs.terminal else { return false }
    if lhs.status == "paused" { return lhs.pausedRemainingMs == rhs.pausedRemainingMs }
    return abs(lhs.end.timeIntervalSince(rhs.end)) < 1
  }
  private static func sameRevision(_ lhs: ReadingFocusSession, _ rhs: ReadingFocusSession) -> Bool {
    lhs.sessionId == rhs.sessionId && lhs.generation == rhs.generation && lhs.status == rhs.status &&
      lhs.terminal == rhs.terminal && lhs.elapsedMs == rhs.elapsedMs && lhs.canResume == rhs.canResume
  }
  static func refreshActivities(_ activities: [Activity<ReadingActivityAttributes>], session: ReadingFocusSession, errorMessage: String? = nil) async {
    for activity in activities {
      var desired = session
      while activity.activityState == .active || activity.activityState == .stale {
        do {
          if let latest = try snapshot(authorization: .unknown), latest.sessionId == session.sessionId, latest.accountId == session.accountId {
            desired = latest
          } else if session.resumeVersion == 1 {
            // Version 1 can only be acknowledged after sealing. Never resurrect
            // a finalized card while a newer session/account has taken its place.
            await activity.end(nil, dismissalPolicy: .immediate); break
          }
          let message = desired.generation == session.generation && desired.status == "paused" ? errorMessage : nil
          let state = activityState(desired, errorMessage: message)
          if sameContent(activity.content.state, state) { break }
          let updateStartedAt = uptimeMs()
          await activity.update(ActivityContent(state: state, staleDate: nil))
          trace("activity-update", ["status": state.status ?? "", "terminal": state.terminal ?? false,
            "canResume": state.canResume ?? false, "durationMs": uptimeMs() - updateStartedAt])
          guard let after = try snapshot(authorization: .unknown), after.sessionId == session.sessionId, after.accountId == session.accountId else {
            if session.resumeVersion == 1 { await activity.end(nil, dismissalPolicy: .immediate) }
            break
          }
          if sameRevision(desired, after) { break }
          // Pause/resume may run in another process while update suspends.
          // Correct stale content immediately; never hold flock across await.
          desired = after
        } catch {
          await activity.end(nil, dismissalPolicy: .immediate)
          break
        }
      }
    }
  }
  static func pauseFromActivity(sessionId: String?, generation: String? = nil) async throws {
    var captured: [Activity<ReadingActivityAttributes>] = []
    var pausedSession: ReadingFocusSession?
    let startedAt = uptimeMs()
    trace("pause-activity-begin", ["generation": generation ?? ""])
    defer { trace("pause-activity-end", ["totalMs": uptimeMs() - startedAt]) }
    do {
      try locked {
        guard let session = try read() else { releaseProtection(); return }
        if let sessionId {
          guard session.sessionId == sessionId else { return }
          if session.resumeVersion == 1 {
            guard let generation, session.generation == generation else {
              // The OS may still display an old action. Refresh its content
              // without applying that action to a later run.
              captured = matchingActivities(sessionId: sessionId); pausedSession = session
              return
            }
          }
          captured = matchingActivities(sessionId: sessionId)
        } else {
          // A legacy card can only control a legacy journal. Never let an old
          // unbound card pause a newer session that it does not represent.
          guard session.monitoringName == nil else { return }
          captured = Activity<ReadingActivityAttributes>.activities.filter { $0.attributes.sessionId == nil }
        }
        let wasShielded = hasShield
        releaseProtection()
        // The lock-screen tap must not wait for the main queue of a process the
        // system may still be launching. An unknown status never revokes: real
        // revocation removes the shield, which wasShielded records.
        pausedSession = try pauseLocked(session, wasShielded: wasShielded, authorization: .unknown)
        trace("pause-activity-persisted", ["elapsedMs": uptimeMs() - startedAt])
      }
      if let pausedSession { await refreshActivities(captured, session: pausedSession) }
    } catch {
      releaseProtection()
      await endActivities(captured)
      throw error
    }
  }
  static func resumeFromActivity(sessionId: String?, generation: String?) async {
    guard let sessionId else { return }
    let startedAt = uptimeMs()
    trace("resume-activity-begin", ["generation": generation ?? ""])
    defer { trace("resume-activity-end", ["totalMs": uptimeMs() - startedAt]) }
    do {
      guard let current = try locked({ try read() }), current.sessionId == sessionId,
        let generation, current.generation == generation else { throw ReadingFocusFailure.cannotResume }
      _ = try await resume(accountId: current.accountId, sessionId: sessionId, generation: generation)
    } catch {
      guard let current = try? locked({ try read() }), current.sessionId == sessionId else { return }
      await refreshActivities(matchingActivities(sessionId: sessionId), session: current,
        errorMessage: current.generation == generation || current.terminal == true
          ? "\(error.localizedDescription) Откройте Divergents." : nil)
    }
  }

  @MainActor private static var liveActivityErrors: [String: String] = [:]
  @MainActor static func liveActivityStatus(accountId: String, sessionId: String, createIfMissing: Bool = false) async -> ReadingLiveActivityStatus {
    guard pilotEnabled else { return .init(state: "disabled", activityId: nil, error: nil, canRestore: false) }
    let session: ReadingFocusSession
    do {
      guard let current = try snapshot(), current.accountId == accountId,
        current.sessionId == sessionId else {
        return .init(state: "ended", activityId: nil, error: nil, canRestore: false)
      }
      session = current
    } catch {
      return .init(state: "error", activityId: nil, error: error.localizedDescription, canRestore: false)
    }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      return .init(state: "disabled", activityId: nil, error: nil, canRestore: false)
    }
    if let activity = matchingActivities(sessionId: sessionId).first(where: { $0.activityState == .active || $0.activityState == .stale }) {
      await refreshActivities([activity], session: session)
      if activity.content.state.status == "paused" {
        return .init(state: "paused", activityId: activity.id, error: nil, canRestore: false)
      }
      if activity.activityState == .active || activity.activityState == .stale {
        return .init(state: activity.activityState == .stale ? "stale" : "active",
          activityId: activity.id, error: nil, canRestore: false)
      }
      // A user dismissal while update suspended still requires an explicit restore.
      return .init(state: "missing", activityId: nil, error: nil, canRestore: session.status == "running")
    }
    guard createIfMissing && session.status == "running" else {
      // Missing and dismissed are intentionally not distinguished: ActivityKit
      // does not tell us whether the user or the system removed the card.
      return .init(state: "missing", activityId: nil, error: liveActivityErrors[sessionId], canRestore: session.status == "running")
    }
    do {
      // start() cannot create a new journal until the prior paused journal was
      // acknowledged. Thus older same-account bound cards represent closed
      // segments, even if their asynchronous paused-content update is in flight.
      // Never remove legacy unbound cards, another account's cards, or this one.
      let priorSessions = Activity<ReadingActivityAttributes>.activities.filter {
        $0.attributes.accountId == accountId && $0.attributes.sessionId != nil && $0.attributes.sessionId != sessionId
      }
      // No suspension between rechecking journal ownership and request. The
      // cross-process lock prevents a monitor/pause from racing this request.
      let activity = try locked { () throws -> Activity<ReadingActivityAttributes>? in
        guard let current = try read(), current.accountId == accountId,
          current.sessionId == sessionId, current.status == "running",
          remaining(current) > 0, hasShield else { return nil }
        if let existing = matchingActivities(sessionId: sessionId).first(where: { $0.activityState == .active || $0.activityState == .stale }) {
          return existing
        }
        let content = ActivityContent(state: activityState(current), staleDate: nil)
        return try Activity.request(attributes: ReadingActivityAttributes(book: current.book, sessionId: sessionId, accountId: accountId),
          content: content, pushType: nil)
      }
      guard let activity else { return .init(state: "ended", activityId: nil, error: nil, canRestore: false) }
      liveActivityErrors.removeValue(forKey: sessionId)
      await endActivities(priorSessions)
      return .init(state: "active", activityId: activity.id, error: nil, canRestore: false)
    } catch {
      liveActivityErrors[sessionId] = error.localizedDescription
      return .init(state: "error", activityId: nil, error: error.localizedDescription, canRestore: true)
    }
  }
}

@available(iOS 16.2, *)
struct ReadingActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    let end: Date
    var status: String? = nil
    // Signed remaining-to-goal freezes both the countdown and overtime.
    var pausedRemainingMs: Double? = nil
    var canResume: Bool? = nil
    var generation: String? = nil
    var errorMessage: String? = nil
    var terminal: Bool? = nil
  }
  let book: String
  // Optional preserves decoding of cards from older app versions.
  var sessionId: String? = nil
  var accountId: String? = nil
}

@available(iOS 17.0, *)
struct PauseReadingIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Приостановить чтение"
  static var openAppWhenRun = false
  @Parameter(title: "Сеанс") var sessionId: String?
  @Parameter(title: "Запуск") var generation: String?
  init() {}
  init(sessionId: String?, generation: String? = nil) { self.sessionId = sessionId; self.generation = generation }
  func perform() async throws -> some IntentResult {
    try await ReadingFocusStore.pauseFromActivity(sessionId: sessionId, generation: generation)
    return .result()
  }
}

@available(iOS 17.0, *)
struct ResumeReadingIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Возобновить чтение"
  static var openAppWhenRun = false
  @Parameter(title: "Сеанс") var sessionId: String?
  @Parameter(title: "Запуск") var generation: String?
  init() {}
  init(sessionId: String?, generation: String?) { self.sessionId = sessionId; self.generation = generation }
  func perform() async throws -> some IntentResult {
    await ReadingFocusStore.resumeFromActivity(sessionId: sessionId, generation: generation)
    return .result()
  }
}
