// Кружок участника: фото профиля, а если его нет — первая буква имени.
//
// Отдельный компонент, потому что состав команды рисуется в двух местах
// (лидерборд на экране челленджа и «Состав команды»), а правил тут больше, чем
// кажется: выбывший показывается знаком вместо лица, ссылка на фото может
// протухнуть, и размер кружка в этих двух местах разный.
//
// Два разных выхода из игры — два разных знака. ⛔ — вылет за три красных
// флага, 🏳️ — выход по белому флагу капитана. Раньше 🏳️ обозначал вылет, и
// когда появился настоящий «белый флаг» по правилам, символ стал читаться
// в обе стороны. Белый флаг — это то, что человек получил по уважительной
// причине, и путать его с наказанием нельзя.
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';

export function MemberAvatar({
  name,
  avatar,
  size = 38,
  eliminated = false,
  left = false,
}: {
  name: string;
  /** Ссылка на фото или null — тогда рисуем букву. */
  avatar?: string | null;
  size?: number;
  /** Вылетел за красные флаги. */
  eliminated?: boolean;
  /** Вышел по белому флагу 🏳️. Если выставлены оба — показываем вылет: он случился раньше. */
  left?: boolean;
}) {
  const { T, ty } = useTheme();
  // Файл могли удалить в анкете — тогда молча возвращаемся к букве, а не
  // показываем пустой серый круг.
  const [broken, setBroken] = useState(false);
  const out = eliminated || left;
  const showPhoto = !!avatar && !broken && !out;

  const box = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  if (showPhoto) {
    return (
      <Image
        source={{ uri: avatar as string }}
        onError={() => setBroken(true)}
        style={{ ...box, borderWidth: 0.5, borderColor: T.separator, backgroundColor: T.fillTertiary }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={120}
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View style={{ ...box, backgroundColor: out ? T.fillSecondary : T.brand }}>
      <Text style={[ty.subheadEm, { color: out ? T.labelSecondary : '#fff' }]}>
        {eliminated ? '⛔' : left ? '🏳️' : (name.trim().charAt(0).toUpperCase() || '?')}
      </Text>
    </View>
  );
}
