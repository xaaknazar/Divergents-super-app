import ExpoModulesCore
import FamilyControls
import SwiftUI
import ActivityKit

public class ReadingFocusModule: Module {
  private var allowedAppsPickerPresented = false
  @available(iOS 16.2, *)
  private func encodeSession(_ session: ReadingFocusSession, liveActivity: ReadingLiveActivityStatus? = nil) throws -> String {
    var result = try ReadingFocusStore.exportedSession(session)
    if let liveActivity { result["liveActivity"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(liveActivity)) }
    return String(decoding: try JSONSerialization.data(withJSONObject: result), as: UTF8.self)
  }
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
       "supportsAllowedApps": ReadingFocusStore.pilotEnabled && ReadingFocusStore.blockingMode == "all-apps",
       "liveActivityEnabled": ActivityAuthorizationInfo().areActivitiesEnabled]
    }
    AsyncFunction("authorize") { () async throws in
      guard #available(iOS 16.2, *) else { throw ReadingFocusFailure.unavailable }
      guard ReadingFocusStore.pilotEnabled else { throw ReadingFocusFailure.unavailable }
      if await ReadingFocusStore.resolvedAuthorization(timeoutMs: 500) == .denied {
        try ReadingFocusStore.locked { _ = try ReadingFocusStore.allowedAppsAuthorizationLocked(.denied) }
      }
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
    AsyncFunction("allowedAppsStatus") { (accountId: String) throws -> String in
      guard #available(iOS 16.2, *) else { throw ReadingFocusFailure.unavailable }
      return String(decoding: try JSONEncoder().encode(ReadingFocusStore.allowedAppsStatus(accountId: accountId)), as: UTF8.self)
    }.runOnQueue(.main)
    AsyncFunction("selectAllowedApps") { (accountId: String, expectedRevision: String?, promise: Promise) in
      guard #available(iOS 16.2, *) else { promise.reject(ReadingFocusFailure.unavailable); return }
      guard !self.allowedAppsPickerPresented,
        let controller = self.appContext?.utilities?.currentViewController() else { promise.reject(ReadingFocusFailure.unavailable); return }
      do {
        let (selection, revision, context) = try ReadingFocusStore.allowedAppsSelection(accountId: accountId, expectedRevision: expectedRevision)
        let before = try ReadingFocusStore.allowedAppsStatus(accountId: accountId, activate: false)
        let view = ReadingAllowedAppsSelectionView(selection: selection, save: { value in
          let status = try ReadingFocusStore.saveAllowedApps(value, accountId: accountId, expectedRevision: revision, expectedContext: context)
          let encoded = String(decoding: try JSONEncoder().encode(status), as: UTF8.self)
          self.allowedAppsPickerPresented = false
          controller.dismiss(animated: true); promise.resolve(encoded)
        }, cancel: {
          // Cancel is not an error and never saves the draft. Do not reactivate
          // a former account if it changed while the picker was presented.
          let status = (try? ReadingFocusStore.allowedAppsStatus(accountId: accountId, activate: false)) ?? before
          self.allowedAppsPickerPresented = false
          controller.dismiss(animated: true)
          promise.resolve(String(decoding: (try? JSONEncoder().encode(status)) ?? Data(), as: UTF8.self))
        })
        let host = UIHostingController(rootView: view)
        host.isModalInPresentation = true
        self.allowedAppsPickerPresented = true
        controller.present(host, animated: true)
      } catch { promise.reject(error) }
    }.runOnQueue(.main)
    AsyncFunction("start") { (accountId: String, sessionId: String, deviceId: String, book: String, budgetMs: Double, targetMs: Double) async throws -> String in
      guard #available(iOS 16.2, *) else { throw ReadingFocusFailure.unavailable }
      let isNewSession = try ReadingFocusStore.locked { try ReadingFocusStore.read() == nil }
      let session = try ReadingFocusStore.start(accountId: accountId, sessionId: sessionId, deviceId: deviceId, book: book, budgetMs: budgetMs, targetMs: targetMs)
      let liveActivity = await ReadingFocusStore.liveActivityStatus(accountId: accountId, sessionId: sessionId, createIfMissing: isNewSession)
      // The transient activity result is returned, not persisted in the journal.
      return try self.encodeSession(session, liveActivity: liveActivity)
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
      return try self.encodeSession(session)
    }
    AsyncFunction("pause") { () async throws -> String? in
      guard #available(iOS 16.2, *) else { return nil }
      guard ReadingFocusStore.pilotEnabled else { return nil }
      let session = try await ReadingFocusStore.pauseAndUpdateActivity()
      guard let session else { return nil }
      return try self.encodeSession(session)
    }
    AsyncFunction("resume") { (accountId: String, sessionId: String, expectedGeneration: String) async throws -> String in
      guard #available(iOS 16.2, *) else { throw ReadingFocusFailure.unavailable }
      let session = try await ReadingFocusStore.resume(accountId: accountId, sessionId: sessionId, generation: expectedGeneration)
      return try self.encodeSession(session)
    }
    AsyncFunction("finish") { (accountId: String, sessionId: String, expectedGeneration: String) async throws -> String in
      guard #available(iOS 16.2, *) else { throw ReadingFocusFailure.unavailable }
      let session = try await ReadingFocusStore.finish(accountId: accountId, sessionId: sessionId, generation: expectedGeneration)
      return try self.encodeSession(session)
    }
    // Monotonic clock (counts sleep, unaffected by the phone's date) and boot identity. JS anchors it to
    // a server time, so an approach started without internet is placed by real time, not by the settings.
    AsyncFunction("clock") { () throws -> [String: Any] in
      guard #available(iOS 16.2, *) else { throw ReadingFocusFailure.unavailable }
      return try ReadingFocusStore.locked { () throws -> [String: Any] in ["uptimeMs": ReadingFocusStore.uptimeMs(), "bootId": try ReadingFocusStore.bootId()] }
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
    AsyncFunction("configurePageReminder") { (accountId: String, sessionId: String, challengeId: String) throws in
      guard #available(iOS 16.2, *) else { return }
      try ReadingFocusStore.configurePageReminder(accountId: accountId, sessionId: sessionId, challengeId: challengeId)
    }
  }
}

@available(iOS 16.2, *)
private struct ReadingAllowedAppsSelectionView: View {
  @State var selection: FamilyActivitySelection
  @State private var error: String?
  let save: (FamilyActivitySelection) throws -> Void
  let cancel: () -> Void
  var body: some View {
    NavigationStack {
      VStack(spacing: 12) {
        Text("Выберите отдельные читалки, например Apple Books или Яндекс Книги. Они останутся доступны во время чтения. iOS скрывает выбор от Divergents: мы не можем проверить, что это только книги.")
          .font(.footnote).foregroundStyle(.secondary).padding(.horizontal)
        if let error { Text(error).font(.footnote).foregroundStyle(.red).padding(.horizontal).accessibilityAddTraits(.isStaticText) }
        FamilyActivityPicker(selection: $selection)
      }
      .navigationTitle("Разрешённые приложения")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Отмена", action: cancel) }
        ToolbarItem(placement: .confirmationAction) { Button("Сохранить") {
          do { try save(selection) } catch { self.error = error.localizedDescription }
        } }
      }
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
