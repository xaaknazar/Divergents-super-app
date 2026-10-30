import React from 'react';
import { Text, View } from 'react-native';
import { formatPrice } from '../data/api';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { ContentBlock } from './ContentBlock';
import { SF } from './SFIcon';

export function CourseAccessCard({ gifted, canBuy, price, priceLabel }: { gifted: boolean; canBuy: boolean; price: number; priceLabel?: string }) {
  const { T, ty } = useTheme();
  return <ContentBlock><View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <SF name={gifted ? 'gift.fill' : 'lock.fill'} size={22} color={T.brandText} />
      <Text accessibilityRole="header" style={[ty.headline, { color: T.label, flex: 1 }]}>
        {gifted ? tr('Курс открыт для вас бесплатно') : canBuy ? tr('Полный доступ к курсу') : tr('Курс пока не открыт')}
      </Text>
    </View>
    {canBuy && !gifted ? <Text style={[ty.title1, { color: T.brandText }]}>{priceLabel ?? formatPrice(price)}</Text> : null}
    <Text style={[ty.body, { color: T.labelSecondary }]}>{gifted
      ? tr('Это подарок участникам, которые пришли раньше всех. Курс появится в разделе «Мои курсы».')
      : canBuy ? tr('Разовая оплата — курс останется у вас навсегда и появится в разделе «Мои курсы».')
        : tr('Когда доступ будет открыт, курс появится в разделе «Мои курсы».')}</Text>
  </View></ContentBlock>;
}
