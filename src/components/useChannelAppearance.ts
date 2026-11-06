import { useTheme } from '../theme/ThemeContext';

/** Channel layout uses the same personalised colours as the rest of the app. */
export function useChannelAppearance() {
  const { T, isDark, textScale } = useTheme();
  return {
    isDark, textScale, glassInk: '#FFFFFF',
    background: T.groupedBg,
    surface: T.cardBg,
    bubble: T.cardBg,
    label: T.label,
    secondary: T.labelSecondary,
    accent: T.brandText,
    reaction: T.fillTertiary,
    selected: T.brandTintedStrong,
    separator: T.separator,
    search: T.fillTertiary,
  };
}
