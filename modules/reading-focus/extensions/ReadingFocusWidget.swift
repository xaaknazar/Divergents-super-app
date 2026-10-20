import WidgetKit
import SwiftUI
import ActivityKit

@main
struct ReadingFocusWidgets: WidgetBundle {
  var body: some Widget { ReadingFocusWidget() }
}

struct ReadingFocusWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ReadingActivityAttributes.self) { context in
      VStack(alignment: .leading, spacing: 12) {
        Label("Время для книги", systemImage: "book.fill").font(.headline)
        Text(context.attributes.book).lineLimit(1)
        Text(context.state.end, style: .timer).font(.largeTitle.monospacedDigit())
        Text("До часа — обратный отсчёт, затем — дополнительное время").font(.caption)
        if #available(iOS 17.0, *) { Button(intent: PauseReadingIntent()) { Label("Пауза", systemImage: "pause.fill") } }
      }
      .padding().activityBackgroundTint(Color(red: 0.14, green: 0.25, blue: 0.53)).foregroundStyle(.white)
      .widgetURL(URL(string: "divergents://community"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) { Image(systemName: "book.fill") }
        DynamicIslandExpandedRegion(.trailing) { Text(context.state.end, style: .timer).monospacedDigit() }
        DynamicIslandExpandedRegion(.bottom) {
          if #available(iOS 17.0, *) { Button(intent: PauseReadingIntent()) { Label("Пауза", systemImage: "pause.fill") } }
        }
      } compactLeading: { Image(systemName: "book.fill") }
        compactTrailing: { Text(context.state.end, style: .timer).monospacedDigit().frame(width: 64) }
        minimal: { Image(systemName: "book.fill") }
    }
  }
}
