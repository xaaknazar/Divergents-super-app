import React from 'react';
import { Pressable } from 'react-native';
import { minTouch } from '../theme/tokens';
import { SF } from './SFIcon';
import { hSelect } from '../lib/haptics';

export function NavRoundButton({
  icon, onPress, scheme = 'dark', accessibilityLabel,
}: { icon: string; onPress?: () => void; scheme?: 'light' | 'dark'; accessibilityLabel: string }) {
  const size = 34;
  const dark = scheme === 'dark';
  const controlSize = Math.max(size, minTouch);
  return (
    <Pressable
      onPress={onPress ? () => { hSelect(); onPress(); } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      style={({ pressed }) => ({
        width: controlSize, height: controlSize, borderRadius: controlSize / 2,
        borderCurve: 'continuous',
        backgroundColor: dark ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.82)',
        alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
        // Кнопка лежит на фотографии, а не на фоне экрана. На светлом снимке
        // белый круг сливался с ним — тонкая рамка и тень отделяют его от
        // любого кадра, не утяжеляя вид.
        borderWidth: 0.5,
        borderColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)',
        shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 }, elevation: 2,
      })}>
      {/* Цвет иконки НЕ берём из темы. Раньше здесь стоял `T.label`, а в тёмной
          теме он белый — и белая иконка на почти белом круге пропадала: на
          карточке поездки кнопки «назад», «в избранное» и «поделиться» были
          пустыми кружками. Круг светлый всегда (он поверх фото), значит и
          иконка на нём всегда тёмная. */}
      <SF name={icon} size={Math.round(size * 0.47)} color={dark ? '#fff' : '#1C1C1E'} />
    </Pressable>
  );
}
