// Кнопка «Профиль» в шапке: фото человека, а если фото нет — иконка.
//
// Только представление; приоритет источников фото определяет useProfilePhoto.
// Компонент не требует авторизации и самостоятельно обрабатывает битое фото.
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { minTouch } from '../theme/tokens';
import { tr } from '../state/LanguageContext';

export interface ProfileAvatarButtonProps {
  photoUrl?: string | null;
  onPress?: () => void;
}
export function ProfileAvatarButton({ photoUrl, onPress }: ProfileAvatarButtonProps) {
  const size = 50;
  const { T, reduceMotion } = useTheme();
  // Ссылка на фото может протухнуть (файл удалили на сайте) — тогда молча
  // возвращаемся к иконке, а не показываем пустой серый квадрат.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const showPhoto = !!photoUrl && photoUrl !== brokenUrl;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tr('Профиль')}
      disabled={!onPress}
      accessibilityState={{ disabled: !onPress }}
      style={({ pressed }) => ({
        // Область нажатия не меньше пальца, но и не меньше самого аватара.
        minWidth: Math.max(minTouch, size), minHeight: Math.max(minTouch, size),
        alignItems: 'center', justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {showPhoto ? (
        <Image
          source={{ uri: photoUrl as string }}
          onError={() => setBrokenUrl(photoUrl ?? null)}
          style={{
            width: size, height: size, borderRadius: size / 2,
           
            borderWidth: 1, borderColor: T.separator, backgroundColor: T.fillTertiary,
          }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={reduceMotion ? 0 : 120}
        />
      ) : (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <SF name="person.crop.circle.fill" size={size} color={T.brandText} />
        </View>
      )}
    </Pressable>
  );
}
