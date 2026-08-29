// Interactive challenge task row. Metric tasks (steps, pages) have steppers and
// fill past 100% to show the over-goal bonus that rolls up to the team. Binary
// tasks toggle on tap. Mirrors the mechanic refined in the design.
import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text, Pressable } from 'react-native';
import { ty } from '../theme/tokens';
import { SF } from './SFIcon';
import { Capsule } from './ui';
import { ChallengeTask, taskDone, taskPoints } from '../data/community';

import { groupNum } from '../data/api';
const fmt = (n: number) => groupNum(n);

export function ChallengeTaskRow({
  task, divider, onToggle, onAdjust, onSet, step = 1, disabled = false,
}: {
  task: ChallengeTask;
  divider?: boolean;
  onToggle?: () => void;
  onAdjust?: (delta: number) => void;
  onSet?: () => void;
  step?: number;
  disabled?: boolean;
}) {
  const { T } = useTheme();
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
        {done
          ? <Capsule bg={over ? 'rgba(52,199,89,0.18)' : T.brandTinted} color={over ? T.green : T.brand} style={{ alignSelf: 'center' }}>{`+${pts} pts`}</Capsule>
          : <Text style={[ty.caption1, { color: T.labelTertiary }]}>+{task.basePts}</Text>}
      </View>

      <View style={{ marginTop: 6, marginLeft: 30 }}>
        <View accessibilityRole="progressbar" accessibilityLabel={task.title}
          accessibilityValue={{ min: 0, max: task.min, now: task.current, text: `${fmt(task.current)} из ${fmt(task.min)} ${task.unit}` }}
          style={{ height: 5, backgroundColor: T.fillTertiary, borderRadius: 5, overflow: 'hidden' }}>
          <View style={{ width: `${Math.min(100, pct * 100)}%`, height: '100%', backgroundColor: over ? T.green : T.brand, borderRadius: 6 }} />
        </View>
        <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onSet ? (
            <Pressable onPress={onSet} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Изменить значение: ${task.title}`} accessibilityState={{ disabled }}
              style={({ pressed }) => ({ minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.6 : 1 })}>
              <Text style={[ty.caption2, { color: T.labelSecondary }]} numberOfLines={1}>
                <Text style={{ color: over ? T.green : T.brand, fontFamily: ty.caption2.fontFamily }}>{fmt(task.current)}</Text>
                {` / ${fmt(task.min)} ${task.unit}`}
              </Text>
              <SF name="square.and.pencil" size={12} color={T.brand} />
            </Pressable>
          ) : (
            <Text style={[ty.caption2, { color: T.labelSecondary, flex: 1 }]} numberOfLines={1}>
              <Text style={{ color: over ? T.green : T.label, fontFamily: ty.caption2.fontFamily }}>{fmt(task.current)}</Text>
              {` / ${fmt(task.min)} ${task.unit}`}
            </Text>
          )}
          {over && !onAdjust ? <Text style={[ty.caption2, { color: T.green }]} numberOfLines={1}>{`+${fmt(task.current - task.min)} ${task.unit}`}</Text> : null}
          {onAdjust ? <View style={{ flexDirection: 'row', gap: 6 }}>
            <Stepper label={`− ${fmt(step)}`} accessibilityLabel={`Уменьшить ${task.title} на ${fmt(step)}`} onPress={() => onAdjust(-step)} disabled={disabled} />
            <Stepper label={`+ ${fmt(step)}`} accessibilityLabel={`Увеличить ${task.title} на ${fmt(step)}`} onPress={() => onAdjust(step)} primary disabled={disabled} />
          </View> : null}
        </View>
      </View>
    </View>
  );
}

function Stepper({ label, accessibilityLabel, onPress, primary, disabled }: { label: string; accessibilityLabel: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  const { T } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} style={({ pressed }) => ({
      width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: primary ? T.brandTinted : T.fillTertiary, opacity: pressed ? 0.6 : 1,
    })}>
      <Text style={[ty.subheadEm, { color: primary ? T.brand : T.label }]}>{label}</Text>
    </Pressable>
  );
}
