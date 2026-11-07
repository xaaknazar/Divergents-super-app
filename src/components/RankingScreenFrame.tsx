import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { ColorWash } from './ColorWash';
import { NavHeader } from './NavHeader';
import { SeasonButton } from './SeasonButton';

/** The list spans the screen; a soft edge and floating controls never crop its card into a rectangle. */
export function RankingScreenFrame({ children, onBack, season, onSeason, onRefresh, refreshing = false, resetKey }: {
  children: React.ReactNode; onBack: () => void; season?: number | null; onSeason: () => void;
  onRefresh?: () => void; refreshing?: boolean; resetKey?: string;
}) {
  const { T, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={[styles.root, { backgroundColor: T.groupedBg }]}>
    <ColorWash strength="strong" />
    <ScrollView key={resetKey} testID="ranking-fullscreen-scroll" style={styles.root} contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: Math.max(insets.bottom, 20) }}
      scrollIndicatorInsets={{ top: insets.top + 64, bottom: insets.bottom }}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={insets.top + 64} tintColor={T.brandText} /> : undefined}>
      {children}
    </ScrollView>
    <View pointerEvents="box-none" style={styles.overlay}>
      <LinearGradient pointerEvents="none" colors={isDark ? ['rgba(10,14,24,0.86)', 'rgba(10,14,24,0.32)', 'rgba(10,14,24,0)'] : ['rgba(238,243,250,0.8)', 'rgba(238,243,250,0.3)', 'rgba(238,243,250,0)']}
        locations={[0, 0.65, 1]} style={[styles.edge, { height: insets.top + 90 }]} />
      <NavHeader onBack={onBack} onWash trailing={<SeasonButton season={season} onPress={onSeason} />} />
    </View>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, overlay: { position: 'absolute', top: 0, left: 0, right: 0 }, edge: { position: 'absolute', top: 0, left: 0, right: 0 } });
