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
  }
}
