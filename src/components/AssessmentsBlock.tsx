// Gallup + Гарднер прямо в приложении.
//
// Gallup — файл (PDF/фото): загружается на Talentslab тем же путём, что и на
// сайте (сохранение кандидату + разбор в фоновой очереди).
// Гарднер — не файл, а тест: он проходится на сайте Talentslab, поэтому здесь
// честная кнопка перехода, а статус подтягивается с сервера.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, Linking, Platform, ActionSheetIOS, AppState } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { minTouch } from '../theme/tokens';
import {
  fetchTestsStatus, uploadGallupFile, getTalentslabToken, TestsStatus, GARDNER_TEST_URL,
} from '../data/talentslab';
import { emitProfileChanged } from '../state/profileBus';

/** Ограничение сервера: 10 МБ на файл отчёта. */
const MAX_GALLUP_BYTES = 10 * 1024 * 1024;

/** Отказ в доступе: объясняем и ведём в Настройки — иначе кнопка «мертва». */
function permissionAlert(title: string) {
  Alert.alert(title, 'Разрешите доступ в настройках iOS, чтобы выбрать файл.', [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Открыть настройки', onPress: () => { Linking.openSettings().catch(() => {}); } },
  ]);
}

// Вне рендера: иначе компонент пересоздавался бы на каждом обновлении статуса,
// а строки — перемонтировались.
function Row({
  icon, title, subtitle, done, pending, busy, action, onPress,
}: { icon: string; title: string; subtitle: string; done: boolean; pending?: boolean; busy?: boolean; action: string; onPress: () => void }) {
  const { T, ty } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${done ? 'готово' : pending ? 'загружено, обрабатываем' : action}`}
      accessibilityHint={done ? undefined : subtitle}
      accessibilityState={{ disabled: !!busy, busy: !!busy }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: minTouch, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? 'rgba(52,199,89,0.14)' : T.brandTinted }}>
        {busy && !done ? <ActivityIndicator size="small" color={T.brand} />
          : <SF name={done ? 'checkmark.circle.fill' : (icon as any)} size={19} color={done ? T.green : T.brand} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={2}>{title}</Text>
        <Text style={[ty.caption1, { color: pending ? T.orangeText : T.labelSecondary, marginTop: 1 }]} numberOfLines={2}>
          {pending ? 'Загружено — обрабатываем…' : subtitle}
        </Text>
      </View>
      <Text style={[ty.caption2Em, { color: done ? T.labelTertiary : T.brandText }]} numberOfLines={1}>
        {done ? 'Готово' : action}
      </Text>
    </Pressable>
  );
}

export function AssessmentsBlock() {
  const { T } = useTheme();
  const { getToken } = useAuth();
  const [status, setStatus] = useState<TestsStatus | null>(null);
  // Занята только загрузка Gallup: у Гарднера нет своей загрузки, и спиннер
  // на его строке вводил бы в заблуждение.
  const [gallupBusy, setGallupBusy] = useState(false);

  const refresh = useCallback(async () => {
    const token = await getTalentslabToken(getToken);
    const s = await fetchTestsStatus(token);
    setStatus(s);
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  // Тест Гарднера проходится в Safari. Когда человек возвращается в приложение,
  // перечитываем статус — чтобы «Готово» появилось без перезахода.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') refresh().catch(() => {}); });
    return () => sub.remove();
  }, [refresh]);

  // Разбор отчёта идёт в очереди на сервере и занимает минуты. Без опроса
  // строка так и висела бы «обрабатываем…», пока человек не перезайдёт.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);
  useEffect(() => stopPolling, [stopPolling]);
  const startPolling = useCallback(() => {
    stopPolling();
    let left = 20; // ~5 минут по 15 секунд
    pollRef.current = setInterval(async () => {
      left -= 1;
      const s = await refresh().catch(() => null);
      if (s?.gallupParsed || left <= 0) { stopPolling(); if (s?.gallupParsed) emitProfileChanged(); }
    }, 15000);
  }, [refresh, stopPolling]);

  /** Общий хвост загрузки: одна проверка размера и один разбор ответа. */
  const send = async (file: { uri: string; name: string; mime: string; size?: number | null }) => {
    // Сервер отвечает 422 на файл больше 10 МБ. Сказать это до загрузки честнее,
    // чем гнать 15 МБ по мобильному интернету и получить отказ.
    if (file.size && file.size > MAX_GALLUP_BYTES) {
      Alert.alert('Файл слишком большой', 'Отчёт должен быть до 10 МБ. Попробуйте PDF вместо фото.');
      return;
    }
    setGallupBusy(true);
    try {
      const token = await getTalentslabToken(getToken);
      const err = await uploadGallupFile(token, file);
      if (err) { Alert.alert('Не удалось загрузить', err); return; }
      Alert.alert('Отчёт загружен', 'Мы разбираем его — таланты и отчёты появятся в профиле через несколько минут.');
      emitProfileChanged();
      startPolling();
    } catch {
      Alert.alert('Не удалось загрузить', 'Попробуйте ещё раз.');
    } finally { setGallupBusy(false); }
  };

  const fromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { permissionAlert('Нет доступа к медиатеке'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    await send({ uri: a.uri, name: a.fileName || 'gallup.jpg', mime: a.mimeType || 'image/jpeg', size: a.fileSize });
  };

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { permissionAlert('Нет доступа к камере'); return; }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    await send({ uri: a.uri, name: a.fileName || 'gallup.jpg', mime: a.mimeType || 'image/jpeg', size: a.fileSize });
  };

  const fromFiles = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      // Сервер принимает ровно это: PDF и картинки. Ограничиваем выбор здесь,
      // чтобы человек не выбрал .docx и не получил отказ после загрузки.
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      copyToCacheDirectory: true,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    await send({ uri: a.uri, name: a.name || 'gallup.pdf', mime: a.mimeType || 'application/pdf', size: a.size });
  };

  /** Отчёт бывает и PDF, и фотографией страницы — даём оба пути честно. */
  const pickGallup = () => {
    if (gallupBusy) return;
    const options = ['Выбрать файл (PDF)', 'Выбрать фото', 'Сфотографировать', 'Отмена'];
    const run = (i: number) => {
      if (i === 0) fromFiles();
      else if (i === 1) fromLibrary();
      else if (i === 2) fromCamera();
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 3, title: 'Отчёт Gallup' }, run);
    } else {
      Alert.alert('Отчёт Gallup', 'Как загрузить отчёт?', [
        { text: options[0], onPress: () => run(0) },
        { text: options[1], onPress: () => run(1) },
        { text: options[2], onPress: () => run(2) },
        { text: 'Отмена', style: 'cancel' },
      ]);
    }
  };

  const openGardner = () => {
    Linking.openURL(GARDNER_TEST_URL).catch(() => {
      Alert.alert('Не удалось открыть', 'Откройте talentslab.org и пройдите тест Гарднера.');
    });
  };

  const gallupDone = !!status?.gallupParsed;
  const gallupPending = !!status?.gallupUploaded && !status?.gallupParsed;
  const gardnerDone = !!status?.gardnerDone;

  return (
    <View style={{ marginTop: 10, backgroundColor: T.cardBg, borderRadius: 14, paddingHorizontal: 14, borderWidth: 0.5, borderColor: T.cardBorder }}>
      <Row
        icon="doc.text.fill"
        title="Отчёт Gallup"
        subtitle="PDF, скан или фото отчёта — разберём автоматически"
        done={gallupDone}
        pending={gallupPending}
        busy={gallupBusy}
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
