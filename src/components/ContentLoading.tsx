import React from 'react';
import { ActivityIndicator,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function ContentLoading({ label = 'Загрузка' }: { label?: string }) {
  const { T } = useTheme();
  return <View style={{ paddingVertical: 28, alignItems: 'center' }}><ActivityIndicator accessibilityLabel={label} color={T.brand} /></View>;
}
