// Create a vacancy from the app (role-gated: only users with canCreate reach it).
// Full form matching the website ТЗ. Posts to /api/mobile/vacancies.
import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { NavHeader } from '../../components/NavHeader';
import { PrimaryButton } from '../../components/ui';
import { useCareer } from '../../state/CareerContext';
import { createVacancy } from '../../data/career';
import { uploadFile } from '../../data/api';
import { tr } from '../../state/LanguageContext';

const FORMATS = ['Гибрид', 'Офис', 'Удалёнка'];
const EXP_OPTS = ['Опыт 1-3 года', 'Опыт 3-6 лет', 'Без опыта'];

export function CreateVacancyScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { reloadJobs } = useCareer();

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [city, setCity] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [companyValues, setCompanyValues] = useState('');
  const [format, setFormat] = useState('Гибрид');
  const [salary, setSalary] = useState('');
  const [conditions, setConditions] = useState('');
  const [benefits, setBenefits] = useState('');
  const [experience, setExperience] = useState<string[]>([]);
  const [diploma, setDiploma] = useState<'' | 'yes' | 'no'>('');
  const [adjacentFields, setAdjacentFields] = useState('');
  const [otherRequirements, setOtherRequirements] = useState('');
  const [talents, setTalents] = useState('');
  const [gallupFile, setGallupFile] = useState('');
  const [about, setAbout] = useState('');
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'gallup' | null>(null);

  // Vacancy is valid only with a title AND a company name (both required by ТЗ).
  const ok = title.trim().length > 1 && company.trim().length > 0;
  const inp = { backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label, borderWidth: 0.5, borderColor: T.cardBorder, ...ty.body } as any;

  const pickImage = async (which: 'logo' | 'gallup') => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Нет доступа к фото'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      setUploading(which);
      const token = await getToken();
      const url = await uploadFile(token, a.uri, a.fileName || `${which}.jpg`, a.mimeType || 'image/jpeg');
      if (url) { if (which === 'logo') setCompanyLogo(url); else setGallupFile(url); }
      else Alert.alert('Не удалось загрузить', 'Попробуйте ещё раз.');
    } catch { Alert.alert('Не удалось загрузить'); }
    finally { setUploading(null); }
  };

  const toggleExp = (o: string) => setExperience((p) => p.includes(o) ? p.filter((x) => x !== o) : [...p, o]);

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      const token = await getToken();
      const done = await createVacancy(token, {
        title: title.trim(),
        company: company.trim() || null,
        companyLogo: companyLogo || null,
        companyValues: companyValues.split('\n').map((s) => s.trim()).filter(Boolean),
        city: city.trim() || null,
        officeAddress: officeAddress.trim() || null,
        format,
        salary: salary.trim() || null,
        conditions: conditions.trim() || null,
        benefits: benefits.split('\n').map((s) => s.trim()).filter(Boolean),
        experience,
        diplomaRequired: diploma === 'yes' ? true : diploma === 'no' ? false : null,
        adjacentFields: adjacentFields.trim() || null,
        otherRequirements: otherRequirements.trim() || null,
        talents: talents.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
        gallupFile: gallupFile || null,
        about: about.trim() || null,
        published,
      });
      if (done) {
        await reloadJobs();
        Alert.alert('Вакансия создана', published ? 'Она появилась в каталоге.' : 'Сохранена как черновик.', [{ text: tr('Готово'), onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('Не удалось создать', 'Проверьте подключение и права доступа.');
      }
    } catch {
      Alert.alert('Не удалось создать', 'Проверьте подключение и попробуйте снова.');
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title="Новая вакансия" backLabel={tr('Отмена')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          <Field label="Должность *">
            <TextInput value={title} onChangeText={setTitle} placeholder="Например: Продуктовый дизайнер" placeholderTextColor={T.labelTertiary} style={inp} />
          </Field>

          <Sec title="О компании" />
          <Field label="Название компании">
            <TextInput value={company} onChangeText={setCompany} placeholder="Компания" placeholderTextColor={T.labelTertiary} style={inp} />
          </Field>
          <Field label="Логотип компании">
            <Pressable onPress={() => pickImage('logo')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {companyLogo
                ? <Image source={{ uri: companyLogo }} style={{ width: 56, height: 56, borderRadius: 12 }} contentFit="cover" />
                : <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>{uploading === 'logo' ? <ActivityIndicator color={T.brand} /> : <SF name="photo" size={22} color={T.labelSecondary} />}</View>}
              <Text style={[ty.subhead, { color: T.brandAccent }]}>{companyLogo ? 'Заменить логотип' : 'Загрузить логотип'}</Text>
            </Pressable>
          </Field>
          <Field label="Город">
            <TextInput value={city} onChangeText={setCity} placeholder="Город" placeholderTextColor={T.labelTertiary} style={inp} />
          </Field>
          <Field label="Адрес офиса">
            <TextInput value={officeAddress} onChangeText={setOfficeAddress} placeholder="Город, улица, номер здания" placeholderTextColor={T.labelTertiary} style={inp} />
          </Field>
          <Field label="Ценности компании" hint="Одна ценность на строку">
            <TextInput value={companyValues} onChangeText={setCompanyValues} multiline placeholder={'Забота о клиенте\nОткрытость'} placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 76, textAlignVertical: 'top' }]} />
          </Field>

          <Sec title="Об условиях" />
          <Field label="Формат">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {FORMATS.map((f) => (
                <Pressable key={f} onPress={() => setFormat(f)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: format === f ? T.brand : T.fillTertiary }}>
                  <Text style={[ty.subheadEm, { color: format === f ? '#fff' : T.labelSecondary }]}>{f}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
          <Field label="Зарплата">
            <TextInput value={salary} onChangeText={setSalary} placeholder="Например: от 500 000 ₸" placeholderTextColor={T.labelTertiary} style={inp} />
          </Field>
          <Field label="Другие условия">
            <TextInput value={conditions} onChangeText={setConditions} multiline placeholder="График 5/2, оформление по ТК, испытательный срок…" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 76, textAlignVertical: 'top' }]} />
          </Field>
          <Field label="Преимущества" hint="Одно преимущество на строку">
            <TextInput value={benefits} onChangeText={setBenefits} multiline placeholder={'карьерный рост\nобучение\nабонемент в спортзал'} placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 76, textAlignVertical: 'top' }]} />
          </Field>

          <Sec title="О требованиях" />
          <Field label="Опыт работы" hint="Можно выбрать несколько">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EXP_OPTS.map((o) => (
                <Pressable key={o} onPress={() => toggleExp(o)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: experience.includes(o) ? T.brand : T.fillTertiary }}>
                  <Text style={[ty.caption2Em, { color: experience.includes(o) ? '#fff' : T.labelSecondary }]}>{o}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
          <Field label="Обязателен ли диплом по специальности?">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([['yes', 'Да'], ['no', 'Нет']] as const).map(([k, l]) => (
                <Pressable key={k} onPress={() => setDiploma(diploma === k ? '' : k)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: diploma === k ? T.brand : T.fillTertiary }}>
                  <Text style={[ty.subheadEm, { color: diploma === k ? '#fff' : T.labelSecondary }]}>{l}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
          <Field label="Смежные сферы" hint="Допустимый опыт в смежных сферах, который готов рассматривать работодатель">
            <TextInput value={adjacentFields} onChangeText={setAdjacentFields} placeholder="Например: маркетинг, продажи" placeholderTextColor={T.labelTertiary} style={inp} />
          </Field>
          <Field label="Другие требования">
            <TextInput value={otherRequirements} onChangeText={setOtherRequirements} multiline placeholder="Необязательно" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 66, textAlignVertical: 'top' }]} />
          </Field>
          <Field label="Ключевые таланты Gallup для роли" hint="Через запятую · используются для подбора кандидатов по талантам">
            <TextInput value={talents} onChangeText={setTalents} multiline placeholder="Например: Стратег, Организатор, Коммуникация" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 66, textAlignVertical: 'top' }]} />
          </Field>
          <Field label="Примерный Gallup вакансии" hint="По желанию · изображение/скрин (PDF — на сайте)">
            <Pressable onPress={() => pickImage('gallup')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {gallupFile
                ? <Image source={{ uri: gallupFile }} style={{ width: 56, height: 56, borderRadius: 12 }} contentFit="cover" />
                : <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>{uploading === 'gallup' ? <ActivityIndicator color={T.brand} /> : <SF name="doc.text.fill" size={20} color={T.labelSecondary} />}</View>}
              <Text style={[ty.subhead, { color: T.brandAccent }]}>{gallupFile ? 'Заменить файл' : 'Загрузить файл'}</Text>
            </Pressable>
          </Field>

          <Sec title="Дополнительно" />
          <Field label="Описание (необязательно)">
            <TextInput value={about} onChangeText={setAbout} multiline placeholder="Подробное описание роли" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 90, textAlignVertical: 'top' }]} />
          </Field>
          <Pressable onPress={() => setPublished((p) => !p)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.cardBorder, marginBottom: 16 }}>
            <View style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: published ? T.brand : T.fillTertiary, justifyContent: 'center', paddingHorizontal: 3 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: published ? 'flex-end' : 'flex-start' }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ty.subheadEm, { color: T.label }]}>{published ? 'Опубликовано' : 'Черновик'}</Text>
              <Text style={[ty.caption2, { color: T.labelTertiary }]}>Опубликованная вакансия видна всем в приложении</Text>
            </View>
          </Pressable>

          <PrimaryButton label={busy ? 'Создание…' : 'Создать вакансию'} icon="checkmark" loading={busy} disabled={!ok} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Declared at module scope (not inside the screen render) so their component
// identity is stable — otherwise every keystroke would remount each wrapped
// TextInput, dismissing the keyboard after a single character.
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { T, ty } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[ty.caption2Em, { color: T.labelSecondary, marginBottom: 6, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4 }]}>{label}</Text>
      {children}
      {hint ? <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 5, marginLeft: 2 }]}>{hint}</Text> : null}
    </View>
  );
}

function Sec({ title }: { title: string }) {
  const { T, ty } = useTheme();
  return <Text style={[ty.headline, { color: T.label, marginTop: 8, marginBottom: 10 }]}>{title}</Text>;
}
