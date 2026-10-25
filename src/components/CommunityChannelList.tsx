import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';

/** Сгруппированный список каналов: подпись раздела и одна карточка со строками через разделитель. */
export function CommunityChannelList({ title, footer, children }: { title?: string; footer?: string; children: React.ReactNode }) {
  const { T, ty, isDark } = useTheme();
  const rows = React.Children.toArray(children).filter(React.isValidElement);
  return <View style={styles.section}>
    {title ? <Text accessibilityRole="header" style={[ty.footnoteEm, styles.caption, { color: T.labelSecondary }]}>{title}</Text> : null}
    <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: isDark ? T.cardBorder : 'transparent' }]}>
      {rows.map((row, index) => <React.Fragment key={row.key ?? index}>
        {index > 0 ? <View style={[styles.separator, { backgroundColor: T.separator }]} /> : null}
        {row}
      </React.Fragment>)}
    </View>
    {footer ? <Text style={[ty.footnote, styles.footer, { color: T.labelSecondary }]}>{footer}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  section: { marginHorizontal: 16, gap: 8 },
  caption: { paddingHorizontal: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  footer: { paddingHorizontal: 4 },
  card: { borderRadius: radius.block, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 0.5 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 82 },
});
