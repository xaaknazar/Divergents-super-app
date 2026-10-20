import WidgetKit
import SwiftUI
import ActivityKit

private let readingBrand = Color(red: 35 / 255, green: 64 / 255, blue: 136 / 255)

@main
struct ReadingFocusWidgets: WidgetBundle {
  var body: some Widget { ReadingFocusWidget() }
}

struct ReadingFocusWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ReadingActivityAttributes.self) { context in
      ReadingLockScreenCard(book: context.attributes.book, state: context.state, sessionId: context.attributes.sessionId)
      .activityBackgroundTint(readingBrand)
      .activitySystemActionForegroundColor(.white)
      .widgetURL(URL(string: "divergents://community"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 8) {
            DivergentsMark().frame(width: 22, height: 28)
            Text(ReadingActivityPhase(context.state).title).font(.subheadline.weight(.semibold))
              .lineLimit(1).fixedSize()
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          ReadingActivityTime(state: context.state).font(.title3.monospacedDigit())
            .lineLimit(1).minimumScaleFactor(0.7)
        }
        DynamicIslandExpandedRegion(.bottom) {
          if #available(iOS 17.0, *) {
            ReadingActivityControls(state: context.state, sessionId: context.attributes.sessionId)
          }
        }
      } compactLeading: {
        DivergentsMark().frame(width: 16, height: 20)
      }
        compactTrailing: {
          ReadingActivityTime(state: context.state).font(.subheadline.monospacedDigit())
            .lineLimit(1).minimumScaleFactor(0.7).frame(width: 64)
        }
        minimal: { DivergentsMark().frame(width: 16, height: 20) }
    }
  }
}

/** What the card can truthfully offer: a soft pause can resume; a finished
 approach is sealed and must be completed in the app, so it has no button. */
enum ReadingActivityPhase {
  case running, paused, needsApp, finished
  init(_ state: ReadingActivityAttributes.ContentState) {
    if state.status != "paused" { self = .running }
    else if state.terminal == true { self = .finished }
    else if state.canResume == true && state.errorMessage == nil { self = .paused }
    else { self = .needsApp }
  }
  var title: String {
    switch self {
    case .running: return "Чтение"
    case .paused: return "Пауза"
    case .needsApp: return "Пауза"
    case .finished: return "Подход завершён"
    }
  }
  var caption: String {
    switch self {
    case .running: return "Чтение"
    case .paused: return "Пауза · время стоит"
    case .needsApp: return "Откройте Divergents"
    case .finished: return "Подход завершён"
    }
  }
}

/** One dense row: mark, large digits, one action. The book stays in the app. */
struct ReadingLockScreenCard: View {
  let book: String
  let state: ReadingActivityAttributes.ContentState
  let sessionId: String?
  var body: some View {
    let phase = ReadingActivityPhase(state)
    HStack(alignment: .center, spacing: 12) {
      DivergentsMark().frame(width: 30, height: 38).accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 0) {
        ReadingActivityTime(state: state)
          .font(.system(size: 40, weight: .semibold, design: .rounded).monospacedDigit())
          .lineLimit(1).minimumScaleFactor(0.6)
        Text(phase.caption).font(.footnote.weight(.medium)).foregroundStyle(.white.opacity(0.78))
          .lineLimit(1).minimumScaleFactor(0.8)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .accessibilityElement(children: .combine)
      .accessibilityLabel("\(phase.title), \(book)")
      if #available(iOS 17.0, *) {
        ReadingActivityControls(state: state, sessionId: sessionId)
      }
    }
    .padding(.horizontal, 16).padding(.vertical, 14)
    .foregroundStyle(.white)
  }
}

/** A paused value is plain text: the system must not continue its countdown. */
struct ReadingActivityTime: View {
  let state: ReadingActivityAttributes.ContentState
  var body: some View {
    if state.status == "paused" {
      Text(Self.pausedTime(state.pausedRemainingMs ?? 0))
    } else {
      // System-driven updates survive suspension and count up past the goal.
      Text(state.end, style: .timer)
    }
  }
  static func pausedTime(_ milliseconds: Double) -> String {
    let seconds = Int(milliseconds < 0 ? floor(abs(milliseconds) / 1000) : ceil(milliseconds / 1000))
    let hours = seconds / 3600
    let minutes = (seconds % 3600) / 60
    let suffix = String(format: "%02d", seconds % 60)
    let value = hours > 0 ? "\(hours):\(String(format: "%02d", minutes)):\(suffix)" : "\(minutes):\(suffix)"
    return milliseconds < 0 ? "+\(value)" : value
  }
}

@available(iOS 17.0, *)
struct ReadingActivityControls: View {
  let state: ReadingActivityAttributes.ContentState
  let sessionId: String?
  var body: some View {
    switch ReadingActivityPhase(state) {
    case .running:
      Button(intent: PauseReadingIntent(sessionId: sessionId, generation: state.generation)) {
        ReadingActivityActionLabel(title: "Пауза", systemImage: "pause.fill")
      }
      .buttonStyle(.plain)
      .accessibilityLabel("Пауза")
      .accessibilityHint("Остановить отсчёт и снять ограничения приложений")
    case .paused:
      Button(intent: ResumeReadingIntent(sessionId: sessionId, generation: state.generation)) {
        ReadingActivityActionLabel(title: "Возобновить", systemImage: "play.fill")
      }
      .buttonStyle(.plain)
      .accessibilityLabel("Возобновить")
      .accessibilityHint("Продолжить чтение с сохранённого места и снова включить ограничения приложений")
    case .needsApp, .finished:
      // Not a control: the whole card opens Divergents through widgetURL.
      ReadingActivityActionLabel(title: "Открыть", systemImage: "arrow.up.forward.app.fill", outlined: true)
        .accessibilityLabel("Откройте Divergents, чтобы продолжить")
    }
  }
}

struct ReadingActivityActionLabel: View {
  let title: String
  let systemImage: String
  var outlined = false
  var body: some View {
    ViewThatFits(in: .horizontal) {
      Label(title, systemImage: systemImage).font(.subheadline.weight(.semibold)).fixedSize()
      Image(systemName: systemImage).font(.title3.weight(.semibold))
    }
      .padding(.horizontal, 14).frame(minHeight: 44)
      .foregroundStyle(outlined ? Color.white : readingBrand)
      .background(outlined ? Color.white.opacity(0.16) : Color.white, in: Capsule())
  }
}

/** The Divergents η-mark from src/components/Logo.tsx, white on the navy card. */
struct DivergentsMark: View {
  var body: some View {
    ZStack {
      DivergentsMarkBody().fill(Color.white)
      DivergentsMarkHead().fill(Color.white)
    }
    .aspectRatio(1260 / 1590, contentMode: .fit)
  }
}

// Coordinates are the SVG paths normalized to the logo's 1260x1590 viewBox.
private struct DivergentsMarkBody: Shape {
  func path(in rect: CGRect) -> Path {
    func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * rect.width, y: rect.minY + y * rect.height) }
    var path = Path()
    path.move(to: p(0.94643, 0.17903))
    path.addCurve(to: p(0.03673, 0.41860), control1: p(0.93455, 0.18165), control2: p(0.03928, 0.41742))
    path.addCurve(to: p(0.02447, 0.42936), control1: p(0.03161, 0.42098), control2: p(0.02736, 0.42471))
    path.addCurve(to: p(0.02759, 0.45503), control1: p(0.01952, 0.43734), control2: p(0.02081, 0.44797))
    path.addCurve(to: p(0.12106, 0.51123), control1: p(0.02994, 0.45748), control2: p(0.05069, 0.46995))
    path.addCurve(to: p(0.21667, 0.56626), control1: p(0.17531, 0.54304), control2: p(0.21357, 0.56507))
    path.addCurve(to: p(0.22937, 0.56818), control1: p(0.22140, 0.56808), control2: p(0.22244, 0.56823))
    path.addLine(to: p(0.23690, 0.56812))
    path.addLine(to: p(0.48690, 0.50081))
    path.addLine(to: p(0.73690, 0.43350))
    path.addLine(to: p(0.73711, 0.45621))
    path.addCurve(to: p(0.73580, 0.66937), control1: p(0.73722, 0.46871), control2: p(0.73663, 0.56463))
    path.addCurve(to: p(0.73527, 0.86308), control1: p(0.73460, 0.82069), control2: p(0.73449, 0.86049))
    path.addCurve(to: p(0.74418, 0.87554), control1: p(0.73669, 0.86787), control2: p(0.73983, 0.87225))
    path.addCurve(to: p(0.93590, 0.98743), control1: p(0.75088, 0.88061), control2: p(0.93051, 0.98544))
    path.addCurve(to: p(0.95780, 0.98996), control1: p(0.94270, 0.98994), control2: p(0.95095, 0.99089))
    path.addCurve(to: p(0.97441, 0.98451), control1: p(0.96366, 0.98916), control2: p(0.97035, 0.98696))
    path.addCurve(to: p(0.98370, 0.97267), control1: p(0.97820, 0.98222), control2: p(0.98228, 0.97702))
    path.addCurve(to: p(0.98490, 0.58493), control1: p(0.98479, 0.96931), control2: p(0.98492, 0.92873))
    path.addCurve(to: p(0.98408, 0.19819), control1: p(0.98489, 0.32845), control2: p(0.98462, 0.20003))
    path.addCurve(to: p(0.96617, 0.18070), control1: p(0.98193, 0.19081), control2: p(0.97477, 0.18382))
    path.addCurve(to: p(0.95486, 0.17888), control1: p(0.96271, 0.17944), control2: p(0.96016, 0.17903))
    path.addCurve(to: p(0.94643, 0.17903), control1: p(0.95109, 0.17877), control2: p(0.94730, 0.17884))
    path.closeSubpath()
    return path
  }
}

private struct DivergentsMarkHead: Shape {
  func path(in rect: CGRect) -> Path {
    func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * rect.width, y: rect.minY + y * rect.height) }
    var path = Path()
    path.move(to: p(0.36429, 0.00887))
    path.addCurve(to: p(0.25152, 0.06543), control1: p(0.31825, 0.01299), control2: p(0.27602, 0.03417))
    path.addCurve(to: p(0.25825, 0.20339), control1: p(0.21808, 0.10809), control2: p(0.22078, 0.16331))
    path.addCurve(to: p(0.29634, 0.23216), control1: p(0.26924, 0.21514), control2: p(0.28085, 0.22391))
    path.addCurve(to: p(0.49088, 0.21564), control1: p(0.35766, 0.26482), control2: p(0.43943, 0.25787))
    path.addCurve(to: p(0.53337, 0.14512), control1: p(0.51479, 0.19603), control2: p(0.52916, 0.17217))
    path.addCurve(to: p(0.53143, 0.10587), control1: p(0.53493, 0.13509), control2: p(0.53395, 0.11529))
    path.addCurve(to: p(0.39745, 0.00884), control1: p(0.51729, 0.05306), control2: p(0.46422, 0.01463))
    path.addCurve(to: p(0.36429, 0.00887), control1: p(0.38863, 0.00808), control2: p(0.37300, 0.00809))
    path.closeSubpath()
    return path
  }
}
