package kz.divergents.reading

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class ReadingShieldActivity : Activity() {
  private val handler = Handler(Looper.getMainLooper())
  private val tick = object : Runnable {
    override fun run() {
      val active = try { ReadingFocusStore.snapshot(this@ReadingShieldActivity)?.getString("status") == "running" } catch (_: Exception) { false }
      if (!active) finish() else handler.postDelayed(this, 1000)
    }
  }
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(40, 80, 40, 40) }
    layout.addView(TextView(this).apply { text = "Сейчас время для книги"; textSize = 28f })
    layout.addView(TextView(this).apply { text = "Это приложение выбрано вами для ограничения. Можно поставить чтение на паузу и внести страницы в Divergents."; textSize = 18f })
    layout.addView(Button(this).apply {
      text = "Пауза — снять ограничение"
      setOnClickListener { try { ReadingFocusStore.pause(this@ReadingShieldActivity) } finally { finish() } }
    })
    setContentView(layout); handler.post(tick)
  }
  override fun onDestroy() { handler.removeCallbacks(tick); super.onDestroy() }
}
