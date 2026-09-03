// Выбор посещённых стран.
//
// Раньше страны вбивались руками по одной: долго, и одно место превращалось в
// «оаэ», «Эмираты» и «UAE» — три разных значения в базе. Здесь список с
// поиском: касание добавляет и убирает страну.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { minTouch } from '../theme/tokens';
import { searchCountries, countryFlag, Country } from '../data/countries';
import { tr } from '../state/LanguageContext';

export function CountryPickerField({
  value, onChange, labelEl, inputStyle, errorEl, accessibilityLabel,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  labelEl: React.ReactNode;
  inputStyle: object;
  errorEl?: React.ReactNode;
  accessibilityLabel: string;
}) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = Array.isArray(value) ? value : [];
  const results = useMemo(() => searchCountries(query), [query]);

  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter((c) => c !== name) : [...selected, name]);
  };

  const renderRow = ({ item }: { item: Country }) => {
    const on = selected.includes(item.name);
    return (
      <Pressable
        onPress={() => toggle(item.name)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        accessibilityLabel={item.name}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: minTouch,
          paddingVertical: 11, paddingHorizontal: 16,
          backgroundColor: pressed ? T.fillQuaternary : 'transparent',
        })}
      >
        <Text style={{ fontSize: 22 }}>{item.flag}</Text>
        <Text style={[ty.body, { color: T.label, flex: 1 }]} numberOfLines={1}>{item.name}</Text>
        {on ? <SF name="checkmark" size={16} color={T.brand} /> : null}
      </Pressable>
    );
  };

  return (
    <View style={{ marginBottom: 14 }}>
      {labelEl}

      <Pressable
        onPress={() => { setQuery(''); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}. ${selected.length ? `Выбрано: ${selected.join(', ')}` : 'Ничего не выбрано'}`}
        style={[inputStyle, { minHeight: minTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }]}
      >
        <Text style={[ty.body, { color: selected.length ? T.label : T.labelTertiary, flex: 1 }]} numberOfLines={1}>
          {selected.length ? `${tr('Выбрано')}: ${selected.length}` : tr('Выберите страны')}
        </Text>
        <SF name="chevron.right" size={14} color={T.labelTertiary} />
      </Pressable>

      {/* Выбранные — чипами, касание убирает. Так видно список целиком, а не
          только счётчик. */}
      {selected.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {selected.map((name) => (
            <Pressable
              key={name}
              onPress={() => toggle(name)}
              accessibilityRole="button"
              accessibilityLabel={`${tr('Убрать')} ${name}`}
              style={{ minHeight: minTouch, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: T.brandTinted }}
            >
              <Text style={[ty.footnoteEm, { color: T.brandText }]}>
                {countryFlag(name) ? `${countryFlag(name)} ` : ''}{name}
              </Text>
              <SF name="xmark" size={11} color={T.brandText} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {errorEl}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: T.systemBg }}>
          {/* Модалка занимает весь экран, включая строку состояния: без отступа
              на «чёлку» кнопка «Готово» оказывалась под часами и батареей, и
              нажатие перехватывала система. */}
          <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={[ty.headline, { color: T.label, flex: 1 }]}>{tr('Посещённые страны')}</Text>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel={tr('Готово')}
                hitSlop={8}
                style={{ minHeight: minTouch, minWidth: minTouch, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={[ty.body, { color: T.brand, fontWeight: '600' }]}>{tr('Готово')}</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: T.fillTertiary, borderRadius: 10, paddingHorizontal: 10 }}>
              <SF name="magnifyingglass" size={15} color={T.labelTertiary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={tr('Поиск страны')}
                placeholderTextColor={T.labelTertiary}
                autoCorrect={false}
                accessibilityLabel={tr('Поиск страны')}
                style={[ty.body, { flex: 1, color: T.label, paddingVertical: 9 }]}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={tr('Очистить')} hitSlop={8}>
                  <SF name="xmark.circle.fill" size={16} color={T.labelTertiary} />
                </Pressable>
              ) : null}
            </View>
            {selected.length > 0 ? (
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 8 }]}>
                {tr('Выбрано')}: {selected.length}
              </Text>
            ) : null}
          </View>

          <FlatList
            data={results}
            keyExtractor={(c) => c.code}
            renderItem={renderRow}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ItemSeparatorComponent={() => <View style={{ height: 0.5, backgroundColor: T.separator, marginLeft: 50 }} />}
            ListEmptyComponent={(
              <Text style={[ty.subhead, { color: T.labelTertiary, textAlign: 'center', marginTop: 28 }]}>
                {tr('Ничего не найдено')}
              </Text>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
