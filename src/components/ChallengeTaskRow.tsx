// Interactive challenge task row. Metric tasks (steps, pages) have steppers and
// fill past 100% to show the over-goal bonus that rolls up to the team. Binary
// tasks toggle on tap. Mirrors the mechanic refined in the design.
import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text, Pressable } from 'react-native';
import { ty } from '../theme/tokens';
import { SF } from './SFIcon';
import { Capsule } from './ui';
import { ChallengeTask, taskBonus, taskDone, taskPoints } from '../data/community';

import { groupNum } from '../data/api';
const fmt = (n: number) => groupNum(n);

export function ChallengeTaskRow({
  task, divider, onToggle, onAdjust, step = 1,
}: {
  task: ChallengeTask;
  divider?: boolean;
  onToggle?: () => void;
  onAdjust?: (delta: number) => void;
  step?: number;
}) {
  const { T } = useTheme();
  const done = taskDone(task);
  const pts = taskPoints(task);

  if (task.kind === 'binary') {
    return (
      <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: divider ? 0.5 : 0, borderBottomColor: T.separator }}>
        <SF name={done ? 'checkmark.circle.fill' : 'circle'} size={22} color={done ? T.brand : T.labelTertiary} />
        <Text style={[ty.body, { flex: 1, color: done ? T.labelSecondary : T.label, textDecorationLine: done ? 'line-through' : 'none' }]}>{task.title}</Text>
        {done
          ? <Capsule bg={T.brandTinted} color={T.brand}>{`+${pts} pts`}</Capsule>
          : <Text style={[ty.caption1, { color: T.labelTertiary }]}>+{task.basePts}</Text>}
      </Pressable>
    );
  }

  const pct = task.current / task.min;
  const over = pct > 1;
  const bonus = taskBonus(task);

  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: divider ? 0.5 : 0, borderBottomColor: T.separator }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <SF name={done ? 'checkmark.circle.fill' : 'circle'} size={22} color={done ? T.brand : T.labelTertiary} />
        <Text style={[ty.body, { flex: 1, color: T.label }]}>{task.title}</Text>
        {done
          ? <Capsule bg={over ? 'rgba(52,199,89,0.18)' : T.brandTinted} color={over ? T.green : T.brand}>{`+${pts} pts`}</Capsule>
          : <Text style={[ty.caption1, { color: T.labelTertiary }]}>+{task.basePts}</Text>}
      </View>

      <View style={{ marginTop: 8, marginLeft: 34 }}>
        <View style={{ height: 5, backgroundColor: T.fillTertiary, borderRadius: 5, overflow: 'hidden' }}>
          <View style={{ width: `${Math.min(100, pct * 100)}%`, height: '100%', backgroundColor: over ? T.green : T.brand, borderRadius: 5 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
          <Text style={[ty.caption1, { color: T.labelSecondary }]}>
            <Text style={{ color: over ? T.green : T.label, fontWeight: '600' }}>{fmt(task.current)}</Text>
            {` / ${fmt(task.min)} ${task.unit}`}
          </Text>
          {over ? <Text style={[ty.caption1, { color: T.green }]}>{`+${fmt(task.current - task.min)} ${task.unit} · +${bonus} pts`}</Text> : null}
        </View>

        {onAdjust ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Stepper label={`− ${fmt(step)}`} onPress={() => onAdjust(-step)} />
            <Stepper label={`+ ${fmt(step)}`} onPress={() => onAdjust(step)} primary />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Stepper({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  const { T } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
      backgroundColor: primary ? T.brandTinted : T.fillTertiary, opacity: pressed ? 0.6 : 1,
    })}>
      <Text style={[ty.subheadEm, { color: primary ? T.brand : T.label }]}>{label}</Text>
    </Pressable>
  );
}
