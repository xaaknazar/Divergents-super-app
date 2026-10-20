import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { NavHeader } from './NavHeader';
import { Screen } from './Screen';

/** Shared detail chrome. Screens own data and composition, never surface styling. */
export function DetailScreen({ children, title, backLabel, onBack, actions, footer, onRefresh, keyboard = false, scroll = true }: {
  children: React.ReactNode; title?: string; backLabel?: string; onBack?: () => void;
  actions?: React.ReactNode; footer?: React.ReactNode; onRefresh?: () => void | Promise<void>; keyboard?: boolean; scroll?: boolean;
}) {
  const { T } = useTheme();
  return <View style={[styles.root, { backgroundColor: T.groupedBg }]}>
    <NavHeader title={title} backLabel={backLabel} onBack={onBack} trailing={actions} />
    <KeyboardAvoidingView style={styles.root} enabled={keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll={scroll} topInset={false} bottomInset={!footer} tabPadding={false} aurora={false} onRefresh={onRefresh}>
        {scroll ? <View style={styles.content}>{children}</View> : children}
      </Screen>
      {footer}
    </KeyboardAvoidingView>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 680, alignSelf: 'center' } });
