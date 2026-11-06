/** Shared layout contract: scroll content must clear the entire floating dock. */
// Ячейка вкладки 60 + внутренний отступ панели 4 сверху и снизу (handoff 2026-10-20, §2.1).
export const TAB_DOCK_HEIGHT = 68;
export const TAB_DOCK_GUTTER = 14;
export const TAB_DOCK_MAX_WIDTH = 720;
export const TAB_DOCK_PLAYER_GAP = 8;

/** The text widths come from native layout in the bold font (the widest state).
 * Keep 44pt touch targets; distribute surplus space evenly. */
export function tabDockItemWidths(labelWidths: readonly number[], width: number): number[] {
  if (!labelWidths.length) return [];
  const minimum = Math.min(44, width / labelWidths.length);
  const needs = labelWidths.map(textWidth => Math.max(0, textWidth + 4 - minimum));
  const total = needs.reduce((sum, need) => sum + need, 0);
  const remaining = Math.max(0, width - minimum * labelWidths.length);
  if (!total) return labelWidths.map(() => width / labelWidths.length);
  const scale = Math.min(1, remaining / total);
  const extra = Math.max(0, remaining - total) / labelWidths.length;
  return needs.map(need => minimum + need * scale + extra);
}

/** MiniPlayer has 48pt controls, two text lines, 12pt padding and a 2pt track. */
export function tabDockMiniPlayerHeight(titleLineHeight: number, subtitleLineHeight: number, fontScale: number): number {
  return Math.ceil(Math.max(48, (titleLineHeight + subtitleLineHeight) * fontScale + 1) + 14.5);
}

export function tabDockBottomInset(safeAreaBottom: number): number {
  return Math.max(12, safeAreaBottom) + 8;
}

export function tabDockContentInset(safeAreaBottom: number, miniPlayerHeight = 0): number {
  return tabDockBottomInset(safeAreaBottom) + TAB_DOCK_HEIGHT + 12
    + (miniPlayerHeight > 0 ? miniPlayerHeight + TAB_DOCK_PLAYER_GAP : 0);
}
