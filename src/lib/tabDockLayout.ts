/** Shared layout contract: scroll content must clear the entire floating dock. */
// Ячейка вкладки 60 + внутренний отступ панели 4 сверху и снизу (handoff 2026-10-20, §2.1).
export const TAB_DOCK_HEIGHT = 68;
export const TAB_DOCK_GUTTER = 14;
export const TAB_DOCK_MAX_WIDTH = 720;
export const TAB_DOCK_PLAYER_GAP = 8;

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
