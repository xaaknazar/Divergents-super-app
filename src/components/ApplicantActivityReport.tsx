import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ApplicantActivity, ParticipationStatus } from '../data/applicantActivity';
import { ApplicantReportSection } from './ApplicantReportSection';
import { Wrapper } from './Wrapper';
import { Button } from './ui';

const statusLabel: Record<ParticipationStatus, string> = {
  upcoming: 'Скоро начнётся', active: 'Участвует', finished: 'Завершён', left: 'Вышел из челленджа', eliminated: 'Участие завершено по флагам',
};
const number = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
const date = (value: string | null) => {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'short', year: 'numeric' });
};
export function ApplicantActivityReport({ activity, state, completeness, onRetry }: {
  activity: ApplicantActivity | null; state: 'loading' | 'ready' | 'error'; completeness: number | null; onRetry: () => void;
}) {
  const { T, ty } = useTheme();
  const partial = activity && [...activity.challenges, ...activity.reading].some(item => !item.result);
  return <ApplicantReportSection title="Активность в Divergents">
    <View style={styles.completeness}>
      <Text style={[ty.subheadEm, { color: T.label }]}>Анкета заполнена</Text>
      <Text style={[ty.subheadEm, styles.numeric, { color: T.brandText }]}>{completeness === null ? 'Нет данных' : `${Math.round(Math.min(100, Math.max(0, completeness)))}%`}</Text>
    </View>
    {state === 'loading' ? <Wrapper dir="row" gap={10} align="center">
      <ActivityIndicator color={T.brandText} /><Text style={[ty.subhead, { color: T.labelSecondary }]}>Загружаем участие и результаты…</Text>
    </Wrapper> : state === 'error' ? <Wrapper gap={12}>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>Не удалось загрузить активность. Это не означает, что участий нет.</Text>
      <Button label="Повторить загрузку" variant="tinted" onPress={onRetry} />
    </Wrapper> : activity ? <Wrapper gap={24}>
      <Wrapper gap={16}>
        <Text accessibilityRole="header" style={[ty.subheadEm, { color: T.label }]}>Челленджи</Text>
        {!activity.challenges.length ? <Text style={[ty.subhead, { color: T.labelSecondary }]}>Пока нет подтверждённых участий.</Text> : null}
        {activity.challenges.map(item => <View key={item.challengeId} style={[styles.entry, { borderColor: T.separator }]}>
          <Text style={[ty.headline, { color: T.label }]}>{item.title}</Text>
          <Text style={[ty.footnote, { color: T.labelSecondary }]}>{[statusLabel[item.status], date(item.startDate)].filter(Boolean).join(' · ')}</Text>
          <Text style={[ty.subhead, { color: T.label }]}>{item.teamName ? `Команда «${item.teamName}»` : 'Без команды'}</Text>
          <Text style={[ty.subheadEm, styles.numeric, { color: item.result ? T.brandText : T.labelSecondary }]}>
            {item.result ? `${number(item.result.points)} очков · №${item.result.rank} из ${item.result.totalMembers}` : 'Результат пока недоступен'}
          </Text>
        </View>)}
      </Wrapper>
      <Wrapper gap={16}>
        <Text accessibilityRole="header" style={[ty.subheadEm, { color: T.label }]}>Reading challenge</Text>
        {!activity.reading.length ? <Text style={[ty.subhead, { color: T.labelSecondary }]}>Сохранённых участий в Reading пока нет.</Text> : null}
        {activity.reading.map(item => <View key={item.challengeId} style={[styles.entry, { borderColor: T.separator }]}>
          <Text style={[ty.headline, { color: T.label }]}>{item.title}</Text>
          <Text style={[ty.footnote, { color: T.labelSecondary }]}>{[statusLabel[item.status], date(item.joinedAt) ? `С ${date(item.joinedAt)}` : null].filter(Boolean).join(' · ')}</Text>
          {item.teamName ? <Text style={[ty.subhead, { color: T.label }]}>Команда «{item.teamName}»</Text> : null}
          {item.result ? <Wrapper gap={6}>
            <Text style={[ty.subheadEm, styles.numeric, { color: T.brandText }]}>{number(item.result.pages)} стр. · {number(Math.floor(item.result.elapsedMs / 60000))} мин чтения</Text>
            <Text style={[ty.footnote, { color: T.labelSecondary }]}>{item.result.averagePages !== null ? `Средний темп: ${number(item.result.averagePages)} стр./день · ` : ''}Дней чтения: {item.result.readingDays}</Text>
            <Text style={[ty.footnote, { color: T.labelSecondary }]}>Дней с выполненной нормой: {item.result.completedDays} · Красных флагов: {item.result.flags}</Text>
          </Wrapper> : <Text style={[ty.subhead, { color: T.labelSecondary }]}>Результат пока недоступен</Text>}
        </View>)}
      </Wrapper>
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>Только сохранённые результаты. Заявки до принятия не считаются участием; сброшенная при выходе история Reading не восстанавливается.</Text>
      {partial ? <Button label="Обновить результаты" variant="tinted" onPress={onRetry} /> : null}
    </Wrapper> : null}
  </ApplicantReportSection>;
}
const styles = StyleSheet.create({
  completeness: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  entry: { gap: 6, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  numeric: { fontVariant: ['tabular-nums'] },
});
