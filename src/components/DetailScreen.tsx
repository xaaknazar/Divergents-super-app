import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { NavHeader } from './NavHeader';
import { Screen } from './Screen';

/** Shared detail chrome. Screens own data and composition, never surface styling. */
export function DetailScreen({ children, title, backLabel, onBack, actions, footer, onRefresh, keyboard = false, scroll = true, hero }: {
  children: React.ReactNode; title?: string; backLabel?: string; onBack?: () => void;
  actions?: React.ReactNode; footer?: React.ReactNode; onRefresh?: () => void | Promise<void>; keyboard?: boolean; scroll?: boolean;
  /** Обложка во всю ширину под статус-баром (iOS 26): шапка с кнопками парит над ней
   * прозрачным стеклом, а не занимает отдельную полосу. */
  hero?: React.ReactNode;
}) {
  const { T } = useTheme();
  const withHero = !!hero && scroll;
  return <View style={[styles.root, { backgroundColor: T.groupedBg }]}>
    {scroll ? null : <NavHeader title={title} backLabel={backLabel} onBack={onBack} trailing={actions} />}
    <KeyboardAvoidingView style={styles.root} enabled={keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll={scroll} topInset={false} bottomInset={!footer} tabPadding={false} aurora={false} onRefresh={onRefresh}
        headerOverCover={withHero}
        header={scroll ? <NavHeader title={withHero ? undefined : title} backLabel={backLabel} onBack={onBack} trailing={actions} /> : undefined}>
        {withHero ? hero : null}
        {scroll ? <View style={styles.content}>{children}</View> : children}
      </Screen>
      {footer}
    </KeyboardAvoidingView>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 680, alignSelf: 'center' } });
