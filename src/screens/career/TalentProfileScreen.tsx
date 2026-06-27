import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, ScrollView, Linking, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection, ListRow, ty } from '../../components/ui';
import { GardnerChart } from '../../components/GardnerChart';
import { useTalentProfile } from '../../state/useTalentProfile';
import {
  GALLUP_DOMAIN_META, mbtiName, fmtList, MOCK_PROFILE,
  loadGallupOrder, saveGallupOrder, applyGallupOrder, gallupId,
} from '../../data/talentslab';
import { RESUME_STEPS } from '../../data/resumeSchema';
import { exportProfilePdf } from '../../data/profilePdf';
import { hSelect } from '../../lib/haptics';
import { CareerStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CareerStackParams, 'TalentProfile'>;

// RESUME_STEPS index whose `key` matches — computed, never hardcoded.
const stepIndex = (key: string) => Math.max(0, RESUME_STEPS.findIndex((s) => s.key === key));

export function TalentProfileScreen({ navigation }: Props) {
  const { T } = useTheme();
  useLang();
  const { profile: realProfile, live } = useTalentProfile();
  // When there is no live candidate record, preview the feature with an
  // explicitly-labelled demo (the "демо-данные" badge below) instead of fake
  // data masquerading as the user's real profile.
  const profile = live ? realProfile : MOCK_PROFILE;
  const r = profile?.resume ?? null;

  // Navigate to the resume form at the step that matches a schema key.
  const editStep = (key: string) => navigation.navigate('Resume', { step: stepIndex(key) });

  // Share the displayed профиль (live or demo) as a Talentslab-like PDF via the
  // OS share sheet. Brief loading state while expo-print renders the document.
  const [sharing, setSharing] = useState(false);
  const onSharePdf = async () => {
    if (sharing || !profile) return;
    setSharing(true);
    const err = await exportProfilePdf(profile);
    setSharing(false);
    if (err) Alert.alert(tr('Ошибка'), err);
  };

  // Editable Gallup: locally-saved talent order, applied to the displayed list.
  const [gallupOrder, setGallupOrder] = useState<string[] | null>(null);
  const [editGallup, setEditGallup] = useState(false);
  useEffect(() => { loadGallupOrder().then(setGallupOrder); }, []);
  const baseGallup = profile?.gallup ?? [];
  const orderedGallup = useMemo(
    () => applyGallupOrder(baseGallup, gallupOrder),
    [baseGallup, gallupOrder],
  );
  const moveGallup = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= orderedGallup.length) return;
    const ids = orderedGallup.map(gallupId);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    hSelect();
    setGallupOrder(ids);
    saveGallupOrder(ids);
  };

  const personal: [string, any][] = [
    ['Город', r?.current_city], ['Телефон', r?.phone], ['Дата рождения', r?.birth_date],
    ['Пол', r?.gender], ['Семейное положение', r?.marital_status], ['Гражданство', r?.citizenship],
    ['Готовность к переезду', r?.ready_to_relocate ? 'Да' : undefined], ['Instagram', r?.instagram],
  ];
  const career: [string, any][] = [
    ['Желаемая должность', r?.desired_position || fmtList(r?.desired_positions)],
    ['Сфера', r?.activity_sphere], ['Опыт (лет)', r?.total_experience_years],
    ['Ожидания по зарплате', r?.expected_salary], ['Языки', fmtList(r?.language_skills)],
    ['Компьютерные навыки', r?.computer_skills], ['Образование', r?.school || fmtList(r?.universities)],
  ];
  const about: [string, any][] = [
    ['Хобби', r?.hobbies], ['Интересы', r?.interests], ['Спорт', fmtList(r?.favorite_sports)],
    ['Страны', fmtList(r?.visited_countries)], ['Книг в год', r?.books_per_year],
    ['Права', r?.has_driving_license ? 'Есть' : undefined],
  ];
  const rows = (items: [string, any][]) => items
    .map(([label, v]) => [label, Array.isArray(v) ? fmtList(v) : (v == null ? '' : String(v))] as [string, string])
    .filter(([, v]) => v !== '' && v !== 'undefined');

  // iOS grouped-header row with an optional inline «Изменить» affordance.
  const GroupHeader = ({ label, action, accessibilityLabel, onPress }: {
    label: string; action?: string; accessibilityLabel?: string; onPress?: () => void;
  }) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 36, paddingTop: 8, paddingBottom: 6 }}>
      <Text style={[ty.footnote, { color: T.labelSecondary, textTransform: 'uppercase', letterSpacing: 0.4, flex: 1 }]} numberOfLines={1}>{label}</Text>
      {onPress ? (
        <Pressable onPress={() => { hSelect(); onPress(); }} hitSlop={8} accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? action ?? tr('Изменить')}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Text style={[ty.footnoteEm, { color: T.brandAccent }]}>{action ?? tr('Изменить')}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const Section = ({ label, items, editKey }: { label: string; items: [string, any][]; editKey?: string }) => {
    const data = rows(items);
    if (data.length === 0) return null;
    return (
      <View>
        <GroupHeader label={label}
          action={editKey ? tr('Изменить') : undefined}
          accessibilityLabel={editKey ? `${tr('Изменить')} · ${label}` : undefined}
          onPress={editKey ? () => editStep(editKey) : undefined} />
        <ListSection>
          {data.map(([rowLabel, value], i) => (
            <ListRow key={rowLabel} title={rowLabel} detail={value.length > 22 ? undefined : value} last={i === data.length - 1}
              subtitle={value.length > 22 ? value : undefined} />
          ))}
        </ListSection>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title={tr('Моя анкета')} backLabel={tr('Карьера')} onBack={() => navigation.goBack()}
        trailing={
          <>
            {/* Share the анкета as a PDF (send to other apps / save). */}
            <Pressable onPress={onSharePdf} disabled={sharing} hitSlop={8}
              accessibilityRole="button" accessibilityState={{ busy: sharing }}
              accessibilityLabel={tr('Поделиться PDF')}
              style={({ pressed }) => ({ padding: 6, opacity: pressed || sharing ? 0.5 : 1 })}>
              {sharing
                ? <ActivityIndicator color={T.brandAccent} />
                : <SF name="square.and.arrow.up" size={20} color={T.brandAccent} />}
            </Pressable>
            {/* DEFERRED: SFIcon has no 'pencil'/'square.and.pencil' glyph, so the
                edit affordance is a standard iOS text button (avoids a blank icon). */}
            <Pressable onPress={() => { hSelect(); navigation.navigate('Resume'); }} hitSlop={8}
              accessibilityRole="button" accessibilityLabel={tr('Редактировать анкета')}
              style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.5 : 1 })}>
              <Text style={[ty.body, { color: T.brandAccent }]}>{tr('Править')}</Text>
            </Pressable>
          </>
        } />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 }}>
          {profile?.photoUrl
            ? <Image source={{ uri: profile.photoUrl }} style={{ width: 88, height: 88, borderRadius: 24 }} contentFit="cover" cachePolicy="memory-disk" />
            : <View style={{ width: 88, height: 88, borderRadius: 24, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.largeTitle, { color: '#fff' }]}>{(profile?.fullName ?? 'D').charAt(0)}</Text></View>}
          <Text style={[ty.title2, { color: T.label, marginTop: 12 }]}>{profile?.fullName ?? '—'}</Text>
          {!live ? <View style={{ marginTop: 6 }}><Capsule bg={T.fillTertiary} color={T.labelSecondary}>{tr('демо-данные')}</Capsule></View> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {profile?.mbtiType ? <Capsule bg={T.brandTinted} color={T.brand}>MBTI · {profile.mbtiType}</Capsule> : null}
            <Capsule bg={T.fillTertiary} color={T.label}>{tr('Анкета')} {profile?.completeness ?? 0}%</Capsule>
          </View>
        </View>

        <Section label={tr('Личные данные')} items={personal} editKey="personal" />
        <Section label={tr('Карьера и образование')} items={career} editKey="education" />
        <Section label={tr('О себе')} items={about} editKey="additional" />

        {/* Work experience list */}
        {(() => {
          const we: any[] = Array.isArray(r?.work_experience) ? r!.work_experience! : [];
          if (we.length === 0) return null;
          return (
            <ListSection header={tr('Опыт работы')}>
              {we.map((w, i) => (
                <ListRow key={i} leading={<SF name="briefcase.fill" size={18} color={T.brand} />}
                  title={typeof w === 'string' ? w : [w.position, w.company].filter(Boolean).join(' · ')}
                  subtitle={typeof w === 'object' ? [w.start_date, w.end_date].filter(Boolean).join(' — ') : undefined}
                  last={i === we.length - 1} />
              ))}
            </ListSection>
          );
        })()}

        {/* MBTI */}
        {profile?.mbtiType ? (
          <ListSection header={tr('Тип личности (MBTI)')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
              <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.headline, { color: '#fff' }]}>{profile.mbtiType}</Text>
              </View>
              <Text style={[ty.body, { color: T.label, flex: 1 }]}>{profile.mbtiName || mbtiName(profile.mbtiType) || 'Тип личности'}</Text>
            </View>
          </ListSection>
        ) : null}

        {/* All Gallup talents — flat, in the user's (locally-saved) order.
            Tap «Изменить» to reorder via up/down controls. */}
        {orderedGallup.length > 0 ? (
          <View>
            <GroupHeader label={`${tr('Таланты Gallup')} · ${orderedGallup.length}`}
              action={editGallup ? tr('Готово') : tr('Изменить')}
              accessibilityLabel={tr('Изменить порядок талантов Gallup')}
              onPress={() => setEditGallup((v) => !v)} />
            <ListSection>
              {orderedGallup.map((g, i) => {
                const meta = GALLUP_DOMAIN_META[g.domain];
                const last = i === orderedGallup.length - 1;
                return (
                  <ListRow key={gallupId(g)} last={last}
                    leading={
                      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: meta.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={[ty.caption2Em, { color: meta.color }]}>{i + 1}</Text>
                      </View>
                    }
                    title={g.name}
                    subtitle={meta.label}
                    trailing={editGallup ? (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Pressable onPress={() => moveGallup(i, -1)} disabled={i === 0} hitSlop={6}
                          accessibilityRole="button" accessibilityLabel={`${tr('Выше')}: ${g.name}`}
                          style={({ pressed }) => ({ opacity: i === 0 ? 0.3 : pressed ? 0.5 : 1 })}>
                          <SF name="arrow.up.circle.fill" size={26} color={T.brandAccent} />
                        </Pressable>
                        <Pressable onPress={() => moveGallup(i, 1)} disabled={last} hitSlop={6}
                          accessibilityRole="button" accessibilityLabel={`${tr('Ниже')}: ${g.name}`}
                          style={({ pressed }) => ({ opacity: last ? 0.3 : pressed ? 0.5 : 1 })}>
                          <SF name="arrow.down.circle" size={26} color={T.brandAccent} />
                        </Pressable>
                      </View>
                    ) : (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color }} />
                    )} />
                );
              })}
            </ListSection>
            <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 36, paddingTop: 6 }]}>
              {tr('Порядок талантов сохраняется только на этом устройстве. Официальный отчёт Talentslab формируется на сайте и не меняется.')}
            </Text>
          </View>
        ) : null}

        {/* Gardner — multiple-intelligences chart (Talentslab design) */}
        {(profile?.gardner ?? []).length > 0 ? (
          <View>
            <GroupHeader label={tr('Множественный интеллект (Гарднер)')} />
            <View style={{ marginHorizontal: 16 }}>
              <GardnerChart data={profile!.gardner} />
            </View>
          </View>
        ) : null}

        {/* Reports */}
        {(profile?.reports ?? []).length > 0 ? (
          <ListSection header={tr('Отчёты')}>
            {profile!.reports.map((rep, i) => (
              <ListRow key={i} onPress={() => Linking.openURL(encodeURI(rep.url))}
                leading={<SF name="doc.fill" size={20} color={T.brand} />} title={rep.title}
                trailing={<SF name="arrow.up.circle.fill" size={20} color={T.brand} />}
                last={i === profile!.reports.length - 1} />
            ))}
          </ListSection>
        ) : null}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
