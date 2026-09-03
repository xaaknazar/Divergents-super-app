import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text, Pressable, TextInput, Modal, Platform, TextInputProps } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SF } from './SFIcon';
import { Segmented } from './ui';
import { minTouch } from '../theme/tokens';
import { ResumeField } from '../data/resumeSchema';
import { parseBirthDate, formatBirthDate, defaultBirthDate, MIN_BIRTH_DATE } from '../data/birthDate';
import { formatPhone } from '../data/phone';
import { CountryPickerField } from './CountryPickerField';

/**
 * Автозаполнение iOS/Android по смыслу поля: имя, фамилия, телефон, почта,
 * город. Одна таблица на оба атрибута, чтобы они не разъезжались.
 */
const AUTOFILL: Record<string, { textContentType: TextInputProps['textContentType']; autoComplete: TextInputProps['autoComplete'] }> = {
  first_name: { textContentType: 'givenName', autoComplete: 'name-given' },
  last_name: { textContentType: 'familyName', autoComplete: 'name-family' },
  middle_name: { textContentType: 'middleName', autoComplete: 'name-middle' },
  nickname: { textContentType: 'nickname', autoComplete: 'nickname' },
  phone: { textContentType: 'telephoneNumber', autoComplete: 'tel' },
  email: { textContentType: 'emailAddress', autoComplete: 'email' },
  current_city: { textContentType: 'addressCity', autoComplete: 'postal-address-locality' },
  birth_place: { textContentType: 'addressCity', autoComplete: 'postal-address-locality' },
};

/** Поля, где каждое слово — с заглавной: имена, города, страны. */
const CAPITALIZE_WORDS = new Set(['first_name', 'last_name', 'middle_name', 'current_city', 'birth_place', 'citizenship', 'desired_position']);
/** Поля без автокапитализации: адреса, логины. */
const NO_CAPITALIZE = new Set(['email', 'instagram', 'nickname', 'phone']);

/** Рисуется ли поле как обычный TextInput (и участвует в цепочке фокуса). */
export function isTextLikeField(field: ResumeField): boolean {
  return field.type === 'text' || field.type === 'number';
}

export function ResumeFieldInput({ field, value, onChange, locked, lockNote, error, inputRef, onSubmitEditing, returnKeyType }: {
  field: ResumeField;
  value: any;
  onChange: (v: any) => void;
  /** Поле только для чтения (например, почта, подтверждённая при входе). */
  locked?: boolean;
  lockNote?: string;
  /** Текст ошибки под полем; красит рамку и попадает в описание для VoiceOver. */
  error?: string;
  /** Для цепочки фокуса «Далее → следующее поле» в форме. */
  inputRef?: React.Ref<TextInput>;
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done';
}) {
  const { T, ty } = useTheme();
  const [tag, setTag] = useState('');
  const labelId = `resume-field-${field.key}`;
  const accessibilityLabel = `${field.label}${field.optional ? '' : ', обязательное поле'}${error ? `. Ошибка: ${error}` : ''}`;
  const labelEl = (
    <Text nativeID={labelId} style={[ty.footnote, { color: error ? T.redText : T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>
      {field.label.toUpperCase()}{field.optional ? '' : ' *'}
    </Text>
  );
  // Ошибка — под полем, тем же шрифтом, что и подпись; рамка становится красной.
  const errorEl = error ? (
    <Text accessibilityLiveRegion="polite" style={[ty.footnote, { color: T.redText, marginTop: 6, marginLeft: 4 }]}>{error}</Text>
  ) : null;
  const inputStyle = {
    backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label,
    borderWidth: error ? 1 : 0, borderColor: error ? T.red : 'transparent',
  };

  if (field.type === 'bool') {
    // Explicit Да/Нет so "No" (false) is a real answer, distinct from
    // "not answered yet" (undefined). Otherwise a single checkbox makes
    // "No" indistinguishable from "unanswered" and blocks the resume gate.
    const opts: [string, boolean][] = [['Да', true], ['Нет', false]];
    return (
      <View style={{ marginBottom: 14 }}>
        {labelEl}
        <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={{ flexDirection: 'row', gap: 8 }}>
          {opts.map(([lbl, val]) => {
            const on = value === val;
            return (
              <Pressable key={lbl} onPress={() => onChange(val)} accessibilityRole="radio" accessibilityLabel={lbl} accessibilityState={{ checked: on }}
                style={{ flex: 1, minHeight: minTouch, paddingVertical: 11, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? T.brand : T.cardBg, borderWidth: error ? 1 : 0.5, borderColor: on ? 'transparent' : error ? T.red : T.separator }}>
                <Text style={[ty.footnoteEm, { color: on ? T.onBrand : T.label }]}>{lbl}</Text>
              </Pressable>
            );
          })}
        </View>
        {errorEl}
      </View>
    );
  }

  if (locked) {
    // Значение показываем, но не даём править: менять его нужно там, где оно
    // подтверждается, иначе анкета и вход разъедутся.
    return (
      <View style={{ marginBottom: 14 }}>
        {labelEl}
        <View style={[inputStyle, { minHeight: minTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: 0.75 }]}>
          <Text style={[ty.body, { color: T.labelSecondary, flex: 1 }]} numberOfLines={1}>{value != null ? String(value) : ''}</Text>
          <SF name="lock.fill" size={15} color={T.labelTertiary} />
        </View>
        {lockNote ? (
          <Text style={[ty.caption1, { color: T.labelTertiary, marginTop: 6, marginLeft: 4 }]}>{lockNote}</Text>
        ) : null}
      </View>
    );
  }

  if (field.type === 'date') {
    return (
      <DateFieldRow
        value={value != null ? String(value) : ''}
        onChange={onChange}
        placeholder={field.placeholder ?? 'ДД.ММ.ГГГГ'}
        accessibilityLabel={accessibilityLabel}
        labelEl={labelEl}
        inputStyle={inputStyle}
        errorEl={errorEl}
      />
    );
  }

  if (field.type === 'select') {
    const options = field.options ?? [];
    // Значение с сервера может прийти числом (3), а варианты — строки («3»).
    const current = value == null ? '' : String(value);
    if (field.segmented) {
      const idx = options.indexOf(current);
      return (
        <View style={{ marginBottom: 14 }}>
          {labelEl}
          <View accessibilityLabel={accessibilityLabel} style={error ? { borderWidth: 1, borderColor: T.red, borderRadius: 11 } : null}>
            <Segmented items={options} value={idx} onChange={(i) => onChange(options[i])} />
          </View>
          {errorEl}
        </View>
      );
    }
    return (
      <View style={{ marginBottom: 14 }}>
        {labelEl}
        <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {options.map((opt) => {
            const on = current === opt;
            return (
              <Pressable key={opt} onPress={() => onChange(opt)} accessibilityRole="radio" accessibilityLabel={`${field.label}: ${opt}`} accessibilityState={{ checked: on }}
                style={{ minHeight: minTouch, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: on ? T.brand : T.cardBg, borderWidth: error ? 1 : 0.5, borderColor: on ? 'transparent' : error ? T.red : T.separator }}>
                <Text style={[ty.footnoteEm, { color: on ? T.onBrand : T.label }]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
        {errorEl}
      </View>
    );
  }

  if (field.type === 'countries') {
    return (
      <CountryPickerField
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        labelEl={labelEl}
        inputStyle={inputStyle}
        errorEl={errorEl}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  if (field.type === 'tags') {
    const tags: string[] = Array.isArray(value) ? value : [];
    return (
      <View style={{ marginBottom: 14 }}>
        {labelEl}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput value={tag} onChangeText={setTag} placeholder={field.placeholder} placeholderTextColor={T.labelTertiary}
            accessibilityLabel={accessibilityLabel} accessibilityLabelledBy={labelId}
            style={[ty.body, { ...inputStyle, flex: 1 }]} onSubmitEditing={() => { if (tag.trim()) { onChange([...tags, tag.trim()]); setTag(''); } }} returnKeyType="done" />
          <Pressable onPress={() => { if (tag.trim()) { onChange([...tags, tag.trim()]); setTag(''); } }} disabled={!tag.trim()}
            accessibilityRole="button" accessibilityLabel={`Добавить: ${field.label}`} accessibilityState={{ disabled: !tag.trim() }}
            style={{ width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="plus.circle.fill" size={30} color={T.brandText} />
          </Pressable>
        </View>
        {tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {tags.map((tg, i) => (
              <Pressable key={i} onPress={() => onChange(tags.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Удалить ${tg}`}
                style={{ minHeight: minTouch, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: T.brandTinted }}>
                <Text style={[ty.footnoteEm, { color: T.brandText }]}>{tg}</Text>
                <SF name="xmark" size={11} color={T.brandText} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {errorEl}
      </View>
    );
  }

  const isPhone = field.key === 'phone';
  const isNumber = field.type === 'number';
  const isTextarea = field.type === 'textarea';
  // iOS: «number-pad» и «phone-pad» без клавиши Return — цепочка «Далее» на них
  // не работает, а для телефона ещё и нет «+». «numbers-and-punctuation» даёт и
  // цифры, и «+», и Return. Android: свои раскладки с Return есть у всех.
  const keyboardType: TextInputProps['keyboardType'] =
    isPhone ? (Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'phone-pad')
    : isNumber ? (Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric')
    : field.key === 'email' ? 'email-address'
    : 'default';
  const autoCapitalize: TextInputProps['autoCapitalize'] =
    NO_CAPITALIZE.has(field.key) || isNumber ? 'none'
    : CAPITALIZE_WORDS.has(field.key) ? 'words'
    : 'sentences';
  const autofill = AUTOFILL[field.key];

  return (
    <View style={{ marginBottom: 14 }}>
      {labelEl}
      <TextInput
        ref={inputRef}
        value={isPhone ? formatPhone(String(value ?? '')) : value != null ? String(value) : ''}
        onChangeText={(t) => onChange(
          isPhone ? formatPhone(t)
            : isNumber ? t.replace(/[^0-9]/g, '')
            : t
        )}
        placeholder={isPhone ? '+7 (777) 123-45-67' : field.placeholder}
        placeholderTextColor={T.labelTertiary}
        accessibilityLabel={accessibilityLabel}
        accessibilityLabelledBy={labelId}
        accessibilityHint={error}
        keyboardType={keyboardType}
        multiline={isTextarea}
        autoCapitalize={autoCapitalize}
        autoCorrect={!NO_CAPITALIZE.has(field.key) && !isNumber}
        textContentType={autofill?.textContentType}
        autoComplete={autofill?.autoComplete}
        // В многострочном поле Return переносит строку — цепочка фокуса его не трогает.
        returnKeyType={isTextarea ? 'default' : (returnKeyType ?? 'done')}
        submitBehavior={isTextarea ? 'newline' : (returnKeyType === 'next' ? 'submit' : 'blurAndSubmit')}
        onSubmitEditing={isTextarea ? undefined : onSubmitEditing}
        style={[ty.body, inputStyle, isTextarea ? { minHeight: 90, textAlignVertical: 'top' } : null]}
      />
      {errorEl}
    </View>
  );
}

/**
 * Дата рождения выбирается пикером, а не набирается руками: набор «ДД.ММ.ГГГГ»
 * порождал недописанные значения вроде «28.10.», которые сервер отбрасывал молча.
 * Наружу поле по-прежнему отдаёт строку «ДД.ММ.ГГГГ» — формат хранения не менялся.
 */
function DateFieldRow({
  value, onChange, placeholder, accessibilityLabel, labelEl, inputStyle, errorEl,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  labelEl: React.ReactNode;
  inputStyle: object;
  errorEl?: React.ReactNode;
}) {
  const { T, ty, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = parseBirthDate(value) ?? defaultBirthDate();
  // Черновик нужен только на iOS: там колесо крутят, а применяют по «Готово».
  const [draft, setDraft] = useState(selected);
  const today = new Date();

  const openPicker = () => { setDraft(parseBirthDate(value) ?? defaultBirthDate()); setOpen(true); };

  return (
    <View style={{ marginBottom: 14 }}>
      {labelEl}
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}${value ? `, выбрано ${value}` : ', не выбрано'}`}
        style={[inputStyle, { minHeight: minTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
      >
        <Text style={[ty.body, { color: value ? T.label : T.labelTertiary }]}>{value || placeholder}</Text>
        <SF name="calendar" size={18} color={T.labelSecondary} />
      </Pressable>
      {errorEl}

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
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setOpen(false)} />
          <View style={{ backgroundColor: T.systemBg, paddingBottom: 28 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" style={{ minHeight: minTouch, justifyContent: 'center', paddingHorizontal: 8 }}>
                <Text style={[ty.body, { color: T.labelSecondary }]}>Отмена</Text>
              </Pressable>
              <Text style={[ty.footnoteEm, { color: T.labelSecondary }]}>ДАТА РОЖДЕНИЯ</Text>
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
