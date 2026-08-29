// Gallup + Гарднер прямо в приложении.
//
// Gallup — файл (PDF/фото): загружается на Talentslab тем же путём, что и на
// сайте (сохранение кандидату + разбор в фоновой очереди).
// Гарднер — не файл, а тест: он проходится на сайте Talentslab, поэтому здесь
// честная кнопка перехода, а статус подтягивается с сервера.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { ty } from './ui';
import {
  fetchTestsStatus, uploadGallupFile, getTalentslabToken, TestsStatus, GARDNER_TEST_URL,
} from '../data/talentslab';
import { emitProfileChanged } from '../state/profileBus';

export function AssessmentsBlock() {
  const { T } = useTheme();
  const { getToken } = useAuth();
  const [status, setStatus] = useState<TestsStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const token = await getTalentslabToken(getToken);
    setStatus(await fetchTestsStatus(token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const pickGallup = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Нет доступа к медиатеке'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      setBusy(true);
      const token = await getTalentslabToken(getToken);
      const err = await uploadGallupFile(token, {
        uri: a.uri,
        name: a.fileName || 'gallup.jpg',
        mime: a.mimeType || 'image/jpeg',
      });
      if (err) Alert.alert('Не удалось загрузить', err);
      else {
        Alert.alert('Отчёт загружен', 'Мы разбираем его — таланты появятся в профиле через несколько минут.');
        refresh();
        emitProfileChanged();
      }
    } catch {
      Alert.alert('Не удалось загрузить', 'Попробуйте ещё раз.');
    } finally { setBusy(false); }
  };

  const openGardner = () => {
    Linking.openURL(GARDNER_TEST_URL).catch(() => {
      Alert.alert('Не удалось открыть', 'Откройте talentslab.org и пройдите тест Гарднера.');
    });
  };

  const gallupDone = !!status?.gallupParsed;
  const gallupPending = !!status?.gallupUploaded && !status?.gallupParsed;
  const gardnerDone = !!status?.gardnerDone;

  const Row = ({
    icon, title, subtitle, done, pending, action, onPress,
  }: { icon: string; title: string; subtitle: string; done: boolean; pending?: boolean; action: string; onPress: () => void }) => (
    <Pressable onPress={onPress} disabled={busy}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? 'rgba(52,199,89,0.14)' : T.brandTinted }}>
        {busy && !done ? <ActivityIndicator size="small" color={T.brand} />
          : <SF name={done ? 'checkmark.circle.fill' : (icon as any)} size={19} color={done ? T.green : T.brand} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={2}>{title}</Text>
        <Text style={[ty.caption1, { color: pending ? T.orange : T.labelSecondary, marginTop: 1 }]} numberOfLines={2}>
          {pending ? 'Загружено — обрабатываем…' : subtitle}
        </Text>
      </View>
      <Text style={[ty.caption2Em, { color: done ? T.labelTertiary : T.brandAccent }]} numberOfLines={1}>
        {done ? 'Готово' : action}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ marginTop: 10, backgroundColor: T.cardBg, borderRadius: 14, paddingHorizontal: 14, borderWidth: 0.5, borderColor: T.cardBorder }}>
      <Row
        icon="doc.text.fill"
        title="Отчёт Gallup"
        subtitle="PDF или фото отчёта — разберём автоматически"
        done={gallupDone}
        pending={gallupPending}
        action={status?.gallupUploaded ? 'Заменить' : 'Загрузить'}
        onPress={pickGallup}
      />
      <View style={{ height: 0.5, backgroundColor: T.separator }} />
      <Row
        icon="brain.head.profile"
        title="Тест Гарднера"
        subtitle="Проходится на сайте Talentslab — результат придёт в профиль"
        done={gardnerDone}
        action="Пройти"
        onPress={openGardner}
      />
    </View>
  );
}
