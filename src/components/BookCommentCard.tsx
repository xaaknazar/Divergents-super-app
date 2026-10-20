import React from 'react';
import { Text, View } from 'react-native';
import { BookComment } from '../data/books';
import { useTheme } from '../theme/ThemeContext';
import { AwardBadge } from './AwardBadge';
import { Button } from './Button';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';

export function BookCommentCard({ comment, onEdit, onDelete }: { comment: BookComment; onEdit: () => void; onDelete: () => void }) {
  const { T, ty } = useTheme();
  const date = new Date(comment.date);
  const label = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  return <ContentBlock size="compact"><View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      <Text style={[ty.subheadEm, { color: T.label, flexShrink: 1 }]}>{comment.author}{comment.mine ? ' · вы' : ''}</Text>
      {comment.award ? <AwardBadge size={16} /> : null}
    </View>
    {label ? <Text style={[ty.caption1, { color: T.labelSecondary }]}>{label}</Text> : null}
    <Text style={[ty.body, { color: T.label }]}>{comment.content}</Text>
    {comment.likes ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>Нравится: {comment.likes}</Text> : null}
    {comment.mine ? <Wrapper dir="row" gap={8} wrap>
      <Button label="Изменить" variant="plain" size="compact" onPress={onEdit} />
      <Button label="Удалить" variant="plain" tone="danger" size="compact" onPress={onDelete} />
    </Wrapper> : null}
  </View></ContentBlock>;
}
