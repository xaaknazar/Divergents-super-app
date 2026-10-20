import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tr } from '../state/LanguageContext';
import { ContentBlock } from './ContentBlock';
import { lessonsWord } from './CourseCardPremium';
import { SF } from './SFIcon';

export function CourseIncludes({ lessonCount, hasMaterials }: { lessonCount: number; hasMaterials: boolean }) {
  const { T, ty } = useTheme();
  const items = [
    { icon: 'play.circle.fill', text: lessonsWord(lessonCount) },
    ...(hasMaterials ? [{ icon: 'doc.fill', text: tr('Материалы и конспекты') }] : []),
    { icon: 'person.3.fill', text: tr('Обсуждение с участниками') },
  ];
  return <ContentBlock><View style={{ gap: 16 }}>
    <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>{tr('Что входит')}</Text>
    {items.map(item => <View key={item.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <SF name={item.icon} size={22} color={T.brandText} /><Text style={[ty.body, { color: T.label, flex: 1 }]}>{item.text}</Text>
    </View>)}
  </View></ContentBlock>;
}
