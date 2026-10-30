import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { defaultBirthDate, formatBirthDate, MIN_BIRTH_DATE, parseBirthDate } from '../data/birthDate';
import { useTheme } from '../theme/ThemeContext';
import { minTouch } from '../theme/tokens';
import { FieldLabel } from './FieldLabel';
import { FieldError } from './FieldError';
import { FieldTrigger } from './FieldTrigger';

/**
 * Дата рождения выбирается пикером, а не набирается руками: набор «ДД.ММ.ГГГГ»
 * порождал недописанные значения вроде «28.10.», которые сервер отбрасывал молча.
 * Наружу поле по-прежнему отдаёт строку «ДД.ММ.ГГГГ» — формат хранения не менялся.
 */
export function BirthDateField({
  value, onChange, placeholder, accessibilityLabel, label, required, error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  label: string;
  required?: boolean;
  error?: string;
}) {
  const { T, ty, isDark, reduceMotion } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = parseBirthDate(value) ?? defaultBirthDate();
  // Черновик нужен только на iOS: там колесо крутят, а применяют по «Готово».
  const [draft, setDraft] = useState(selected);
  const today = new Date();

  const openPicker = () => { setDraft(parseBirthDate(value) ?? defaultBirthDate()); setOpen(true); };

  return (
    <View style={{ marginBottom: 14 }}>
      <FieldLabel label={label} required={required} invalid={!!error} />
      <FieldTrigger onPress={openPicker} icon="calendar" value={value} placeholder={placeholder} invalid={!!error}
        accessibilityLabel={`${accessibilityLabel}${value ? `, выбрано ${value}` : ', не выбрано'}`} />
      <FieldError message={error} />

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={selected}
          mode="date"
          display="spinner"
          minimumDate={MIN_BIRTH_DATE}
          maximumDate={today}
          onChange={(event, picked) => {
            setOpen(false);
            if (event.type === 'set' && picked) onChange(formatBirthDate(picked));
          }}
        />
      ) : null}

      {Platform.OS !== 'android' ? (
        <Modal visible={open} transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setOpen(false)} />
          <View style={{ backgroundColor: T.systemBg, paddingBottom: 28 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" style={{ minHeight: minTouch, justifyContent: 'center', paddingHorizontal: 8 }}>
                <Text style={[ty.body, { color: T.labelSecondary }]}>Отмена</Text>
              </Pressable>
              <Text style={[ty.footnoteEm, { color: T.labelSecondary }]}>Дата рождения</Text>
              <Pressable
                onPress={() => { onChange(formatBirthDate(draft)); setOpen(false); }}
                accessibilityRole="button"
                style={{ minHeight: minTouch, justifyContent: 'center', paddingHorizontal: 8 }}
              >
                <Text style={[ty.body, { color: T.brand, fontWeight: '600' }]}>Готово</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              locale="ru-RU"
              themeVariant={isDark ? 'dark' : 'light'}
              minimumDate={MIN_BIRTH_DATE}
              maximumDate={today}
              onChange={(_e, picked) => { if (picked) setDraft(picked); }}
              style={{ height: 200 }}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
