// «Мои активности» (в макете — CommunityActivityCard): белый блок-ссылка с
// глянцевой плашкой иконки, надзаголовком статуса, названием и датой.
import React from 'react';
import { StyleSheet,Text,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { IconTile } from './IconTile';
import { SF } from './SFIcon';
import { TappableSurface } from './TappableSurface';

export function PersonalActivityCard({ icon, eyebrow, title, subtitle, onPress }: {
  icon: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { T, ty } = useTheme();
  return (
    <TappableSurface onPress={onPress} accessibilityLabel={[eyebrow, title, subtitle].filter(Boolean).join(', ')}>
      <View style={styles.row}>
        <IconTile icon={icon} tone="brand" variant="solid" size="md" />
        <View style={styles.text}>
          <Text style={[ty.caption2Em, styles.eyebrow, { color: T.brandText }]} numberOfLines={1}>{eyebrow}</Text>
          <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[ty.caption2, { color: T.labelSecondary }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <SF name="chevron.forward" size={16} color={T.labelTertiary} />
      </View>
    </TappableSurface>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 68, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0, gap: 1 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.25 },
});
