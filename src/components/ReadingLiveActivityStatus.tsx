import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReadingLiveActivityStatus as LiveActivityStatus } from '../state/readingNative';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';

export interface ReadingLiveActivityStatusProps {
  status: LiveActivityStatus | null;
  busy?: boolean;
  onRestore: () => void;
}

/** Status of the lock-screen card only; restoring it always requires a tap. */
export function ReadingLiveActivityStatus({ status, busy = false, onRestore }: ReadingLiveActivityStatusProps) {
  const { T, ty } = useTheme();
  if (!status || status.state === 'active' || status.state === 'stale' || status.state === 'paused' || status.state === 'unsupported') return null;
  const message = status.state === 'disabled'
    ? 'Карточка таймера выключена в настройках iPhone.'
    : status.state === 'error'
      ? 'Не удалось показать карточку таймера. Чтение продолжается.'
      : 'Карточка таймера не отображается. Чтение продолжается.';
  return <View accessibilityLiveRegion="polite" style={styles.root}>
    <Text style={[ty.subhead, { color: T.labelSecondary }]}>{message}</Text>
    {status.canRestore && status.state !== 'disabled' ? <View style={styles.action}>
      <Button label="Показать таймер" variant="plain" size="compact" loading={busy} disabled={busy} onPress={onRestore} />
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 4 },
  action: { alignSelf: 'flex-start', maxWidth: '100%' },
});
