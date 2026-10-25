import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';

/** Раздел «Моих книг»: подпись с числом и карточка со строками через разделитель. */
export function MyBooksSection({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const { T, ty, isDark } = useTheme();
  const rows = React.Children.toArray(children).filter(React.isValidElement);
  if (!rows.length) return null;
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={[ty.footnoteEm, nums, styles.caption, { color: T.labelSecondary }]}>{count != null ? `${title} · ${count}` : title}</Text>
    <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: isDark ? T.cardBorder : 'transparent' }]}>
      {rows.map((row, i) => <React.Fragment key={row.key ?? i}>
        {i > 0 ? <View style={[styles.separator, { backgroundColor: T.separator }]} /> : null}{row}
      </React.Fragment>)}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  section: { marginHorizontal: 16, gap: 8 },
  caption: { paddingHorizontal: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  card: { borderRadius: radius.block, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 0.5 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
});
