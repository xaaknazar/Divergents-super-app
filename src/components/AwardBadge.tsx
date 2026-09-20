// Награда 🏆 за 1 место команды в челлендже — знак Divergents рядом с именем.
//
// ПОЧЕМУ НЕ ЭМОДЗИ. Кубок из эмодзи выглядит одинаково в любом приложении и
// ничего не говорит о том, кто награду выдал. Здесь награда фирменная: тот же
// знак, что на заставке и в шапке трекера. Её узнают.
//
// Знак сидит в золотом кружке: на светлой и на тёмной теме один и тот же
// синий логотип рядом с текстом читался бы как часть интерфейса, а не как
// отличие. Золото — единственное место в приложении, где оно есть, и именно
// поэтому оно работает.
import React from 'react';
import { View } from 'react-native';
import { Logo } from './Logo';

const GOLD = '#F0B429';
const GOLD_DEEP = '#B57C0A';

export function AwardBadge({ size = 16 }: { size?: number }) {
  const inner = Math.round(size * 0.62);
  return (
    <View
      accessibilityLabel="Награда за первое место в челлендже"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderCurve: 'continuous',
        backgroundColor: 'rgba(240,180,41,0.18)',
        borderWidth: 0.5,
        borderColor: GOLD,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Logo size={inner} body={GOLD_DEEP} head={GOLD} />
    </View>
  );
}
