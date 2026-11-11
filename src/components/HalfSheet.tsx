import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { HeaderIcon } from './HeaderIcon';

/** A focused half-height task. Only its handle dismisses by dragging; lists retain their own scrolling. */
export function HalfSheet({ visible, title, onClose, onBack, children, footer, size = 'regular' }: {
  visible: boolean; title: string; onClose: () => void; onBack?: () => void;
  children: React.ReactNode; footer?: React.ReactNode; size?: 'regular' | 'large';
}) {
  const { T, ty, reduceMotion, textScale = 1 } = useTheme();
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pan = useMemo(() => PanResponder.create({ onMoveShouldSetPanResponder: (_, g) => g.dy > 12 && Math.abs(g.dx) < g.dy,
    onPanResponderRelease: (_, g) => { if (g.dy > 48 || g.vy > 0.6) onClose(); } }), [onClose]);
  return <Modal visible={visible} transparent statusBarTranslucent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
    <KeyboardAvoidingView style={[styles.host, { paddingTop: insets.top + 16 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть панель" />
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: T.cardBg, height: Math.min(height - insets.top - 16, Math.max(410, height * (fontScale * textScale > 1.15 ? 0.88 : size === 'large' ? 0.68 : 0.57))), paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View {...pan.panHandlers} style={styles.handleArea}><View style={[styles.handle, { backgroundColor: T.labelTertiary }]} /></View>
        <View style={styles.header}>
          {onBack ? <HeaderIcon name="chevron.left" label="Назад" onPress={onBack} /> : null}
          <Text accessibilityRole="header" style={[ty.title3, styles.title, { color: T.label }]}>{title}</Text>
          <HeaderIcon name="xmark" label="Закрыть" onPress={onClose} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>{children}</ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  host: { flex: 1, justifyContent: 'flex-end' }, backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  sheet: { flexShrink: 1, minHeight: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderCurve: 'continuous', overflow: 'hidden' },
  handleArea: { height: 20, justifyContent: 'center', alignItems: 'center' }, handle: { width: 36, height: 5, borderRadius: 3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  title: { flex: 1 }, content: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 }, footer: { paddingHorizontal: 20, paddingTop: 8 },
});
