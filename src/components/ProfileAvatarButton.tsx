// Кнопка «Профиль» в шапке: фото человека, а если фото нет — иконка.
//
// Отдельный компонент, потому что кнопка стоит на четырёх экранах, а фото
// приходит из двух источников (анкета Talentslab и аккаунт Clerk) — держать эту
// логику в каждом экране значило бы четыре расхождения при первой же правке.
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useUser } from '@clerk/clerk-expo';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { minTouch } from '../theme/tokens';
import { useTalentProfile } from '../state/useTalentProfile';
import { tr } from '../state/LanguageContext';

export function ProfileAvatarButton({ size = 50, onPress }: { size?: number; onPress?: () => void }) {
  const { T } = useTheme();
  const { profile } = useTalentProfile();
  const { user } = useUser();
  // Ссылка на фото может протухнуть (файл удалили на сайте) — тогда молча
  // возвращаемся к иконке, а не показываем пустой серый квадрат.
  const [broken, setBroken] = useState(false);
  const photoUrl = profile?.photoUrl || user?.imageUrl || null;
  const showPhoto = !!photoUrl && !broken;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tr('Профиль')}
      style={{
        // Область нажатия не меньше пальца, но и не меньше самого аватара.
        minWidth: Math.max(minTouch, size), minHeight: Math.max(minTouch, size),
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {showPhoto ? (
        <Image
          source={{ uri: photoUrl as string }}
          onError={() => setBroken(true)}
          style={{
            width: size, height: size, borderRadius: size / 2,
            borderWidth: 1, borderColor: T.separator, backgroundColor: T.fillTertiary,
          }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
        />
      ) : (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <SF name="person.crop.circle.fill" size={size} color={T.brand} />
        </View>
      )}
    </Pressable>
  );
}
