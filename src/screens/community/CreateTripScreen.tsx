// Creator-only form: publish a new community trip.
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { PrimaryButton, ty } from '../../components/ui';
import { createTrip } from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';
import { hSuccess } from '../../lib/haptics';
import { FormHeader, Field, inp } from './CreateChallengeScreen';

type Props = NativeStackScreenProps<CommunityStackParams, 'CreateTrip'>;

export function CreateTripScreen({ navigation }: Props) {
  const { T } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();

  const [title, setTitle] = useState('');
  const [region, setRegion] = useState('');
  const [date, setDate] = useState('');
  const [days, setDays] = useState('');
  const [spots, setSpots] = useState('');
  const [price, setPrice] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const daysNum = parseInt(days, 10);
  const spotsNum = parseInt(spots, 10);
  const canSubmit =
    title.trim().length > 1 &&
    region.trim().length > 0 &&
    date.trim().length > 0 &&
    Number.isFinite(daysNum) && daysNum > 0 &&
    Number.isFinite(spotsNum) && spotsNum > 0 &&
    !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const token = await getToken();
      const res = await createTrip({
        title: title.trim(),
        region: region.trim(),
        date: date.trim(),
        days: daysNum,
        spots: spotsNum,
        price: price.trim() ? Number(price.trim().replace(/\s/g, '')) : null,
        difficulty: difficulty.trim() || undefined,
        description: description.trim() || undefined,
      }, token ?? '');
      if (res.ok) {
        hSuccess();
        Alert.alert(tr('Поездка создана'), tr('Новая поездка опубликована для сообщества.'), [
          { text: tr('Готово'), onPress: () => navigation.navigate('CommunityHome', { refresh: Date.now() }) },
        ]);
      } else if (res.status === 403) {
        Alert.alert(tr('Недостаточно прав'), tr('Только организаторы могут создавать поездки.'));
      } else {
        Alert.alert(tr('Не удалось создать'), tr('Проверьте подключение и попробуйте ещё раз.'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <FormHeader title={tr('Новая поездка')} onCancel={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={8}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }} keyboardShouldPersistTaps="handled">
          <Field label={tr('НАЗВАНИЕ')}>
            <TextInput value={title} onChangeText={setTitle} placeholder={tr('напр. Восхождение на Фурманова')} placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>
          <Field label={tr('РЕГИОН')}>
            <TextInput value={region} onChangeText={setRegion} placeholder={tr('напр. Алматинская область')} placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>
          <Field label={tr('ДАТА')} hint={tr('Свободный формат, напр. «12–15 августа» или 2026-08-12')}>
            <TextInput value={date} onChangeText={setDate} placeholder={tr('12–15 августа')} placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>
          <Field label={tr('ДНЕЙ')}>
            <TextInput value={days} onChangeText={(t) => setDays(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="3" placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>
          <Field label={tr('МЕСТ')}>
            <TextInput value={spots} onChangeText={(t) => setSpots(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="12" placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>
          <Field label={tr('СЛОЖНОСТЬ (необязательно)')}>
            <TextInput value={difficulty} onChangeText={setDifficulty} placeholder={tr('напр. Средняя')} placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>
          <Field label={tr('ЦЕНА (₸, необязательно)')}>
            <TextInput value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder={tr('0 — бесплатно')} placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>
          <Field label={tr('ОПИСАНИЕ (необязательно)')}>
            <TextInput value={description} onChangeText={setDescription} placeholder={tr('Маршрут, что взять с собой, сбор…')} placeholderTextColor={T.labelTertiary} multiline style={[inp(T), { minHeight: 96, textAlignVertical: 'top' }]} />
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <PrimaryButton label={tr('Создать поездку')} icon="map.fill" loading={busy} color={canSubmit ? T.brand : T.labelTertiary} onPress={submit} />
      </View>
    </View>
  );
}
