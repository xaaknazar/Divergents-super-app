import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Skeleton } from './Skeleton';
import { Wrapper } from './Wrapper';

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const { T } = useTheme();
  return <View accessible accessibilityLabel="Загрузка списка" accessibilityState={{ busy: true }}
    style={{ backgroundColor: T.cardBg, borderRadius: 12, borderCurve: 'continuous', overflow: 'hidden' }}>
    {Array.from({ length: rows }).map((_, i) => (
      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
        borderBottomWidth: i < rows - 1 ? 0.5 : 0, borderBottomColor: T.separator }}>
        <Skeleton variant="avatar" />
        <Wrapper flex={1} gap={7}>
          <Wrapper width="70%"><Skeleton variant="title" /></Wrapper>
          <Wrapper width="45%"><Skeleton /></Wrapper>
        </Wrapper>
      </View>
    ))}
  </View>;
}
