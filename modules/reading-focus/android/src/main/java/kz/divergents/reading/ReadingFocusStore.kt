package kz.divergents.reading

import android.content.Context
import android.content.pm.PackageManager
import android.os.SystemClock
import android.provider.Settings
import org.json.JSONObject

/** Single process; synchronous commit before shielding. System elapsedRealtime includes deep sleep. */
object ReadingFocusStore {
  private val processId = java.util.UUID.randomUUID().toString()
  private var emergencyPaused: JSONObject? = null
  private fun prefs(c: Context) = c.getSharedPreferences("reading-focus-v1", Context.MODE_PRIVATE)
  fun enabled(c: Context): Boolean = c.packageManager.getApplicationInfo(c.packageName, PackageManager.GET_META_DATA)
    .metaData?.getBoolean("DivergentsReadingFocusPilot", false) == true
  fun selected(c: Context): Set<String> = prefs(c).getStringSet("selected", emptySet())?.toSet() ?: emptySet()
  fun select(c: Context, values: Set<String>) {
    check(prefs(c).edit().putStringSet("selected", values).commit()) { "Не удалось сохранить выбор" }
  }
  fun authorized(c: Context): Boolean {
    val names = Settings.Secure.getString(c.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
    return names.split(':').any { android.content.ComponentName.unflattenFromString(it)?.className == ReadingBlockService::class.java.name }
  }
  private fun boot(c: Context): String = Settings.Global.getInt(c.contentResolver, Settings.Global.BOOT_COUNT, -1).also {
    check(it >= 0) { "Не удалось определить перезагрузку устройства" }
  }.toString()
  fun clock(c: Context): Map<String, Any> = mapOf("uptimeMs" to SystemClock.elapsedRealtime().toDouble(), "bootId" to boot(c))
  private fun read(c: Context): JSONObject? = emergencyPaused ?: prefs(c).getString("session", null)?.let { JSONObject(it) }
  private fun write(c: Context, value: JSONObject) {
    check(prefs(c).edit().putString("session", value.toString()).commit()) { "Не удалось сохранить сеанс" }
  }
  @Synchronized fun start(c: Context, account: String, id: String, device: String, book: String, budget: Double, target: Double): JSONObject {
    check(enabled(c) && authorized(c) && selected(c).isNotEmpty()) { "Сначала разрешите блокировку и выберите приложения" }
    require(budget > 0 && budget <= 86_400_000)
    val previous = read(c)
    if (previous != null) {
      check(previous.getString("sessionId") == id && previous.getString("accountId") == account) { "Сначала сохраните предыдущий сеанс" }
      return previous
    }
    val value = JSONObject().put("accountId", account).put("sessionId", id).put("deviceId", device).put("book", book)
      .put("budgetMs", budget).put("targetMs", target).put("anchorMs", SystemClock.elapsedRealtime()).put("bootId", boot(c))
      .put("processId", processId).put("checkpointMs", 0)
      .put("elapsedMs", JSONObject.NULL).put("integrity", "ok").put("status", "running")
    write(c, value)
    return value
  }
  fun remaining(value: JSONObject): Double = maxOf(0.0, value.getDouble("budgetMs") -
    if (value.isNull("elapsedMs")) maxOf(0.0, SystemClock.elapsedRealtime() - value.getDouble("anchorMs")) else value.getDouble("elapsedMs"))
  @Synchronized fun pause(c: Context): JSONObject? {
    val value = read(c) ?: return null
    if (value.getString("status") != "running") return value
    val rebooted = value.getString("bootId") != boot(c) || SystemClock.elapsedRealtime() < value.getDouble("anchorMs")
    val interrupted = value.optString("processId") != processId
    val elapsed = if (rebooted) 0.0 else if (interrupted) value.optDouble("checkpointMs", 0.0)
      else minOf(value.getDouble("budgetMs"), maxOf(0.0, SystemClock.elapsedRealtime() - value.getDouble("anchorMs")))
    value.put("elapsedMs", elapsed.toLong()).put("status", "paused")
      .put("integrity", if (rebooted) "rebooted" else if (interrupted || !authorized(c)) "revoked" else "ok")
    // Always stop blocking immediately, including if durable storage has failed.
    emergencyPaused = value
    write(c, value)
    emergencyPaused = null
    remindPages(c, value)
    return value
  }
  @Synchronized fun snapshot(c: Context): JSONObject? {
    if (!enabled(c)) return null
    val value = read(c) ?: return null
    if (value.getString("status") == "running" && (remaining(value) <= 0 || value.getString("bootId") != boot(c) || value.optString("processId") != processId || !authorized(c))) return pause(c)
    return value
  }
  @Synchronized fun checkpoint(c: Context) {
    val value = snapshot(c) ?: return
    if (value.getString("status") != "running") return
    val elapsed = value.getDouble("budgetMs") - remaining(value)
    if (elapsed - value.optDouble("checkpointMs", 0.0) >= 10000) {
      value.put("checkpointMs", elapsed.toLong()); write(c, value)
    }
  }
  @Synchronized fun acknowledge(c: Context, account: String, id: String) {
    val value = read(c) ?: return
    check(value.getString("accountId") == account && value.getString("sessionId") == id && value.getString("status") == "paused")
    check(prefs(c).edit().remove("session").commit())
    emergencyPaused = null
    cancelReminders(c)
  }
  @Synchronized fun configurePageReminder(c: Context, account: String, id: String, challenge: String) {
    val value = read(c) ?: return
    if (value.getString("accountId") != account || value.getString("sessionId") != id || challenge.isBlank()) return
    if (value.optString("reminderChallengeId") == challenge && !value.optBoolean("reminderMuted")) return
    value.put("reminderChallengeId", challenge).put("reminderMuted", false)
    write(c, value)
    if (value.getString("status") == "paused") remindPages(c, value)
  }
  @Synchronized fun remindGoal(c: Context) {
    val value = snapshot(c) ?: return
    if (value.getString("status") != "running" || value.optBoolean("goalReminderSent")) return
    val left = value.optDouble("targetMs", value.getDouble("budgetMs")) - (value.getDouble("budgetMs") - remaining(value))
    if (left > 0 || !remindersEnabled(value)) return
    value.put("goalReminderSent", true); write(c, value)
    showReminder(c, "Час чтения завершён", "Можно читать дальше. Когда закончите, сохраните страницы книги перед новым таймером.")
  }
  private fun remindersEnabled(value: JSONObject) = value.optString("reminderChallengeId").isNotBlank() && !value.optBoolean("reminderMuted")
  private fun remindPages(c: Context, value: JSONObject) {
    if (remindersEnabled(value)) showReminder(c, "Не забудьте записать страницы", "Сохраните прочитанные страницы книги — после этого можно начать новый таймер.")
  }
  private fun showReminder(c: Context, title: String, body: String) {
    // No book/account details on the lock screen. Denied notifications never
    // fail a timer, release of protection or durable evidence write.
    try {
      val manager = c.getSystemService(android.app.NotificationManager::class.java)
      manager.createNotificationChannel(android.app.NotificationChannel("reading-pages", "Страницы после чтения", android.app.NotificationManager.IMPORTANCE_DEFAULT))
      val builder = android.app.Notification.Builder(c, "reading-pages")
        .setSmallIcon(android.R.drawable.ic_menu_agenda).setContentTitle(title).setContentText(body)
        .setStyle(android.app.Notification.BigTextStyle().bigText(body)).setAutoCancel(true)
        .setVisibility(android.app.Notification.VISIBILITY_PRIVATE)
      c.packageManager.getLaunchIntentForPackage(c.packageName)?.let { launch ->
        builder.setContentIntent(android.app.PendingIntent.getActivity(c, 6041, launch,
          android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE))
      }
      manager.notify(6041, builder.build())
    } catch (_: Exception) { /* System permission/settings may suppress delivery. */ }
  }
  private fun cancelReminders(c: Context) { c.getSystemService(android.app.NotificationManager::class.java).cancel(6041) }
  @Synchronized fun muteReminders(c: Context) {
    read(c)?.let { value -> value.put("reminderMuted", true); write(c, value) }
    cancelReminders(c)
  }
}
