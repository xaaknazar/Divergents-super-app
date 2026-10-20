import React from 'react';
import { TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { BottomBar } from './BottomBar';
import { Button } from './Button';

export function ReviewComposer({ value, onChange, onSend, sending, kind, editing, onCancelEdit }: {
  value: string; onChange: (value: string) => void; onSend: () => void; sending: boolean;
  kind: 'review' | 'comment'; editing: boolean; onCancelEdit: () => void;
}) {
  const { T, ty } = useTheme();
  const label = editing ? 'Изменить текст' : kind === 'review' ? 'Написать рецензию' : 'Написать комментарий';
  return <BottomBar>
    <TextInput value={value} onChangeText={onChange} multiline editable={!sending} accessibilityLabel={label}
      placeholder={`${label}…`} placeholderTextColor={T.labelSecondary} selectionColor={T.brandText}
      style={[ty.body, { color: T.label, backgroundColor: T.cardBg, borderWidth: 1, borderColor: T.separator,
        borderRadius: 16, minHeight: 52, maxHeight: 120, paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: 'top' }]} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
      {editing ? <Button label="Отменить изменение" variant="plain" size="compact" disabled={sending} onPress={onCancelEdit} /> : null}
      <Button label={editing ? 'Сохранить' : 'Отправить'} icon="arrow.up" size="compact"
        loading={sending} disabled={sending || !value.trim()} onPress={onSend} />
    </View>
  </BottomBar>;
}
