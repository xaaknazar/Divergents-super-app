import { useTheme } from '../theme/ThemeContext';

/** Scoped messenger appearance. Other sections keep the Divergents type system. */
export function useChannelAppearance() {
  const { isDark, textScale, reduceTransparency } = useTheme();
  return {
    isDark, textScale, glassInk: isDark || reduceTransparency ? '#FFFFFF' : '#17191D',
    background: isDark ? '#000000' : '#EEF1F5',
    surface: isDark ? '#1C1C1E' : '#FFFFFF',
    bubble: isDark ? '#292630' : '#FFFFFF',
    label: isDark ? '#FFFFFF' : '#15171B',
    secondary: isDark ? '#B3AFB9' : '#656A73',
    accent: isDark ? '#85B6FF' : '#234088',
    reaction: isDark ? '#403A49' : '#EDF1F7',
    selected: isDark ? '#314B6D' : '#DCE8F9',
    separator: isDark ? '#343239' : '#E1E4E9',
    search: isDark ? '#2B2B2D' : '#E3E7EC',
  };
}
