import React,{ useState } from 'react';
import { Pressable,StyleSheet,Text,useWindowDimensions,View } from 'react-native';
import { FitnessProgram,ProgramStats } from '../data/fitness';
import { days } from '../data/plural';
import { programDate,programMilestones,programNumber } from '../data/programResults';
import { hTap } from '../lib/haptics';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { ProgramResultHero } from './ProgramResultHero';

export function ProgramResultContent({ program: p, stats: s }: { program: FitnessProgram; stats: ProgramStats }) {
  const { T, ty, textScale } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [journalOpen, setJournalOpen] = useState(false);
  const compact = width < 360 || fontScale * (textScale ?? 1) > 1.3;
  const badges = programMilestones(p, s);
  const partial = s.activeDays - s.done;
  return (
    <View style={{ gap: 24 }}>
      <ProgramResultHero program={p} stats={s} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[
          { title: 'Норма выполнена', value: `${s.done} из ${p.days}`, hint: 'дней программы' },
          { title: 'Лучшая серия', value: days(s.bestStreak), hint: 'подряд с выполненной нормой' },
          { title: 'Дни с активностью', value: String(s.activeDays), hint: 'включая частичное выполнение' },
          { title: 'Лучший день', value: `${programNumber(s.bestDay)} ${p.unit}`, hint: 'максимум за один день' },
        ].map(item => (
          <View key={item.title} testID={`program-stat-${item.title}`} style={[styles.metric, { width: compact ? '100%' : '48%', flexGrow: 1, backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
            <Text style={[ty.footnote, { color: T.labelSecondary }]}>{item.title}</Text>
            <Text style={[ty.title2, { color: T.label, marginTop: 8, fontVariant: ['tabular-nums'] }]}>{item.value}</Text>
            <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 4 }]}>{item.hint}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>Достижения программы</Text>
        {badges.length ? badges.map(b => (
          <View key={b.id} style={[styles.badge, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
            <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.icon, { backgroundColor: T.brandTinted }]}><SF name={b.icon} size={22} color={T.brandText} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[ty.headline, { color: T.label }]}>{b.title}</Text>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>{b.detail}</Text>
            </View>
          </View>
        )) : <Text style={[ty.body, { color: T.labelSecondary }]}>В этой программе пока нет записанной активности. История сохранена — следующий старт может стать началом новой привычки.</Text>}
      </View>

      <View style={[styles.journal, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Результаты по дням" accessibilityState={{ expanded: journalOpen }}
          onPress={() => { hTap(); setJournalOpen(v => !v); }} style={({ pressed }) => ({ minHeight: 56, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]}>Результаты по дням</Text>
            <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 4 }]}>{s.done} с нормой · {partial} частично · {Math.max(0, p.days - s.activeDays)} без записи</Text>
          </View>
          <SF name={journalOpen ? 'chevron.up' : 'chevron.down'} size={16} color={T.labelSecondary} />
        </Pressable>
        {journalOpen ? s.grid.map(g => (
          <View key={g.key} accessible accessibilityLabel={`День ${g.index}, ${programDate(g.key)}: ${programNumber(g.value)} ${p.unit}, ${g.state === 'done' ? 'норма выполнена' : g.value > 0 ? 'частично' : 'нет записи'}`}
            style={{ padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.separator, flexDirection: compact ? 'column' : 'row', gap: 8, justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={[ty.subheadEm, { color: T.label }]}>День {g.index} · {programDate(g.key)}</Text>
              <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 4 }]}>{g.state === 'done' ? 'Норма выполнена' : g.value > 0 ? 'Частично выполнено' : 'Нет записи'}</Text>
            </View>
            <Text style={[ty.body, { color: g.state === 'done' ? T.greenText : T.label, fontVariant: ['tabular-nums'] }]}>{programNumber(g.value)} {p.unit}</Text>
          </View>
        )) : null}
      </View>
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>Итог — сумма ваших записей за дни программы. Частичные результаты и выполнение сверх нормы учтены. Отсутствие записи не означает, что вы не занимались.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metric: { padding: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, borderCurve: 'continuous' },
  badge: { padding: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, borderCurve: 'continuous', flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  journal: { borderRadius: 20, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
