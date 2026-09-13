// Карточка для сторис — как у Strava: цифры, контур маршрута и подпись на
// чёрном или на своём фото.
//
// Одна и та же карточка служит трём вещам: тренировке (с маршрутом), рекорду и
// цели (без маршрута — только цифры). Поэтому экран принимает либо `workoutId`,
// либо готовые строки `card`. Зачем отдельный экран, а не системный «поделиться
// текстом»: пробежкой делятся картинкой, а текст «3,40 км за 15:05» в сторис
// не вставишь. Карточка собирается из обычных вью и снимается в PNG.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, Image, ActivityIndicator, ScrollView, Modal, StyleSheet, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '../../theme/ThemeContext';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Logo } from '../../components/Logo';
import { RouteThumb } from '../../components/RouteThumb';
import { EmptyState } from '../../components/StateViews';
import { ColorPicker } from '../../components/ColorPicker';
import { Segmented } from '../../components/ui';
import { hTap, hSuccess } from '../../lib/haptics';
import { tr } from '../../state/LanguageContext';
import { loadJSON, saveJSON } from '../../state/persist';
import { useActivities, paceSecPerKm, paceTimeSec } from '../../state/ActivityContext';
import { CommunityStackParams, ShareCard } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'WorkoutShare'>;

// Сторис — 9:16. Снимаем в 1080×1920: столько ждут Instagram и Telegram, и
// столько же в системном «поделиться» не превращается в мыло.
const OUT_W = 1080;
const OUT_H = 1920;

/** Особое значение для знака: два фирменных цвета, как в приложении. */
const BRAND = 'brand';
const STYLE_KEY = 'dvg.shareStyle.v1';

/** Оформление карточки. Запоминается: кто раз настроил под свой бренд, второй раз настраивать не хочет. */
interface CardStyle {
  size: number;
  place: 'top' | 'center' | 'bottom';
  statColor: string;
  routeColor: string;
  logoColor: string;
  markColor: string;
}
const DEFAULT_STYLE: CardStyle = {
  size: 1, place: 'center', statColor: '#FFFFFF', routeColor: '#234088', logoColor: BRAND, markColor: '#FFFFFF',
};

/** «5,00 км» — как на карточке у Strava. */
export const kmText = (m: number) => `${(m / 1000).toFixed(2).replace('.', ',')} км`;

/** «7:57 /км». Темп в сторис пишут через двоеточие, а не штрихами. */
export function paceText(distanceM: number, sec: number): string {
  const p = paceSecPerKm(distanceM, sec);
  if (!p) return '—';
  return `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, '0')} /км`;
}

/** «39 мин 48 с», «1 ч 12 мин». Секунды показываем, только пока нет часов. */
export function timeText(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h} ч ${m} мин`;
  return `${m} мин ${r} с`;
}

type ColorTarget = 'statColor' | 'routeColor' | 'logoColor' | 'markColor';

export function WorkoutShareScreen({ route, navigation }: Props) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { workouts } = useActivities();

  const workoutId = route.params?.workoutId;
  const w = workoutId ? workouts.find((x) => x.id === workoutId) ?? null : null;
  const card: ShareCard | null = route.params?.card ?? (w ? {
    stats: [
      { l: 'Расстояние', v: kmText(w.distanceM) },
      { l: 'Темп', v: paceText(w.distanceM, paceTimeSec(w)) },
      { l: 'Время', v: timeText(paceTimeSec(w)) },
    ],
  } : null);

  const canvasRef = useRef<View | null>(null);
  const [background, setBackground] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const [areaH, setAreaH] = useState(0);

  // ── Оформление ──────────────────────────────────────────────────────────────
  // Размер и положение блока — чтобы цифры не закрывали главное на фото. Цвет
  // у каждого элемента свой: на светлом небе нужен тёмный текст, на закате —
  // светлый, а подпись бренда иногда хочется в фирменном синем при белых цифрах.
  const [style, setStyle] = useState<CardStyle>(DEFAULT_STYLE);
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<ColorTarget | null>(null);
  useEffect(() => {
    let alive = true;
    loadJSON<Partial<CardStyle> | null>(STYLE_KEY, null).then((saved) => {
      if (alive && saved && typeof saved === 'object') setStyle({ ...DEFAULT_STYLE, ...saved });
    });
    return () => { alive = false; };
  }, []);
  const patch = (p: Partial<CardStyle>) => setStyle((s) => { const next = { ...s, ...p }; saveJSON(STYLE_KEY, next); return next; });

  // Холст вписан в свободное место по высоте, но не шире экрана. Все размеры
  // внутри — доли ширины холста, чтобы превью и снимок 1080×1920 совпадали.
  const W = Math.floor(Math.min(screenW - 32, areaH > 0 ? (areaH - 8) * (9 / 16) : screenW - 32));
  const H = Math.floor(W * (16 / 9));
  const u = W / 100;
  const k = u * style.size;

  const pickBackground = async () => {
    hTap();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(tr('Нет доступа к фото'), tr('Разрешите доступ к галерее в настройках, чтобы поставить фон.'));
      return;
    }
    // Кадрируем сразу под 9:16 — иначе фото ляжет на холст с обрезкой, которую
    // человек не выбирал.
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [9, 16] });
    if (r.canceled || !r.assets?.[0]?.uri) return;
    setBackground(r.assets[0].uri);
  };

  const snapshot = useCallback(async (): Promise<string | null> => {
    if (!canvasRef.current) return null;
    try {
      return await captureRef(canvasRef, { format: 'png', quality: 1, width: OUT_W, height: OUT_H, result: 'tmpfile' });
    } catch {
      return null;
    }
  }, []);

  const save = async () => {
    hTap();
    setBusy('save');
    try {
      // Только запись: читать чужую галерею нам незачем, и iOS покажет более
      // мягкий запрос — «добавлять фото», а не «доступ ко всем фото».
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) { Alert.alert(tr('Нет доступа к галерее'), tr('Разрешите добавлять фото в настройках, чтобы сохранить карточку.')); return; }
      const uri = await snapshot();
      if (!uri) { Alert.alert(tr('Не получилось'), tr('Не удалось собрать картинку. Попробуйте ещё раз.')); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      hSuccess();
      Alert.alert(tr('Сохранено'), tr('Карточка в галерее — можно ставить в сторис.'));
    } catch {
      Alert.alert(tr('Не получилось'), tr('Не удалось сохранить в галерею.'));
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    hTap();
    setBusy('share');
    try {
      const uri = await snapshot();
      if (!uri) { Alert.alert(tr('Не получилось'), tr('Не удалось собрать картинку. Попробуйте ещё раз.')); return; }
      if (!(await Sharing.isAvailableAsync())) { Alert.alert(tr('Поделиться нельзя'), tr('На этом устройстве нет системного меню «Поделиться». Сохраните в галерею.')); return; }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Divergents' });
    } catch {
      /* человек закрыл меню — это не ошибка */
    } finally {
      setBusy(null);
    }
  };

  if (!card) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <NavHeader backLabel={tr('Назад')} onBack={() => navigation.goBack()} />
        <EmptyState icon="figure.run" title={tr('Нечем делиться')} subtitle={tr('Запись не найдена.')} actionLabel={tr('Назад')} onAction={() => navigation.goBack()} />
      </View>
    );
  }

  const colorRows: { key: ColorTarget; label: string }[] = [
    { key: 'statColor', label: tr('Цифры') },
    ...(w ? [{ key: 'routeColor' as ColorTarget, label: tr('Маршрут') }] : []),
    { key: 'logoColor', label: tr('Знак') },
    { key: 'markColor', label: tr('Подпись') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title={tr('Поделиться')} backLabel={tr('Назад')} onBack={() => navigation.goBack()} hairline />

      {/* Превью. Снимается ровно этот View — всё, что нужно на картинке,
          лежит внутри него, и ничего лишнего. */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }} onLayout={(e) => setAreaH(e.nativeEvent.layout.height)}>
        {W > 0 ? (
          <View ref={canvasRef} collapsable={false} style={{ width: W, height: H, backgroundColor: '#000', borderRadius: 18, overflow: 'hidden' }}>
            {background ? (
              <>
                <Image source={{ uri: background }} style={{ position: 'absolute', width: W, height: H }} resizeMode="cover" />
                {/* Затемнение, чтобы цифры читались на любом фото. */}
                <LinearGradient colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.55)']} style={{ position: 'absolute', width: W, height: H }} />
              </>
            ) : null}

            <View style={{ flex: 1, alignItems: 'center', justifyContent: style.place === 'top' ? 'flex-start' : style.place === 'bottom' ? 'flex-end' : 'center', paddingTop: H * 0.08, paddingBottom: H * 0.06 }}>
              {/* Весь блок масштабируется одной величиной k. */}
              <View style={{ alignItems: 'center', gap: k * 7 }}>
                {card.title ? (
                  <Text style={{ color: style.statColor, fontSize: k * 5.2, fontWeight: '800', letterSpacing: k * 0.3, textTransform: 'uppercase', textAlign: 'center', maxWidth: W * 0.86 }} numberOfLines={2}>
                    {card.title}
                  </Text>
                ) : null}

                <View style={{ alignItems: 'center', gap: k * 4 }}>
                  {card.stats.map((s) => (
                    <View key={s.l} style={{ alignItems: 'center' }}>
                      <Text style={{ color: style.statColor, fontSize: k * 4.4, fontWeight: '700', letterSpacing: 0.2 }}>{s.l}</Text>
                      <Text style={{ color: style.statColor, fontSize: k * 12.5, fontWeight: '800', letterSpacing: -0.5, marginTop: k * 0.5, maxWidth: W * 0.92 }} numberOfLines={1} adjustsFontSizeToFit>
                        {s.v}
                      </Text>
                    </View>
                  ))}
                </View>

                {w ? <RouteThumb coords={w.coords} width={k * 42} height={k * 42} color={style.routeColor} strokeWidth={k * 1.6} transparent /> : null}

                {card.caption ? (
                  <Text style={{ color: style.statColor, opacity: 0.9, fontSize: k * 3.8, fontWeight: '600', textAlign: 'center', maxWidth: W * 0.86 }} numberOfLines={2}>
                    {card.caption}
                  </Text>
                ) : null}

                {/* Подпись бренда */}
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: k * 2.2 }}>
                    {style.logoColor === BRAND
                      ? <Logo size={k * 8} body="#234088" head="#3D5BDB" />
                      : <Logo size={k * 8} body={style.logoColor} head={style.logoColor} />}
                    <Text style={{ color: style.markColor, fontSize: k * 7.2, fontWeight: '800', letterSpacing: 0.5 }}>Divergents</Text>
                  </View>
                  <Text style={{ color: style.markColor, opacity: 0.9, fontSize: k * 3.2, fontWeight: '600', letterSpacing: k * 0.45, textTransform: 'uppercase', marginTop: k * 1.2 }}>
                    non stop development
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {/* Панель: круглые кнопки настройки и две главные */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 12, gap: 12, borderTopWidth: 0.5, borderTopColor: T.separator, backgroundColor: T.cardBg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 22 }}>
          <Tool icon="photo" label={background ? tr('Другой фон') : tr('Фон')} onPress={pickBackground} T={T} ty={ty} />
          {background ? <Tool icon="xmark" label={tr('Убрать фон')} onPress={() => { hTap(); setBackground(null); }} T={T} ty={ty} /> : null}
          <Tool icon="slider.horizontal.3" label={tr('Оформление')} onPress={() => { hTap(); setSheet(true); }} T={T} ty={ty} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <ActionButton icon="square.and.arrow.down" label={tr('В галерею')} onPress={save} busy={busy === 'save'} disabled={busy !== null} T={T} ty={ty} />
          <ActionButton icon="square.and.arrow.up" label={tr('Поделиться')} onPress={share} busy={busy === 'share'} disabled={busy !== null} primary T={T} ty={ty} />
        </View>
      </View>

      {/* Шторка оформления. Поверх превью, а не под ним: превью при этом не
          мельчает, и изменения видны сразу за шторкой. */}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Затемнение — слоем ПОД шторкой: Pressable-родитель перехватывает
              жест прокрутки, и содержимое перестаёт крутиться. */}
          <Pressable onPress={() => setSheet(false)} accessibilityRole="button" accessibilityLabel={tr('Закрыть')}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
          <View style={{ backgroundColor: T.groupedBg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: Math.round(screenH * 0.8), paddingBottom: insets.bottom + 8 }}>
            <View style={{ alignItems: 'center', paddingTop: 10 }}>
              <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: T.fillTertiary }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
              <Text style={[ty.title3, { color: T.label, flex: 1 }]}>{tr('Оформление')}</Text>
              <Pressable onPress={() => { hTap(); patch(DEFAULT_STYLE); }} accessibilityRole="button" accessibilityLabel={tr('Сбросить')} hitSlop={8}>
                <Text style={[ty.subhead, { color: T.brand }]}>{tr('Сбросить')}</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: Math.round(screenH * 0.8) - 130 - insets.bottom }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 14 }} keyboardShouldPersistTaps="handled">
              {/* Блок */}
              <View style={{ backgroundColor: T.cardBg, borderRadius: 16, padding: 14, gap: 12, borderWidth: 0.5, borderColor: T.cardBorder }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{tr('Размер блока')}</Text>
                  <Stepper T={T} ty={ty} value={Math.round(style.size * 100)} unit="%" onDec={() => patch({ size: Math.max(0.5, +(style.size - 0.1).toFixed(1)) })} onInc={() => patch({ size: Math.min(1.1, +(style.size + 0.1).toFixed(1)) })} />
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={[ty.subhead, { color: T.label }]}>{tr('Положение')}</Text>
                  <Segmented items={[tr('Сверху'), tr('По центру'), tr('Снизу')]} value={style.place === 'top' ? 0 : style.place === 'bottom' ? 2 : 1} onChange={(i) => patch({ place: i === 0 ? 'top' : i === 2 ? 'bottom' : 'center' })} />
                </View>
              </View>

              {/* Цвета */}
              <View style={{ backgroundColor: T.cardBg, borderRadius: 16, borderWidth: 0.5, borderColor: T.cardBorder, overflow: 'hidden' }}>
                {colorRows.map((row, i) => {
                  const value = style[row.key];
                  const open = editing === row.key;
                  const isBrand = value === BRAND;
                  return (
                    <View key={row.key} style={{ borderTopWidth: i ? 0.5 : 0, borderTopColor: T.separator }}>
                      <Pressable onPress={() => { hTap(); setEditing(open ? null : row.key); }} accessibilityRole="button" accessibilityLabel={row.label} accessibilityState={{ expanded: open }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
                        <Text style={[ty.body, { color: T.label, flex: 1 }]}>{row.label}</Text>
                        {isBrand ? (
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(128,128,128,0.45)' }}>
                            <Logo size={16} body="#234088" head="#3D5BDB" />
                          </View>
                        ) : (
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: value, borderWidth: 1, borderColor: 'rgba(128,128,128,0.45)' }} />
                        )}
                        <Text style={[ty.caption1, { color: T.labelSecondary, minWidth: 72, textAlign: 'right' }]}>{isBrand ? tr('фирменный') : value}</Text>
                        <SF name={open ? 'chevron.down' : 'chevron.right'} size={13} color={T.labelTertiary} />
                      </Pressable>
                      {open ? (
                        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                          <ColorPicker
                            value={isBrand ? '#234088' : value}
                            onChange={(hex) => patch({ [row.key]: hex } as Partial<CardStyle>)}
                            extra={row.key === 'logoColor' ? (
                              <Pressable onPress={() => { hTap(); patch({ logoColor: BRAND }); }} accessibilityRole="button" accessibilityLabel={tr('Фирменный знак')} accessibilityState={{ selected: isBrand }}
                                style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: isBrand ? 3 : 1, borderColor: isBrand ? T.brand : 'rgba(128,128,128,0.45)' }}>
                                <Logo size={17} body="#234088" head="#3D5BDB" />
                              </Pressable>
                            ) : undefined}
                          />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
              <ActionButton icon="checkmark" label={tr('Готово')} onPress={() => { hTap(); setSheet(false); }} primary T={T} ty={ty} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Tool({ icon, label, onPress, T, ty }: { icon: string; label: string; onPress: () => void; T: any; ty: any }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ alignItems: 'center', gap: 5, opacity: pressed ? 0.6 : 1, minWidth: 64 })}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
        <SF name={icon} size={19} color={T.brand} />
      </View>
      <Text style={[ty.caption2, { color: T.labelSecondary }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function Stepper({ T, ty, value, unit, onDec, onInc }: { T: any; ty: any; value: number; unit: string; onDec: () => void; onInc: () => void }) {
  const btn = (icon: string, onPress: () => void, label: string) => (
    <Pressable onPress={() => { hTap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: T.fillTertiary }}>
      <SF name={icon} size={14} color={T.label} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {btn('minus', onDec, 'Меньше')}
      <Text style={[ty.subheadEm, { color: T.label, minWidth: 48, textAlign: 'center' }]}>{value}{unit}</Text>
      {btn('plus', onInc, 'Больше')}
    </View>
  );
}

function ActionButton({ icon, label, onPress, busy, disabled, primary, T, ty }: {
  icon: string; label: string; onPress: () => void; busy?: boolean; disabled?: boolean; primary?: boolean; T: any; ty: any;
}) {
  const fg = primary ? T.onBrand : T.brand;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      style={({ pressed }) => ({
        flex: 1, minHeight: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: primary ? T.brand : T.brandTinted, opacity: disabled && !busy ? 0.5 : pressed ? 0.7 : 1,
      })}>
      {busy ? <ActivityIndicator color={fg} /> : <SF name={icon} size={16} color={fg} />}
      <Text style={[ty.subheadEm, { color: fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}
