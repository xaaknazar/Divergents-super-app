import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hSelect } from '../lib/haptics';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius } from '../theme/tokens';
import { SF } from './SFIcon';

export interface MapCityButtonProps {
  city: string;
  country?: string;
  expanded?: boolean;
  onPress: () => void;
}

/** An opaque surface keeps the current city readable over every map tile.
 * Long names wrap at the user's text size instead of shrinking or disappearing. */
export function MapCityButton({ city, country, expanded = false, onPress }: MapCityButtonProps) {
  const { T, ty } = useTheme();
  const [focused, setFocused] = useState(false);
  return <Pressable testID="map-city-button" accessibilityRole="button"
    accessibilityLabel={`${tr('Выбрать город')}: ${city}${country ? `, ${country}` : ''}`}
    accessibilityHint={tr('Открыть список городов')} accessibilityState={{ expanded }}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    onPress={() => { hSelect(); onPress(); }}
    style={({ pressed }) => [styles.button, {
      backgroundColor: T.cardBg, borderColor: T.separator,
      outlineColor: T.brandText, outlineWidth: focused ? 2 : 0, outlineOffset: -2,
      transform: [{ scale: pressed ? 0.99 : 1 }],
    }]}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SF name="mappin.and.ellipse" size={20} color={T.brandText} />
    </View>
    <View style={styles.copy}>
      <Text testID="map-city-name" style={[ty.headline, { color: T.label }]}>{city}</Text>
      {country ? <Text testID="map-country-name" style={[ty.caption1, { color: T.labelSecondary }]}>{country}</Text> : null}
    </View>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SF name={expanded ? 'chevron.up' : 'chevron.down'} size={14} color={T.brandText} />
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: 64, minWidth: minTouch, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 0.5,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
