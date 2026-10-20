import SwiftUI
import FamilyControls
import ActivityKit

@main struct ReadingQAApp: App {
  var body: some Scene { WindowGroup { ReadingQAView() } }
}
@MainActor struct ReadingQAView: View {
  @Environment(\.scenePhase) private var scenePhase
  @State private var selection = (try? ReadingFocusStore.selection()) ?? FamilyActivitySelection()
  @State private var picker = false
  @State private var message = "Проверка блокировки. Основное приложение и реальные отметки не изменяются."
  @State private var session: ReadingFocusSession?
  @State private var pendingTest: (duration: Double, target: Double?)?
  @State private var confirmStrict = false
  @State private var liveActivity: ReadingLiveActivityStatus?
  @State private var observationTasks: [String: Task<Void, Never>] = [:]
  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: 18) {
          Text("Чтение · проверка на iPhone").font(.title2.bold())
          Text(message).accessibilityIdentifier("reading-qa-status")
          Button("1. Разрешить Экранное время") {
            Task { do { try await AuthorizationCenter.shared.requestAuthorization(for: .individual); message = "Доступ разрешён" } catch { message = error.localizedDescription } }
          }.buttonStyle(.borderedProminent)
          if ReadingFocusStore.blockingMode == "all-apps" {
            Text("СТРОГИЙ ТЕСТ: все приложения и сайты в пределах iOS, включая банки, карты и читалки. Это QA-приложение остаётся доступно. Пауза сразу снимает ограничения.").font(.footnote)
          } else {
            Button("2. Выбрать одно приложение для теста") { picker = true }.buttonStyle(.bordered)
            Text("Не выбирайте Divergents Reading QA, телефон и приложение для книг.").font(.footnote)
          }
          Button("3. Тест: 60 секунд") { requestStart(60_000) }.buttonStyle(.borderedProminent)
          Button("Тест: 15 минут") { requestStart(900_000) }.buttonStyle(.bordered)
          Button("Доп. время: цель 15 сек., предел 60 сек.") { requestStart(60_000, target: 15_000) }.buttonStyle(.bordered)
          Button("Пауза — снять блокировку") {
            Task { await pause() }
          }.buttonStyle(.borderedProminent).tint(.orange)
          if session?.canResume == true {
            Button("Возобновить чтение и блокировку") { Task { await resume() } }.buttonStyle(.borderedProminent)
          }
          Button("Проверить состояние") { inspect() }.buttonStyle(.bordered)
          activityDiagnostics
          Button("Сбросить тест на паузе") { Task { await resetPausedTest() } }
          TimelineView(.periodic(from: .now, by: 1)) { _ in
            if let session {
              let target = (session.targetMs ?? session.budgetMs) - (session.budgetMs - ReadingFocusStore.remaining(session))
              Text("\(target > 0 ? "До цели" : "Дополнительно") \(Int(ceil(abs(target) / 1000))) сек.").font(.largeTitle.monospacedDigit())
              if session.status == "paused" {
                // A sealed approach must explain why no resume control exists.
                Text(session.terminal == true ? "Подход завершён (\(session.integrity)) — возобновить нельзя" : "На паузе — время стоит")
                  .foregroundStyle(.secondary).accessibilityIdentifier("reading-qa-phase")
              }
              Button("Завершить чтение") { Task { await finish() } }
                .buttonStyle(.bordered)
                .disabled(session.terminal != true && ReadingFocusStore.elapsed(session) < (session.targetMs ?? session.budgetMs))
            }
          }
        }.padding(24)
      }.familyActivityPicker(isPresented: $picker, selection: $selection)
        .onChange(of: picker) { opened in
          if !opened { do { try ReadingFocusStore.saveSelection(selection); message = "Выбор сохранён" } catch { message = error.localizedDescription } }
        }
        .alert("Включить строгую блокировку?", isPresented: $confirmStrict) {
          Button("Отмена", role: .cancel) { pendingTest = nil }
          Button("Начать тест") {
            if let pendingTest { start(pendingTest.duration, target: pendingTest.target) }
            pendingTest = nil
          }
        } message: {
          Text("iOS ограничит все доступные для блокировки приложения, кроме Divergents Reading QA. При необходимости вернитесь сюда и нажмите «Пауза — снять блокировку».")
        }
        .task(id: scenePhase) {
          if scenePhase == .active {
            await refresh("foreground")
            await observeSessionChanges()
          } else { persistDiagnostics("scene-\(scenePhase)") }
        }
    }
  }
  @ViewBuilder private var activityDiagnostics: some View {
    if let liveActivity {
      Text("Карточка: \(liveActivity.state) · защита: \(ReadingFocusStore.hasShield ? "включена" : "выключена")")
        .font(.footnote).accessibilityIdentifier("reading-qa-live-status")
      if let error = liveActivity.error { Text(error).font(.footnote).foregroundStyle(.red) }
      if liveActivity.canRestore {
        Button("Вернуть карточку на экран блокировки") {
          Task { await restoreActivity() }
        }.buttonStyle(.bordered)
      }
    }
  }
  private func pause() async {
    do {
      let value = try await ReadingFocusStore.pauseAndUpdateActivity()
      session = value
      let elapsed = Int(value?.elapsedMs ?? 0)
      message = "Пауза: \(elapsed) мс"
    } catch { message = error.localizedDescription }
    await refreshActivity()
    persistDiagnostics("pause")
  }
  private func resume() async {
    do {
      if let value = session {
        session = try await ReadingFocusStore.resume(accountId: value.accountId, sessionId: value.sessionId, generation: value.generation)
      }
    } catch { message = error.localizedDescription }
    await refresh("resume")
  }
  private func finish() async {
    do {
      if let value = session {
        session = try await ReadingFocusStore.finish(accountId: value.accountId, sessionId: value.sessionId, generation: value.generation)
      }
    } catch { message = error.localizedDescription }
    await refresh("finish")
  }
  private func resetPausedTest() async {
    do {
      guard ReadingFocusStore.isQA, let value = try ReadingFocusStore.snapshot(), value.status == "paused",
        value.accountId == "qa-no-real-account", value.deviceId == "qa-iphone" else { return }
      // Explicit QA-only cancellation seals without inventing pages or touching
      // the production namespace; ordinary finish still requires the goal.
      try await ReadingFocusStore.endLiveActivities()
      try ReadingFocusStore.acknowledge(accountId: value.accountId, sessionId: value.sessionId)
      session = nil; liveActivity = nil; message = "Тест очищен"
      persistDiagnostics("qa-reset")
    } catch { message = error.localizedDescription }
  }
  private func restoreActivity() async {
    if let session {
      liveActivity = await ReadingFocusStore.liveActivityStatus(accountId: session.accountId,
        sessionId: session.sessionId, createIfMissing: true)
    }
    observeActivityStates()
    persistDiagnostics("explicit-restore")
  }
  private func inspect() {
    Task { await refresh("inspect") }
  }
  private func observeSessionChanges() async {
    while !Task.isCancelled {
      do { try await Task.sleep(nanoseconds: 1_000_000_000) } catch { return }
      guard !Task.isCancelled else { return }
      do {
        let current = try ReadingFocusStore.snapshot()
        if current?.sessionId != session?.sessionId || current?.status != session?.status ||
          current?.elapsedMs != session?.elapsedMs || current?.generation != session?.generation ||
          current?.terminal != session?.terminal || current?.canResume != session?.canResume {
          session = current
          if current?.status == "paused" { message = "Чтение на паузе. Ограничения сняты." }
          await refreshActivity()
          persistDiagnostics("local-session-change")
        }
      } catch { message = error.localizedDescription }
    }
  }
  private func refresh(_ event: String) async {
    // Inspect does not start protection or recreate a missing/dismissed card.
    do {
      session = try ReadingFocusStore.snapshot()
      message = session.map { "\($0.status) · \($0.integrity) · \(Int(ReadingFocusStore.elapsed($0))) мс" } ?? "Нет сеанса"
    } catch { message = error.localizedDescription }
    await refreshActivity()
    persistDiagnostics(event)
  }
  private func refreshActivity() async {
    if let session {
      liveActivity = await ReadingFocusStore.liveActivityStatus(accountId: session.accountId, sessionId: session.sessionId)
    } else {
      liveActivity = nil
    }
    observeActivityStates()
  }
  private func observeActivityStates() {
    for activity in Activity<ReadingActivityAttributes>.activities where observationTasks[activity.id] == nil {
      observationTasks[activity.id] = Task {
        for await state in activity.activityStateUpdates {
          persistDiagnostics("activity-\(String(describing: state))", changedActivityId: activity.id)
        }
      }
      observationTasks["content-\(activity.id)"] = Task {
        for await _ in activity.contentUpdates {
          persistDiagnostics("activity-content", changedActivityId: activity.id)
        }
      }
    }
  }
  private func persistDiagnostics(_ event: String, changedActivityId: String? = nil) {
    guard ReadingFocusStore.isQA,
      let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
    let file = directory.appendingPathComponent("reading-live-diagnostics.json")
    do {
      let encoder = JSONEncoder()
      encoder.dateEncodingStrategy = .iso8601
      let activities: [[String: Any]] = try Activity<ReadingActivityAttributes>.activities.map {
        ["id": $0.id, "sessionId": $0.attributes.sessionId ?? "", "state": String(describing: $0.activityState),
         "content": try JSONSerialization.jsonObject(with: encoder.encode($0.content.state))]
      }
      var entry: [String: Any] = [
        "at": ISO8601DateFormatter().string(from: Date()), "event": event,
        "blockingMode": ReadingFocusStore.blockingMode, "hasShield": ReadingFocusStore.hasShield,
        "activitiesEnabled": ActivityAuthorizationInfo().areActivitiesEnabled,
        "activities": activities
      ]
      if let changedActivityId { entry["changedActivityId"] = changedActivityId }
      if let current = try ReadingFocusStore.locked({ try ReadingFocusStore.read() }) {
        entry["session"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(current))
        entry["remainingMs"] = ReadingFocusStore.remaining(current)
      }
      if let liveActivity { entry["liveActivity"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(liveActivity)) }
      var history: [[String: Any]] = []
      if let data = try? Data(contentsOf: file),
        let previous = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
        history = previous["events"] as? [[String: Any]] ?? []
      }
      history.append(entry)
      // Native timings/authorization from the app, intents and monitor processes.
      let output: [String: Any] = ["latest": entry, "events": Array(history.suffix(80)),
        "nativeTrace": ReadingFocusStore.diagnosticTrace()]
      try JSONSerialization.data(withJSONObject: output, options: [.prettyPrinted, .sortedKeys])
        .write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    } catch {
      message = "\(message)\nДиагностика: \(error.localizedDescription)"
    }
  }
  private func requestStart(_ duration: Double, target: Double? = nil) {
    if ReadingFocusStore.blockingMode == "all-apps" {
      pendingTest = (duration, target); confirmStrict = true
    } else { start(duration, target: target) }
  }
  private func start(_ duration: Double, target: Double? = nil) {
    Task {
      do {
        let value = try ReadingFocusStore.start(accountId: "qa-no-real-account", sessionId: UUID().uuidString,
          deviceId: "qa-iphone", book: "Проверка блокировки", budgetMs: duration, targetMs: target)
        session = value
        liveActivity = await ReadingFocusStore.liveActivityStatus(accountId: value.accountId,
          sessionId: value.sessionId, createIfMissing: true)
        observeActivityStates()
        message = ReadingFocusStore.blockingMode == "all-apps"
          ? "Строгий тест запущен. Проверьте другое приложение, затем вернитесь сюда и нажмите паузу."
          : "Тест запущен. Проверьте выбранное приложение и кнопку паузы на экране блокировки."
      } catch { message = error.localizedDescription }
      persistDiagnostics("start")
    }
  }
}
