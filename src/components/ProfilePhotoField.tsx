// Фото профиля: показывает текущее фото из Talentslab и позволяет заменить его
// прямо из приложения (регистрация и редактирование анкеты). Загружается в тот
// же storage, что и на сайте, поэтому фото совпадает в обоих местах.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { ty } from './ui';
import { fetchTalentProfile, uploadProfilePhoto, getTalentslabToken } from '../data/talentslab';

export function ProfilePhotoField({ onChanged }: { onChanged?: (url: string) => void }) {
  const { T } = useTheme();
  const { getToken } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getTalentslabToken(getToken);
      if (!token) return;
      const p = await fetchTalentProfile(token);
      setUrl(p.photoUrl ?? null);
    } catch { /* нет связи — просто не показываем фото */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  const pick = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Нет доступа к фото'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      setBusy(true);
      const token = await getTalentslabToken(getToken);
      const res = await uploadProfilePhoto(token, {
        uri: a.uri,
        name: a.fileName || 'photo.jpg',
        mime: a.mimeType || 'image/jpeg',
      });
      if ('error' in res) Alert.alert('Не удалось загрузить фото', res.error);
      else {
        setUrl(res.url || a.uri);
        onChanged?.(res.url);
        Alert.alert('Фото обновлено', 'Оно появится в профиле и на сайте Talentslab.');
      }
    } catch {
      Alert.alert('Не удалось загрузить фото', 'Попробуйте ещё раз.');
    } finally { setBusy(false); }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[ty.caption2Em, { color: T.labelSecondary, marginBottom: 8, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4 }]}>
        Фото профиля
      </Text>
      <Pressable onPress={pick} disabled={busy} accessibilityRole="button" accessibilityLabel="Изменить фото профиля"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {url ? (
          <Image source={{ uri: url }} style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: T.fillTertiary }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
        ) : (
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
            {busy ? <ActivityIndicator color={T.brand} /> : <SF name="person.crop.circle.fill" size={30} color={T.labelSecondary} />}
          </View>
        )}
        <View style={{ flex: 1 }}>
          {busy ? (
            <Text style={[ty.subhead, { color: T.labelSecondary }]}>Загружаем…</Text>
          ) : (
            <>
              <Text style={[ty.subhead, { color: T.brandAccent }]}>{url ? 'Изменить фото' : 'Загрузить фото'}</Text>
              <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 2 }]} numberOfLines={2}>
                JPG, PNG или WebP, до 8 МБ
              </Text>
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
}
