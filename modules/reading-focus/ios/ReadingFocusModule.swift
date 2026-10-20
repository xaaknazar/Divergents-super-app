import ExpoModulesCore
import FamilyControls
import SwiftUI
import ActivityKit

public class ReadingFocusModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReadingFocus")
    AsyncFunction("capabilities") { () -> [String: Any] in
      guard #available(iOS 16.2, *) else { return ["available": false, "authorized": false, "selectedCount": 0, "platform": "ios"] }
      return ["available": ReadingFocusStore.pilotEnabled,
       "authorized": AuthorizationCenter.shared.authorizationStatus == .approved,
       "selectedCount": ReadingFocusStore.selectedCount(), "platform": "ios"]
    }
    AsyncFunction("authorize") { () async throws in
      guard #available(iOS 16.2, *) else { throw ReadingFocusFailure.unavailable }
      guard ReadingFocusStore.pilotEnabled else { throw ReadingFocusFailure.unavailable }
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
    }
    AsyncFunction("selectApps") { (promise: Promise) in
      guard #available(iOS 16.2, *) else { promise.reject(ReadingFocusFailure.unavailable); return }
      guard ReadingFocusStore.pilotEnabled else { promise.reject(ReadingFocusFailure.unavailable); return }
      guard let controller = self.appContext?.utilities?.currentViewController() else { promise.reject(ReadingFocusFailure.unavailable); return }
      let view = ReadingSelectionView(selection: (try? ReadingFocusStore.selection()) ?? FamilyActivitySelection()) { value in
        do { try ReadingFocusStore.saveSelection(value); controller.dismiss(animated: true); promise.resolve() }
        catch { controller.dismiss(animated: true); promise.reject(error) }
      }
      let host = UIHostingController(rootView: view)
      host.isModalInPresentation = true
      controller.present(host, animated: true)
    }.runOnQueue(.main)
    AsyncFunction("start") { (accountId: String, sessionId: String, deviceId: String, book: String, budgetMs: Double, targetMs: Double) async throws -> String in
      guard #available(iOS 16.2, *) else { throw ReadingFocusFailure.unavailable }
      let session = try ReadingFocusStore.start(accountId: accountId, sessionId: sessionId, deviceId: deviceId, book: book, budgetMs: budgetMs, targetMs: targetMs)
      if ActivityAuthorizationInfo().areActivitiesEnabled && session.status == "running" && Activity<ReadingActivityAttributes>.activities.isEmpty {
        _ = try? Activity.request(attributes: ReadingActivityAttributes(book: book), content: ActivityContent(
          state: .init(end: Date().addingTimeInterval((targetMs - (session.budgetMs - ReadingFocusStore.remaining(session))) / 1000)), staleDate: nil), pushType: nil)
      }
      return String(decoding: try JSONEncoder().encode(session), as: UTF8.self)
    }
    AsyncFunction("snapshot") { () throws -> String? in
      guard #available(iOS 16.2, *) else { return nil }
      guard ReadingFocusStore.pilotEnabled else { return nil }
      guard let session = try ReadingFocusStore.snapshot() else { return nil }
      return String(decoding: try JSONEncoder().encode(session), as: UTF8.self)
    }
    AsyncFunction("pause") { () async throws -> String? in
      guard #available(iOS 16.2, *) else { return nil }
      guard ReadingFocusStore.pilotEnabled else { return nil }
      let session = try ReadingFocusStore.pause()
      await ReadingFocusStore.endActivity()
      guard let session else { return nil }
      return String(decoding: try JSONEncoder().encode(session), as: UTF8.self)
    }
    AsyncFunction("remainingMs") { () throws -> Double in
      guard #available(iOS 16.2, *) else { return 0 }
      guard let session = try ReadingFocusStore.snapshot() else { return 0 }
      return ReadingFocusStore.remaining(session)
    }
    AsyncFunction("acknowledge") { (accountId: String, sessionId: String) throws in
      guard #available(iOS 16.2, *) else { return }
      try ReadingFocusStore.acknowledge(accountId: accountId, sessionId: sessionId)
    }
  }
}

@available(iOS 16.2, *)
private struct ReadingSelectionView: View {
  @State var selection: FamilyActivitySelection
  let save: (FamilyActivitySelection) -> Void
  var body: some View {
    NavigationStack {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Что отвлекает от чтения")
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Сохранить") { save(selection) } } }
    }
  }
}
