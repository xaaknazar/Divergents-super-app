import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Skeleton } from './Skeleton';
import { Wrapper } from './Wrapper';

export function CourseCardSkeleton() {
  const { T } = useTheme();
  return <View style={{ backgroundColor: T.cardBg, borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' }}>
    <Skeleton variant="cover" />
    <Wrapper padding={12} gap={8}>
      <Wrapper width="80%"><Skeleton variant="title" /></Wrapper>
      <Wrapper width="55%"><Skeleton /></Wrapper>
      <Wrapper width="40%"><Skeleton /></Wrapper>
    </Wrapper>
  </View>;
}
