import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActivityEntry, ActivityId, activityRules, activitySteps, activityTotal } from '../data/activityConversion';
import { fmtInt } from '../data/format';
import { useTheme } from '../theme/ThemeContext';
import { HalfSheet } from './HalfSheet';
import { Button } from './Button';
import { SF } from './SFIcon';

/** Adds only NEW activity to the existing total. Reopening never replays previous additions. */
export function ActivityCalculatorSheet({ current, phoneSteps, gender, onClose, onSave }: {
  current: number; phoneSteps: number | null; gender: unknown; onClose: () => void; onSave: (total: number) => void;
}) {
  const { T, ty } = useTheme();
  const [base, setBase] = useState(String(current));
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [step, setStep] = useState<'summary' | 'choose' | 'entry'>('summary');
  const [selected, setSelected] = useState<ActivityId>('run');
  const [draft, setDraft] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const rules = activityRules(gender);
  const rule = rules.find(r => r.id === selected);
  const total = activityTotal(base, entries, gender);
  const added = activitySteps({ id: selected, value: draft }, gender);
  const label = (text: string) => <Text style={[ty.subhead, { color: T.labelSecondary }]}>{text}</Text>;
  const choose = (id: ActivityId, index: number | null = null) => {
    setSelected(id); setDraft(index === null ? '' : entries[index].value); setEditIndex(index); setStep('entry');
  };
  const accept = () => {
    if (!rule || added === null || added <= 0) return;
    const entry = { id: selected, value: draft };
    setEntries(prev => editIndex === null ? [...prev, entry] : prev.map((item, i) => i === editIndex ? entry : item));
    setStep('summary');
  };
  return <HalfSheet visible title={step === 'summary' ? 'Активность за день' : step === 'choose' ? 'Добавить активность' : rule?.label ?? 'Активность недоступна'}
    onClose={onClose} onBack={step !== 'summary' ? () => setStep('summary') : undefined}
    footer={step === 'summary' ? <Button label={total === null ? 'Проверьте значения' : `Сохранить ${fmtInt(total)} шагов`} disabled={total === null}
      onPress={() => { if (total !== null) onSave(total); }} /> : step === 'entry' ? <Button label={added !== null && added > 0 ? `Учесть ${fmtInt(added)} шагов` : 'Введите количество'} disabled={added === null || added <= 0} onPress={accept} /> : undefined}>
    {step === 'summary' ? <>
      {label(current > 0 ? 'Уже учтено, шагов (включая прошлые добавления)' : 'Пройдено шагов')}
      <TextInput accessibilityLabel="Шаги до добавления упражнений" keyboardType="number-pad" value={base} onChangeText={setBase} selectTextOnFocus
        style={[styles.input, ty.title2, { color: T.label, backgroundColor: T.fillTertiary }]} />
      {phoneSteps !== null ? <Button variant="plain" size="compact" label={`Из шагомера: ${fmtInt(phoneSteps)}`} onPress={() => {
        const replace = () => { setBase(String(phoneSteps)); setEntries([]); };
        if (Number(base) > 0 || entries.length) Alert.alert('Заменить сумму?', 'Шаги телефона заменят текущее число и добавленные упражнения. Добавляйте затем только нагрузку, которую шагомер не учёл.', [{ text: 'Отмена', style: 'cancel' }, { text: 'Заменить', onPress: replace }]);
        else replace();
      }} /> : null}
      {entries.map((entry, i) => <View key={i} style={[styles.row, { borderBottomColor: T.separator }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Изменить ${rules.find(r => r.id === entry.id)?.label ?? 'активность'}`} onPress={() => choose(entry.id, i)} style={styles.flex}>
          <Text style={[ty.headline, { color: T.label }]}>{rules.find(r => r.id === entry.id)?.label ?? 'Недоступная активность'}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary }]}>{entry.value} {rules.find(r => r.id === entry.id)?.unit} · +{fmtInt(activitySteps(entry, gender) ?? 0)} шагов</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Удалить добавленную активность" onPress={() => setEntries(prev => prev.filter((_, n) => n !== i))} style={styles.remove}><SF name="xmark.circle.fill" size={24} color={T.labelSecondary} /></Pressable>
      </View>)}
      <Button label="Добавить активность" icon="plus" variant="tinted" onPress={() => setStep('choose')} />
      {label('Добавляйте только нагрузку, которая ещё не входит в сумму. Бег, учтённый шагомером, повторно добавлять не нужно.')}
      {label('Минимум 5 000 шагов — аэробная нагрузка. 400 шагов = 1 балл. Сохраняется общая сумма за день.')}
    </> : step === 'choose' ? rules.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.label}. ${item.rule}`} onPress={() => choose(item.id)} style={[styles.row, { borderBottomColor: T.separator }]}>
      <SF name={item.icon} size={24} color={T.brandText} /><View style={styles.flex}><Text style={[ty.headline, { color: T.label }]}>{item.label}</Text>{label(item.rule)}</View>
      <SF name="chevron.right" size={16} color={T.labelSecondary} />
    </Pressable>) : <>
      {label(rule?.rule ?? 'Проверьте пол в анкете или выберите другую активность.')}
      <TextInput accessibilityLabel={`Количество, ${rule?.unit ?? ''}`} autoFocus keyboardType={rule?.unit === 'повт.' ? 'number-pad' : 'decimal-pad'} value={draft} onChangeText={setDraft}
        placeholder={`0 ${rule?.unit ?? ''}`} placeholderTextColor={T.labelTertiary} style={[styles.input, ty.largeTitle, { color: T.label, backgroundColor: T.fillTertiary }]} />
      <Text accessibilityLiveRegion="polite" style={[ty.title2, { color: T.brandText }]}>{added === null ? 'Введите корректное число' : `${fmtInt(added)} шагов`}</Text>
      {label('Неполный шаг округляется вниз. Результат добавится к общей активности за день.')}
      {selected === 'run' ? label('Если эти шаги уже есть в шагомере, второй раз добавлять их не нужно.') : null}
    </>}
  </HalfSheet>;
}
const styles = StyleSheet.create({ input: { minHeight: 58, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 }, remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
