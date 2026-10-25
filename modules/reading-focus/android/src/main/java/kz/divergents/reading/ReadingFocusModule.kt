package kz.divergents.reading

import android.app.AlertDialog
import android.content.Intent
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ReadingFocusModule : Module() {
  private fun context() = requireNotNull(appContext.reactContext)
  override fun definition() = ModuleDefinition {
    Name("ReadingFocus")
    AsyncFunction("capabilities") {
      val c = context()
      mapOf("available" to ReadingFocusStore.enabled(c), "authorized" to ReadingFocusStore.authorized(c),
        "selectedCount" to ReadingFocusStore.selected(c).size, "platform" to "android")
    }
    AsyncFunction("authorize") { promise: Promise ->
      val activity = requireNotNull(appContext.currentActivity)
      check(ReadingFocusStore.enabled(activity))
      activity.runOnUiThread {
        if (Build.VERSION.SDK_INT >= 33 && activity.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
          activity.requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 6040)
          promise.resolve(null)
          return@runOnUiThread
        }
        AlertDialog.Builder(activity).setTitle("Блокировка только на время чтения")
          .setMessage("Divergents использует специальные возможности, чтобы определять открытое приложение и ограничивать выбранные вами соцсети и браузеры. Содержимое экрана, сообщения и вводимый текст не читаются и не отправляются. Доступ можно отключить в настройках.")
          .setNegativeButton("Не сейчас") { _, _ -> promise.resolve(null) }
          .setPositiveButton("Согласен, открыть настройки") { _, _ ->
            activity.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)); promise.resolve(null)
          }.setOnCancelListener { promise.resolve(null) }.show()
      }
    }
    AsyncFunction("selectApps") { promise: Promise ->
      val activity = requireNotNull(appContext.currentActivity)
      check(ReadingFocusStore.enabled(activity))
      val home = activity.packageManager.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)?.activityInfo?.packageName
      val dialer = activity.getSystemService(android.telecom.TelecomManager::class.java)?.defaultDialerPackage
      val apps = activity.packageManager.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
        .filter { it.activityInfo.packageName !in setOf(activity.packageName, home, dialer, "com.android.settings", "com.android.dialer", "com.google.android.dialer", "com.android.phone") }
        .distinctBy { it.activityInfo.packageName }.sortedBy { it.loadLabel(activity.packageManager).toString() }
      val selected = ReadingFocusStore.selected(activity).toMutableSet()
      activity.runOnUiThread {
        AlertDialog.Builder(activity).setTitle("Соцсети и браузеры")
          .setMultiChoiceItems(apps.map { it.loadLabel(activity.packageManager).toString() }.toTypedArray(), BooleanArray(apps.size) { apps[it].activityInfo.packageName in selected }) { _, index, checked ->
            val pkg = apps[index].activityInfo.packageName; if (checked) selected.add(pkg) else selected.remove(pkg)
          }.setPositiveButton("Сохранить") { _, _ ->
            try { ReadingFocusStore.select(activity, selected); promise.resolve(null) } catch (e: Exception) { promise.reject("storage", e.message, e) }
          }.setNegativeButton("Отмена") { _, _ -> promise.resolve(null) }.setOnCancelListener { promise.resolve(null) }.show()
      }
    }
    AsyncFunction("start") { account: String, id: String, device: String, book: String, budget: Double, target: Double ->
      val c = context()
      val value = ReadingFocusStore.start(c, account, id, device, book, budget, target)
      try { c.startForegroundService(Intent(c, ReadingTimerService::class.java)) }
      catch (e: Exception) { ReadingFocusStore.pause(c); throw e }
      value.toString()
    }
    AsyncFunction("snapshot") { ReadingFocusStore.snapshot(context())?.toString() }
    AsyncFunction("pause") {
      val c = context(); val result = ReadingFocusStore.pause(c)
      c.stopService(Intent(c, ReadingTimerService::class.java)); result?.toString()
    }
    // Sleep-aware monotonic clock + boot identity; JS anchors it to a server time for offline starts.
    AsyncFunction("clock") { ReadingFocusStore.clock(context()) }
    AsyncFunction("remainingMs") { ReadingFocusStore.snapshot(context())?.let { ReadingFocusStore.remaining(it) } ?: 0.0 }
    AsyncFunction("acknowledge") { account: String, id: String -> ReadingFocusStore.acknowledge(context(), account, id) }
    AsyncFunction("configurePageReminder") { account: String, id: String, challenge: String ->
      ReadingFocusStore.configurePageReminder(context(), account, id, challenge)
    }
    AsyncFunction("endLiveActivities") { ReadingFocusStore.muteReminders(context()) }
  }
}
