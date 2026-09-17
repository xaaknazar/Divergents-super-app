// Interactive challenge task row. Metric tasks (steps, pages) have steppers and
// fill past 100% to show the over-goal bonus that rolls up to the team. Binary
// tasks toggle on tap. Mirrors the mechanic refined in the design.
import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { View, Text, Pressable } from 'react-native';
import { SF } from './SFIcon';
import { Capsule } from './ui';
import { ChallengeTask, taskDone, taskPoints } from '../data/community';

import { groupNum } from '../data/api';
const fmt = (n: number) => groupNum(n);

export function ChallengeTaskRow({
  task, divider, onToggle, onSet, disabled = false,
}: {
  task: ChallengeTask;
  divider?: boolean;
  onToggle?: () => void;
  onSet?: () => void;
  disabled?: boolean;
}) {
  const { T, ty } = useTheme();
  const done = taskDone(task);
  const pts = taskPoints(task);

  if (task.kind === 'binary') {
    // A 0-point binary is a discipline GATE (e.g. «День без сахара»): соблюдение
    // не даёт баллов (нарушение штрафуется), поэтому показываем «условие», а не «+0 pts».
    const isGate = task.basePts === 0;
    return (
      <Pressable onPress={onToggle} disabled={disabled} accessibilityRole="checkbox" accessibilityLabel={task.title} accessibilityState={{ checked: done, disabled }}
        accessibilityHint={done ? 'Нажмите, чтобы отменить выполнение' : 'Нажмите, чтобы отметить выполненным'}
        style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, borderBottomWidth: divider ? 0.5 : 0, borderBottomColor: T.separator, opacity: disabled ? 0.5 : pressed ? 0.65 : 1 })}>
        <SF name={done ? 'checkmark.circle.fill' : 'circle'} size={21} color={done ? T.brand : T.labelTertiary} />
        <Text style={[ty.subheadEm, { flex: 1, color: done ? T.labelSecondary : T.label, textDecorationLine: done ? 'line-through' : 'none' }]} numberOfLines={1}>{task.title}</Text>
        {isGate
          ? (done
            ? <Capsule bg="rgba(52,199,89,0.14)" color={T.green} style={{ alignSelf: 'center' }}>Готово</Capsule>
            : <Text style={[ty.caption2, { color: T.labelTertiary }]}>условие</Text>)
          : (done
            ? <Capsule bg={T.brandTinted} color={T.brand} style={{ alignSelf: 'center' }}>{`+${pts} pts`}</Capsule>
            : <Text style={[ty.caption1, { color: T.labelTertiary }]}>+{task.basePts}</Text>)}
      </Pressable>
    );
  }

  const pct = task.min > 0 ? task.current / task.min : 0;
  const over = pct > 1;
  return (
    <View style={{ paddingVertical: 9, borderBottomWidth: divider ? 0.5 : 0, borderBottomColor: T.separator, opacity: disabled ? 0.5 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <SF name={done ? 'checkmark.circle.fill' : 'circle'} size={21} color={done ? T.brand : T.labelTertiary} />
        <Text style={[ty.subheadEm, { flex: 1, color: T.label }]} numberOfLines={1}>{task.title}</Text>
        {/* Баллы начисляются за каждую единицу, а не только при норме: ниже
            нормы показываем уже заработанное, а не награду за норму. */}
        {done
          ? <Capsule bg={over ? 'rgba(52,199,89,0.18)' : T.brandTinted} color={over ? T.green : T.brand} style={{ alignSelf: 'center' }}>{`+${pts} pts`}</Capsule>
          : <Text style={[ty.caption1, { color: T.labelTertiary }]}>+{pts}</Text>}
      </View>

      <View style={{ marginTop: 6, marginLeft: 30 }}>
        <View accessibilityRole="progressbar" accessibilityLabel={task.title}
          accessibilityValue={{ min: 0, max: task.min, now: task.current, text: `${fmt(task.current)} из ${fmt(task.min)} ${task.unit}` }}
          style={{ height: 5, backgroundColor: T.fillTertiary, borderRadius: 5, borderCurve: 'continuous', overflow: 'hidden' }}>
          <View style={{ width: `${Math.min(100, pct * 100)}%`, height: '100%', backgroundColor: over ? T.green : T.brand, borderRadius: 6, borderCurve: 'continuous' }} />
        </View>
        {/* Значение слева, одна заметная кнопка ввода справа. Кнопок «−1/+1»
            больше нет: страницы и шаги никто не набирает по единице, а мелкая
            иконка карандаша рядом с цифрой терялась. */}
        <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <Text style={[ty.subhead, nums, { color: T.labelSecondary, flex: 1 }]} numberOfLines={1}>
            <Text style={{ color: over ? T.green : T.brand, fontFamily: ty.subheadEm.fontFamily }}>{fmt(task.current)}</Text>
            {` / ${fmt(task.min)} ${task.unit}`}
            {over ? <Text style={{ color: T.green }}>{`  +${fmt(task.current - task.min)}`}</Text> : null}
          </Text>
          {onSet ? (
            <Pressable onPress={onSet} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Ввести значение: ${task.title}`} accessibilityState={{ disabled }}
              style={({ pressed }) => ({
                minHeight: 40, paddingHorizontal: 16, borderRadius: 12, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', gap: 7,
                backgroundColor: disabled ? T.fillTertiary : T.brand, opacity: pressed ? 0.75 : 1,
              })}>
              <SF name="square.and.pencil" size={15} color={disabled ? T.labelTertiary : T.onBrand} />
              <Text style={[ty.subheadEm, { color: disabled ? T.labelTertiary : T.onBrand }]}>{task.current > 0 ? 'Изменить' : 'Ввести'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

