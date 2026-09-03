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
  community: 'Откроются заявки в челленджи, поездки и спорт',
  career: 'Откроются заявки в сообществе и отклики на вакансии',
};

export function ResumeCallout({ area = 'career' }: { area?: ResumeArea }) {
  const { T, ty } = useTheme();
  const { missing, hydrated } = useResumeAccess();
  if (!hydrated) return null;
  const gaps = missing(area);
  if (!gaps.length) return null;

  // Сколько разделов из нужных уже готово — понятнее, чем абстрактный процент.
  const needed = area === 'career' ? 4 : 3;
  const done = needed - gaps.length;

  return (
    <Pressable
      onPress={() => openResume(gaps[0].index)}
      accessibilityRole="button"
      accessibilityLabel={tr('Заполнить анкету')}
      style={{
        minHeight: minTouch, flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: T.brandTinted, borderRadius: 16, padding: 14, marginBottom: 14,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: T.cardBg, alignItems: 'center', justifyContent: 'center' }}>
        <SF name="doc.text.fill" size={18} color={T.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ty.footnoteEm, { color: T.label }]}>{tr('Заполните анкету')}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>
          {tr(WHAT_OPENS[area])} · {done}/{needed} {tr('разделов')}
        </Text>
      </View>
      <SF name="chevron.right" size={14} color={T.labelTertiary} />
    </Pressable>
  );
}
