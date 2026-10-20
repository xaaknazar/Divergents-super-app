import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { nextReadingDate, todayReadingDate, readingDateLabel, readingDateStart } from '../data/readingCreation';
import { useTheme } from '../theme/ThemeContext';
import { CreationField } from './CreationField';
import { Button } from './Button';
import { SF } from './SFIcon';

// A date-only value is never converted through the phone's timezone.
const pickerDate = (value: string) => new Date(`${value}T12:00:00`);
const dateValue = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function ReadingStartDateField({ value, onChange, disabled = false, error, mode = 'scheduled' }: {
  value: string; onChange: (value: string) => void; disabled?: boolean; error?: string; mode?: 'scheduled' | 'continuous';
}) {
  const { T, ty, isDark, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(nextReadingDate());
  const minimum = mode === 'continuous' ? todayReadingDate() : nextReadingDate();
  const chosen = Number.isFinite(readingDateStart(value)) && value >= minimum ? value : minimum;
  const close = () => setOpen(false);
  const commit = (date: string) => { if (date >= (mode === 'continuous' ? todayReadingDate() : nextReadingDate())) { onChange(date); close(); } };
  return <CreationField label="Дата старта" error={error} hint={mode === 'continuous' ? 'Можно начать сегодня. Капитаны принимают новых участников и после старта. Дни считаются по Казахстану.' : 'Набор идёт до даты старта. Начало автоматически в 00:00 по Казахстану.'}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Дата старта: ${readingDateLabel(value)}`}
      accessibilityState={{ disabled, expanded: open }} disabled={disabled}
      onPress={() => { setDraft(chosen); setOpen(true); }}
      style={({ pressed }) => ({ minHeight: 48, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.cardBg,
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1, flexDirection: 'row', gap: 10, alignItems: 'center' })}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="calendar" size={15} color={T.brandText} /></View>
      <Text style={[ty.body, { color: T.label, flex: 1 }]}>{readingDateLabel(value)}</Text>
    </Pressable>
    {open && Platform.OS === 'android' ? <DateTimePicker value={pickerDate(chosen)} minimumDate={pickerDate(minimum)} mode="date"
      onChange={(event, picked) => { close(); if (event.type === 'set' && picked) commit(dateValue(picked)); }} /> : null}
    {open && Platform.OS !== 'android' ? <Modal transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть календарь" onPress={close} style={{ flex: 1 }} />
        <View accessibilityViewIsModal style={{ maxHeight: '90%', backgroundColor: T.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(16, insets.bottom), gap: 12 }}>
          <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Когда начнём читать?</Text>
          <DateTimePicker accessibilityLabel="Календарь старта" value={pickerDate(draft)} minimumDate={pickerDate(minimum)}
            mode="date" display="spinner" locale="ru-RU" themeVariant={isDark ? 'dark' : 'light'}
            onChange={(_event, picked) => { if (picked) setDraft(dateValue(picked)); }} />
          <Button label="Выбрать дату" onPress={() => commit(draft)} />
          <Button label="Отмена" variant="plain" onPress={close} />
          </ScrollView>
        </View>
      </View>
    </Modal> : null}
  </CreationField>;
}
