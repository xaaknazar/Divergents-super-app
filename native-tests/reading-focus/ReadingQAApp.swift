import SwiftUI
import FamilyControls
import ActivityKit

@main struct ReadingQAApp: App {
  var body: some Scene { WindowGroup { ReadingQAView() } }
}
struct ReadingQAView: View {
  @State private var selection = (try? ReadingFocusStore.selection()) ?? FamilyActivitySelection()
  @State private var picker = false
  @State private var message = "Проверка блокировки. Основное приложение и реальные отметки не изменяются."
  @State private var session: ReadingFocusSession?
  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: 18) {
          Text("Чтение · проверка на iPhone").font(.title2.bold())
          Text(message).accessibilityIdentifier("reading-qa-status")
          Button("1. Разрешить Экранное время") {
            Task { do { try await AuthorizationCenter.shared.requestAuthorization(for: .individual); message = "Доступ разрешён" } catch { message = error.localizedDescription } }
          }.buttonStyle(.borderedProminent)
          Button("2. Выбрать одно приложение для теста") { picker = true }.buttonStyle(.bordered)
          Text("Не выбирайте Divergents Reading QA, телефон и приложение для книг.").font(.footnote)
          Button("3. Тест: 60 секунд") { start(60_000) }.buttonStyle(.borderedProminent)
          Button("Тест: 15 минут") { start(900_000) }.buttonStyle(.bordered)
          Button("Доп. время: цель 15 сек., предел 60 сек.") { start(60_000, target: 15_000) }.buttonStyle(.bordered)
          Button("Пауза — снять блокировку") {
            Task { do { session = try ReadingFocusStore.pause(); await ReadingFocusStore.endActivity(); message = "Пауза: \(Int(session?.elapsedMs ?? 0)) мс" }
              catch { message = error.localizedDescription } }
          }.buttonStyle(.borderedProminent).tint(.orange)
          Button("Проверить состояние") { inspect() }.buttonStyle(.bordered)
          Button("Сбросить завершённый тест") {
            do { if let value = try ReadingFocusStore.snapshot(), value.status == "paused",
              value.accountId == "qa-no-real-account", value.deviceId == "qa-iphone" {
              try ReadingFocusStore.acknowledge(accountId: value.accountId, sessionId: value.sessionId)
              session = nil; message = "Тест очищен"
            } } catch { message = error.localizedDescription }
          }
          TimelineView(.periodic(from: .now, by: 1)) { _ in
            if let session {
              let target = (session.targetMs ?? session.budgetMs) - (session.budgetMs - ReadingFocusStore.remaining(session))
              Text("\(target > 0 ? "До цели" : "Дополнительно") \(Int(ceil(abs(target) / 1000))) сек.").font(.largeTitle.monospacedDigit())
            }
          }
        }.padding(24)
      }.familyActivityPicker(isPresented: $picker, selection: $selection)
        .onChange(of: picker) { opened in
          if !opened { do { try ReadingFocusStore.saveSelection(selection); message = "Выбор сохранён" } catch { message = error.localizedDescription } }
        }
    }
  }
  private func inspect() {
    do { session = try ReadingFocusStore.snapshot(); message = session.map { "\($0.status) · \($0.integrity) · \(Int($0.elapsedMs ?? 0)) мс" } ?? "Нет сеанса" }
    catch { message = error.localizedDescription }
  }
  private func start(_ duration: Double, target: Double? = nil) {
    do {
      session = try ReadingFocusStore.start(accountId: "qa-no-real-account", sessionId: UUID().uuidString,
        deviceId: "qa-iphone", book: "Проверка блокировки", budgetMs: duration, targetMs: target)
      if ActivityAuthorizationInfo().areActivitiesEnabled {
        _ = try? Activity.request(attributes: ReadingActivityAttributes(book: "Тест чтения"), content: ActivityContent(
          state: .init(end: Date().addingTimeInterval((target ?? duration) / 1000)), staleDate: nil), pushType: nil)
      }
      message = "Тест запущен. Проверьте выбранное приложение и кнопку паузы на экране блокировки."
    } catch { message = error.localizedDescription }
  }
}
