import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { SF, SFName } from '../../components/SFIcon';
import { Capsule, ListSection, ListRow, SectionHeader, ty } from '../../components/ui';
import { FEATURED_MEMBER } from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'Member'>;

const MEDALS: { i: SFName; c: string; l: string }[] = [
  { i: 'crown.fill', c: '#D4AF37', l: 'Лидер' },
  { i: 'trophy.fill', c: '#234088', l: 'Топ-3' },
  { i: 'flame.fill', c: '#FF9500', l: '100 дней' },
  { i: 'star.fill', c: '#34C759', l: 'Ментор' },
  { i: 'book.fill', c: '#AF52DE', l: '50 книг' },
  { i: 'figure.run', c: '#FF3B30', l: 'Марафон' },
];

const BOOKS = [
  { t: 'Семь навыков', a: 'Стивен Кови', r: '4.8', c: '#FBE5C8' },
  { t: 'Лидер на катке', a: 'Henry Cloud', r: '4.6', c: '#D4E5F0' },
  { t: 'Атомные привычки', a: 'James Clear', r: '4.9', c: '#E0F0D4' },
];

const TRAVELS = [
  { t: 'Кольсай', tint: '#C8D9E8' },
  { t: 'Алаколь', tint: '#E4D8C0' },
  { t: 'Шри-Ланка', tint: '#D4E8D0' },
  { t: 'ОАЭ', tint: '#F0E0D8' },
  { t: 'Катон-Карагай', tint: '#D8E4DC' },
];

export function MemberScreen({ navigation }: Props) {
  const { T } = useTheme();
  const m = FEATURED_MEMBER;
  const stats = [
    { v: String(m.stats.courses), l: 'Курсов' },
    { v: String(m.stats.books), l: 'Книги' },
    { v: String(m.stats.challenges), l: 'Челленджей' },
  ];

  return (
    <Screen tabPadding={false}>
      {/* Inline transparent nav */}
      <View style={{ paddingHorizontal: 12, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, padding: 6 }}>
          <SF name="chevron.left" size={20} color={T.brandAccent} />
          <Text style={[ty.body, { color: T.brandAccent }]}>Сообщество</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <SF name="square.and.arrow.up" size={20} color={T.brandAccent} />
          <SF name="ellipsis" size={20} color={T.brandAccent} />
        </View>
      </View>

      {/* Hero */}
      <View style={{ padding: 20, alignItems: 'center' }}>
        <View style={{ width: 100, height: 100, borderRadius: 22, backgroundColor: '#8AA0D3', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 42, fontWeight: '700' }}>{m.initial}</Text>
        </View>
        <Text style={[ty.title1, { color: T.label, marginTop: 14 }]}>{m.name}</Text>
        <Text style={[ty.body, { color: T.labelSecondary, marginTop: 2 }]}>{m.role}</Text>
        <View style={{ marginTop: 12 }}>
          <Capsule bg={T.fillTertiary} color={T.label}><SF name="circle.fill" size={8} color={T.green} />{m.psychotype} · Уровень {m.level}</Capsule>
        </View>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16 }}>
        <Pressable style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: T.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <SF name="plus" size={16} color="#fff" /><Text style={[ty.headline, { color: '#fff' }]}>Добавить</Text>
        </Pressable>
        <Pressable style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: T.fillTertiary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <SF name="paperplane.fill" size={14} color={T.label} /><Text style={[ty.headline, { color: T.label }]}>Сообщение</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: T.cardBg, borderRadius: 14, flexDirection: 'row', paddingVertical: 14 }}>
        {stats.map((s, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < stats.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
            <Text style={[ty.title2, { color: T.label }]}>{s.v}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Medals */}
      <SectionHeader title="Медали" action="Все" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
        {MEDALS.map((md, i) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.separator, alignItems: 'center', justifyContent: 'center' }}>
              <SF name={md.i} size={26} color={md.c} />
            </View>
            <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 6 }]}>{md.l}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Talents */}
      <ListSection header="Топ-5 талантов">
        <View style={{ padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {m.talents.map((t) => <Capsule key={t} bg={T.brandTinted} color={T.brand}>{t}</Capsule>)}
        </View>
      </ListSection>

      {/* Books */}
      <ListSection header="Сейчас читает">
        {BOOKS.map((b, i) => (
          <ListRow key={i}
            leading={<View style={{ width: 40, height: 56, borderRadius: 4, backgroundColor: b.c, alignItems: 'center', justifyContent: 'center' }}><SF name="book.fill" size={20} color={T.labelSecondary} /></View>}
            title={b.t} subtitle={b.a}
            trailing={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><SF name="star.fill" size={11} color={T.orange} /><Text style={[ty.subhead, { color: T.labelSecondary }]}>{b.r}</Text></View>}
            chevron last={i === BOOKS.length - 1} />
        ))}
      </ListSection>

      {/* Travels */}
      <View style={{ marginTop: 20 }}>
        <SectionHeader title="Путешествия" action="14" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
          {TRAVELS.map((tr, i) => (
            <View key={i} style={{ width: 130, height: 90, borderRadius: 12, backgroundColor: tr.tint, padding: 10, justifyContent: 'flex-end' }}>
              <View style={{ position: 'absolute', top: 10, right: 10, opacity: 0.5 }}><SF name="mappin.circle.fill" size={20} color={T.brand} /></View>
              <Text style={[ty.footnoteEm, { color: T.label }]}>{tr.t}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={{ height: 20 }} />
    </Screen>
  );
}
