import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, ScrollView, Linking } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { BackNav } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ProgressBar, Capsule, ListSection, ListRow, ty } from '../../components/ui';
import { useTalentProfile } from '../../state/useTalentProfile';
import { GALLUP_DOMAIN_META, GallupDomain, mbtiName, fmtList } from '../../data/talentslab';
import { CareerStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CareerStackParams, 'TalentProfile'>;
const DOMAIN_ORDER: GallupDomain[] = ['strategic', 'executing', 'influencing', 'relationship'];

export function TalentProfileScreen({ navigation }: Props) {
  const { T } = useTheme();
  const { profile, live } = useTalentProfile();
  const r = profile?.resume ?? null;

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

  const Section = ({ header, items }: { header: string; items: [string, any][] }) => {
    const data = rows(items);
    if (data.length === 0) return null;
    return (
      <ListSection header={header}>
        {data.map(([label, value], i) => (
          <ListRow key={label} title={label} detail={value.length > 22 ? undefined : value} last={i === data.length - 1}
            subtitle={value.length > 22 ? value : undefined} />
        ))}
      </ListSection>
    );
  };

  const byDomain = (d: GallupDomain) => (profile?.gallup ?? []).filter((g) => g.domain === d);

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back="Карьера" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 }}>
          {profile?.photoUrl
            ? <Image source={{ uri: profile.photoUrl }} style={{ width: 88, height: 88, borderRadius: 24 }} contentFit="cover" cachePolicy="memory-disk" />
            : <View style={{ width: 88, height: 88, borderRadius: 24, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.largeTitle, { color: '#fff' }]}>{(profile?.fullName ?? 'D').charAt(0)}</Text></View>}
          <Text style={[ty.title2, { color: T.label, marginTop: 12 }]}>{profile?.fullName ?? '—'}</Text>
          {!live ? <View style={{ marginTop: 6 }}><Capsule bg={T.fillTertiary} color={T.labelSecondary}>демо-данные</Capsule></View> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {profile?.mbtiType ? <Capsule bg={T.brandTinted} color={T.brand}>MBTI · {profile.mbtiType}</Capsule> : null}
            <Capsule bg={T.fillTertiary} color={T.label}>Анкета {profile?.completeness ?? 0}%</Capsule>
          </View>
        </View>

        <Section header="Личные данные" items={personal} />
        <Section header="Карьера и образование" items={career} />
        <Section header="О себе" items={about} />

        {/* Work experience list */}
        {(() => {
          const we: any[] = Array.isArray(r?.work_experience) ? r!.work_experience! : [];
          if (we.length === 0) return null;
          return (
            <ListSection header="Опыт работы">
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
          <ListSection header="Тип личности (MBTI)">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
              <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.headline, { color: '#fff' }]}>{profile.mbtiType}</Text>
              </View>
              <Text style={[ty.body, { color: T.label, flex: 1 }]}>{profile.mbtiName || mbtiName(profile.mbtiType) || 'Тип личности'}</Text>
            </View>
          </ListSection>
        ) : null}

        {/* All Gallup talents grouped by domain */}
        {(profile?.gallup ?? []).length > 0 ? (
          <ListSection header={`Таланты Gallup · ${profile!.gallup.length}`}>
            <View style={{ padding: 14, gap: 14 }}>
              {DOMAIN_ORDER.map((d) => {
                const items = byDomain(d);
                if (items.length === 0) return null;
                const meta = GALLUP_DOMAIN_META[d];
                return (
                  <View key={d}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color }} />
                      <Text style={[ty.footnoteEm, { color: meta.color, textTransform: 'uppercase' }]}>{meta.label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {items.map((g) => (
                        <View key={g.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, backgroundColor: meta.color + '18' }}>
                          <Text style={[ty.caption2Em, { color: meta.color }]}>{g.rank}</Text>
                          <Text style={[ty.footnoteEm, { color: T.label }]}>{g.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </ListSection>
        ) : null}

        {/* Gardner */}
        {(profile?.gardner ?? []).length > 0 ? (
          <ListSection header="Множественный интеллект (Гарднер)">
            <View style={{ padding: 14 }}>
              {profile!.gardner.slice().sort((a, b) => b.score - a.score).map((gr, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Text style={[ty.caption1, { color: T.label, width: 170 }]} numberOfLines={1}>{gr.category}</Text>
                  <View style={{ flex: 1 }}><ProgressBar value={gr.score / 100} /></View>
                  <Text style={[ty.caption2Em, { color: T.labelSecondary, width: 32, textAlign: 'right' }]}>{gr.score}</Text>
                </View>
              ))}
            </View>
          </ListSection>
        ) : null}

        {/* Reports */}
        {(profile?.reports ?? []).length > 0 ? (
          <ListSection header="Отчёты">
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
