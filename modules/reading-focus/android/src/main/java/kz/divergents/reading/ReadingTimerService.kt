package kz.divergents.reading

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.os.Looper

class ReadingTimerService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private val tick = object : Runnable {
    override fun run() {
      try {
        val session = ReadingFocusStore.snapshot(this@ReadingTimerService)
        if (session == null || session.getString("status") != "running") { stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(); return }
        ReadingFocusStore.checkpoint(this@ReadingTimerService)
        val remaining = session.optDouble("targetMs", session.getDouble("budgetMs")) - (session.getDouble("budgetMs") - ReadingFocusStore.remaining(session))
        val seconds = (kotlin.math.abs(remaining) / 1000).toInt()
        val label = if (remaining > 0) "До часа" else "Дополнительно"
        getSystemService(NotificationManager::class.java).notify(6040, notification("$label ${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}"))
        handler.postDelayed(this, 1000)
      } catch (_: Exception) { try { ReadingFocusStore.pause(this@ReadingTimerService) } catch (_: Exception) {}
        stopForeground(STOP_FOREGROUND_REMOVE); stopSelf() }
    }
  }
  private fun notification(text: String): Notification {
    val pause = PendingIntent.getService(this, 60, Intent(this, ReadingTimerService::class.java).setAction("pause"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val builder = Notification.Builder(this, "reading-focus").setSmallIcon(android.R.drawable.ic_menu_agenda)
      .setContentTitle("Divergents · время для книги").setContentText(text).setOngoing(true).setOnlyAlertOnce(true)
      .setVisibility(Notification.VISIBILITY_PRIVATE).addAction(Notification.Action.Builder(android.graphics.drawable.Icon.createWithResource(this, android.R.drawable.ic_media_pause), "Пауза", pause).build())
    if (launch != null) builder.setContentIntent(PendingIntent.getActivity(this, 61, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
    return builder.build()
  }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == "pause") {
      try { ReadingFocusStore.pause(this) } finally { stopForeground(STOP_FOREGROUND_REMOVE); stopSelf() }
      return START_NOT_STICKY
    }
    getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel("reading-focus", "Таймер чтения", NotificationManager.IMPORTANCE_LOW))
    startForeground(6040, notification("Чтение началось"))
    handler.removeCallbacks(tick); handler.post(tick)
    return START_NOT_STICKY
  }
  override fun onDestroy() { handler.removeCallbacks(tick); super.onDestroy() }
  override fun onBind(intent: Intent?): IBinder? = null
}
