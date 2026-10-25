import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';

/** Поле формы канала: подпись, ввод (одна строка или абзац), необязательный префикс вроде «@». */
export function ChannelTextField({ label, value, onChange, placeholder, multiline = false, prefix, hint, autoCapitalize }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; prefix?: string; hint?: string;
  autoCapitalize?: 'none' | 'sentences';
}) {
  const { T, ty } = useTheme();
  return <View style={styles.field}>
    <Text style={[ty.footnoteEm, styles.label, { color: T.labelSecondary }]}>{label}</Text>
    <View style={[styles.box, { backgroundColor: T.cardBg, alignItems: multiline ? 'flex-start' : 'center' }]}>
      {prefix ? <Text style={[ty.body, multiline ? styles.prefixTop : null, { color: T.labelTertiary }]}>{prefix}</Text> : null}
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={T.labelTertiary}
        multiline={multiline} autoCapitalize={autoCapitalize} textAlignVertical={multiline ? 'top' : 'center'}
        style={[ty.body, styles.input, multiline ? styles.multiline : null, { color: T.label }]} />
    </View>
    {hint ? <Text style={[ty.footnote, styles.label, { color: T.labelSecondary }]}>{hint}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { paddingHorizontal: 4 },
  prefixTop: { paddingTop: 12 },
  box: { flexDirection: 'row', paddingHorizontal: 14, borderRadius: radius.input, borderCurve: 'continuous' },
  input: { flex: 1, minHeight: 48, paddingVertical: 12 },
  multiline: { minHeight: 120 },
});
