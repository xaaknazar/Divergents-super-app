import React from 'react';
import { Text, View } from 'react-native';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { ContentBlock } from './ContentBlock';
import { SF } from './SFIcon';
import { ProgressBar } from './ProgressBar';

export function CourseProgressCard({ progress, completed, lesson, onStart }: {
  progress: number; completed: boolean; lesson?: { n: number; title: string }; onStart?: () => void;
}) {
  const { T, ty } = useTheme();
  const percent = Math.round(Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)) * 100);
  return <ContentBlock><View style={{ gap: 14 }}>
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>{completed ? tr('Курс пройден') : tr('Ваш прогресс')}</Text>
        <Text style={[ty.title2, { color: T.brandText }]}>{percent}%</Text>
      </View>
      {completed ? <SF name="checkmark.seal.fill" size={26} color={T.greenText} /> : null}
    </View>
    <ProgressBar value={progress} accessibilityLabel={tr('Ваш прогресс')} />
    {!completed && lesson ? <Text style={[ty.subhead, { color: T.labelSecondary }]}>{tr('Урок')} {lesson.n} — {lesson.title}</Text> : null}
    <Button label={completed ? tr('Пройти заново') : progress > 0 ? tr('Продолжить') : tr('Начать курс')}
      icon={completed ? 'arrow.clockwise' : 'play.fill'} disabled={!onStart} onPress={onStart} />
  </View></ContentBlock>;
}
