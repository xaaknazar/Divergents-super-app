import ExpoModulesCore
import FamilyControls
import SwiftUI
import ActivityKit

public class ReadingFocusModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReadingFocus")
    AsyncFunction("capabilities") { () async -> [String: Any] in
      guard #available(iOS 16.2, *) else { return ["available": false, "authorized": false, "selectedCount": 0, "platform": "ios", "blockingMode": "selected"] }
      // Read on the main queue, as Apple requires. A cold launch may still
      // report notDetermined briefly; that is "not yet authorized", not revoked.
      let authorization = await ReadingFocusStore.resolvedAuthorization(timeoutMs: 500)
      return ["available": ReadingFocusStore.pilotEnabled,
       "authorized": authorization == .approved,
       "selectedCount": ReadingFocusStore.selectedCount(), "platform": "ios",
       "blockingMode": ReadingFocusStore.blockingMode,
       "supportsResume": true,
       "liveActivityEnabled": ActivityAuthorizationInfo().areActivitiesEnabled]
    }
    AsyncFunction("authorize") { () async throws in
      guard #available(iOS 16.2, *) else { throw ReadingFocusFailure.unavailable }
      guard ReadingFocusStore.pilotEnabled else { throw ReadingFocusFailure.unavailable }
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
    }
    AsyncFunction("selectApps") { (promise: Promise) in
      guard #available(iOS 16.2, *) else { promise.reject(ReadingFocusFailure.unavailable); return }
      guard ReadingFocusStore.pilotEnabled else { promise.reject(ReadingFocusFailure.unavailable); return }
      guard ReadingFocusStore.blockingMode == "selected" else { promise.resolve(); return }
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
      let isNewSession = try ReadingFocusStore.locked { try ReadingFocusStore.read() == nil }
      let session = try ReadingFocusStore.start(accountId: accountId, sessionId: sessionId, deviceId: deviceId, book: book, budgetMs: budgetMs, targetMs: targetMs)
      let liveActivity = await ReadingFocusStore.liveActivityStatus(accountId: accountId, sessionId: sessionId, createIfMissing: isNewSession)
      // The transient activity result is returned, not persisted in the journal.
      var result = try JSONSerialization.jsonObject(with: JSONEncoder().encode(session)) as! [String: Any]
      result["liveActivity"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(liveActivity))
      return String(decoding: try JSONSerialization.data(withJSONObject: result), as: UTF8.self)
    }
    AsyncFunction("reconcileLiveActivity") { (accountId: String, sessionId: String) async throws -> String in
      guard #available(iOS 16.2, *) else { return "{\"state\":\"disabled\",\"canRestore\":false}" }
      let status = await ReadingFocusStore.liveActivityStatus(accountId: accountId, sessionId: sessionId)
      return String(decoding: try JSONEncoder().encode(status), as: UTF8.self)
    }
    AsyncFunction("restoreLiveActivity") { (accountId: String, sessionId: String) async throws -> String in
      guard #available(iOS 16.2, *) else { return "{\"state\":\"disabled\",\"canRestore\":false}" }
      let status = await ReadingFocusStore.liveActivityStatus(accountId: accountId, sessionId: sessionId, createIfMissing: true)
      return String(decoding: try JSONEncoder().encode(status), as: UTF8.self)
    }
    AsyncFunction("endLiveActivities") { () async throws in
      guard #available(iOS 16.2, *) else { return }
      try await ReadingFocusStore.endLiveActivities()
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
      let session = try await ReadingFocusStore.pauseAndUpdateActivity()
      guard let session else { return nil }
      return String(decoding: try JSONEncoder().encode(session), as: UTF8.self)
    }
    AsyncFunction("resume") { (accountId: String, sessionId: String, expectedGeneration: String) async throws -> String in
      guard #available(iOS 16.2, *) else { throw ReadingFocusFailure.unavailable }
      let session = try await ReadingFocusStore.resume(accountId: accountId, sessionId: sessionId, generation: expectedGeneration)
      return String(decoding: try JSONEncoder().encode(session), as: UTF8.self)
    }
    AsyncFunction("finish") { (accountId: String, sessionId: String, expectedGeneration: String) async throws -> String in
      guard #available(iOS 16.2, *) else { throw ReadingFocusFailure.unavailable }
      let session = try await ReadingFocusStore.finish(accountId: accountId, sessionId: sessionId, generation: expectedGeneration)
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
