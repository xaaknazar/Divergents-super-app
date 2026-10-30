// Напоминание про анкету.
//
// Анкета больше не запирает вход: человек заходит сразу после подтверждения
// почты, а здесь видит, что именно откроется, когда он её заполнит. Молчаливая
// блокировка кнопок была бы хуже — человек не понимал бы, почему ничего не
// работает.
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { minTouch } from '../theme/tokens';
import { openResume } from '../navigation/ref';
import { useResumeAccess } from '../state/useResumeAccess';
import { ResumeArea } from '../data/resumeAccess';
import { tr } from '../state/LanguageContext';

const WHAT_OPENS: Record<ResumeArea, string> = {
  community: 'Откроет заявки в челленджи, поездки и спорт',
  career: 'Откроет заявки в сообществе и отклики на вакансии',
};

export function ResumeCallout({ area = 'career' }: { area?: ResumeArea }) {
  const { missing, hydrated } = useResumeAccess();
  if (!hydrated) return null;
  const gaps = missing(area);
  if (!gaps.length) return null;
  // Сколько разделов из нужных уже готово — понятнее, чем абстрактный процент.
  const needed = area === 'career' ? 4 : 3;
  return <ResumeCalloutCard area={area} done={needed - gaps.length} needed={needed} onPress={() => openResume(gaps[0].index)} />;
}

/** Плоская плашка анкеты (Callout brand): белая плашка иконки, заголовок «· N из M», что откроется. */
export function ResumeCalloutCard({ area, done, needed, onPress }: { area: ResumeArea; done: number; needed: number; onPress: () => void }) {
  const { T, ty, isDark } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tr('Заполнить анкету')}
      style={({ pressed }) => ({
        minHeight: minTouch, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1,
        backgroundColor: isDark ? T.brandTinted : 'rgba(61,91,219,0.13)', borderRadius: 14, borderCurve: 'continuous', padding: 14,
      })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.cardBg, alignItems: 'center', justifyContent: 'center' }}>
        <SF name="doc.text.fill" size={20} color={T.brandText} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[ty.footnoteEm, { color: T.label }]}>{tr('Заполните анкету')} · {done} {tr('из')} {needed}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{tr(WHAT_OPENS[area])}</Text>
      </View>
      <SF name="chevron.right" size={16} color={T.labelTertiary} />
    </Pressable>
  );
}
