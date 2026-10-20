import DeviceActivity
import Foundation

class ReadingFocusMonitor: DeviceActivityMonitor {
  override func intervalWillEndWarning(for activity: DeviceActivityName) { finish(activity) }
  override func intervalDidEnd(for activity: DeviceActivityName) { finish(activity) }
  private func finish(_ activity: DeviceActivityName) {
    guard activity == ReadingFocusStore.activityName else { return }
    // An early/late OS callback does not grant time. Native monotonic elapsed is the source.
    // Early callback leaves the shield until the scheduled end or explicit pause.
    guard let session = try? ReadingFocusStore.snapshot() else { return }
    if ReadingFocusStore.remaining(session) <= 0 {
      _ = try? ReadingFocusStore.pause()
      Task { await ReadingFocusStore.endActivity() }
    }
  }
}
