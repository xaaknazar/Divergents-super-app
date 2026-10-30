import React from 'react';
import { Text, View } from 'react-native';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { ContentBlock } from './ContentBlock';
import { SF } from './SFIcon';

export function CourseAccessCard({ gifted, canBuy }: { gifted: boolean; canBuy: boolean }) {
  const { T, ty } = useTheme();
  return <ContentBlock><View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <SF name={gifted ? 'gift.fill' : 'lock.fill'} size={22} color={T.brandText} />
      <Text accessibilityRole="header" style={[ty.headline, { color: T.label, flex: 1 }]}>
        {gifted ? tr('Курс открыт для вас бесплатно') : canBuy ? tr('Полный доступ к курсу') : tr('Курс пока не открыт')}
      </Text>
    </View>
    <Text style={[ty.body, { color: T.labelSecondary }]}>{gifted
      ? tr('Это подарок участникам, которые пришли раньше всех. Курс появится в разделе «Мои курсы».')
      : canBuy ? tr('Все уроки и материалы без подписки. После покупки курс появится в «Моих курсах».')
        : tr('Когда доступ будет открыт, курс появится в разделе «Мои курсы».')}</Text>
  </View></ContentBlock>;
}
