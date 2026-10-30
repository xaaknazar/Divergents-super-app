import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { fmtInt } from '../data/format';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { ResultMetric } from './ResultMetric';
import { Wrapper } from './Wrapper';

/** Equal-width, stretched cards; narrow/large-text layouts use one full-width column. */
export function ChallengeResultMetrics({ pages, steps, sugarDays }: { pages: number; steps: number; sugarDays: number }) {
  const { width, fontScale } = useWindowDimensions();
  const { textScale } = useTheme();
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  const stacked = (availableWidth ?? width - 32) < 332 * fontScale * textScale;
  return <Wrapper marginHorizontal={16} onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}>
    <Wrapper dir={stacked ? 'column' : 'row'} gap={10} align="stretch" testID="result-metrics-layout">
      <Wrapper flex={stacked ? undefined : 1}><ResultMetric kind="reading" value={fmtInt(pages)} label={tr('страниц')} /></Wrapper>
      <Wrapper flex={stacked ? undefined : 1}><ResultMetric kind="walking" value={fmtInt(steps)} label={tr('шагов')} /></Wrapper>
      <Wrapper flex={stacked ? undefined : 1}><ResultMetric kind="sugar" value={fmtInt(sugarDays)} label={tr('дней без сахара')} /></Wrapper>
    </Wrapper>
  </Wrapper>;
}
