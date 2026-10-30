import DeviceActivity
import Foundation

class ReadingFocusMonitor: DeviceActivityMonitor {
  override func intervalWillEndWarning(for activity: DeviceActivityName) { finish(activity) }
  override func intervalDidEnd(for activity: DeviceActivityName) { finish(activity) }
  private func finish(_ activity: DeviceActivityName) {
    // The warning is the requested deadline for final segments shorter than
    // DeviceActivity's 15-minute interval. An early callback ends the segment
    // using actual monotonic elapsed; it never grants the remaining budget.
    // The store validates the monitor's session under lock and fails open for
    // corrupt/missing journals; already-paused sessions keep their frozen card.
    ReadingFocusStore.finishMonitoredInterval(activity)
  }
}
