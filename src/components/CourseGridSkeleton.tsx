import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { CourseCardSkeleton } from './CourseCardSkeleton';
import { Wrapper } from './Wrapper';

export function CourseGridSkeleton({ count = 4 }: { count?: number }) {
  const { width, fontScale } = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState<number>();
  const { textScale = 1 } = useTheme();
  const singleColumn = Math.min(layoutWidth ?? width, width) < 350 || fontScale * textScale > 1.3;
  return <View accessible accessibilityLabel="Загрузка каталога" accessibilityState={{ busy: true }}>
    <Wrapper dir="row" wrap justify="space-between" gap={14} paddingHorizontal={16}
      onLayout={event => setLayoutWidth(event.nativeEvent.layout.width)}>
      {Array.from({ length: count }).map((_, i) => <Wrapper key={i} width={singleColumn ? '100%' : '47.5%'}>
        <CourseCardSkeleton />
      </Wrapper>)}
    </Wrapper>
  </View>;
}
