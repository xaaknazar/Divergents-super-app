package kz.divergents.reading

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.content.Intent

class ReadingBlockService : AccessibilityService() {
  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val name = event.packageName?.toString() ?: return
    if (name == packageName || name == "com.android.settings" || name == "com.android.systemui") return
    try {
      val session = ReadingFocusStore.snapshot(this) ?: return
      if (session.getString("status") != "running" || name !in ReadingFocusStore.selected(this)) return
      startActivity(Intent(this, ReadingShieldActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP))
    } catch (_: Exception) {
      // Fail open on local storage/system failure, never trap the user in an app.
      try { ReadingFocusStore.pause(this) } catch (_: Exception) {}
    }
  }
  override fun onInterrupt() { try { ReadingFocusStore.pause(this) } catch (_: Exception) {} }
}
