import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { minTouch } from '../theme/tokens';
import { SF } from './SFIcon';

/** Нижний лист: затемнение, «ручка», заголовок с кнопкой «Закрыть», прокрутка и клавиатура. */
export function SheetModal({ visible, title, onClose, children, tall = false }: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode; tall?: boolean;
}) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть" />
      <View style={[styles.sheet, { backgroundColor: T.groupedBg, paddingBottom: insets.bottom + 12, maxHeight: tall ? '92%' : '80%' }]}>
        <View style={[styles.grabber, { backgroundColor: T.fillSecondary }]} />
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[ty.title3, { color: T.label, flex: 1 }]}>{title}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть"
            style={({ pressed }) => [styles.close, { backgroundColor: T.fillTertiary, opacity: pressed ? 0.6 : 1 }]}>
            <SF name="xmark" size={14} color={T.labelSecondary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderCurve: 'continuous' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, minHeight: minTouch },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, gap: 14 },
});
