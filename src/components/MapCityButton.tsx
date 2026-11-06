import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hSelect } from '../lib/haptics';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius } from '../theme/tokens';
import { SF } from './SFIcon';
import { GlassSurface } from './GlassSurface';

export interface MapCityButtonProps {
  city: string;
  country?: string;
  expanded?: boolean;
  onPress: () => void;
}

/** Город — стеклянная капсула поверх карты, как элементы управления в Картах на iOS 26:
 * стекло подстраивается под тайлы и читается на любом фоне. Длинные названия переносятся. */
export function MapCityButton({ city, country, expanded = false, onPress }: MapCityButtonProps) {
  const { T, ty } = useTheme();
  const [focused, setFocused] = useState(false);
  return <Pressable testID="map-city-button" accessibilityRole="button"
    accessibilityLabel={`${tr('Выбрать город')}: ${city}${country ? `, ${country}` : ''}`}
    accessibilityHint={tr('Открыть список городов')} accessibilityState={{ expanded }}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    onPress={() => { hSelect(); onPress(); }}
    style={({ pressed }) => ({ alignSelf: 'flex-start', maxWidth: '100%', minHeight: minTouch, minWidth: minTouch, borderRadius: radius.pill,
      outlineColor: T.brandText, outlineWidth: focused ? 2 : 0, outlineOffset: 2, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
    <GlassSurface interactive style={styles.button}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SF name="location.fill" size={15} color={T.brandText} />
      </View>
      <Text testID="map-city-name" style={[ty.headline, { color: T.label, flexShrink: 1 }]}>{city}</Text>
      {country ? <Text testID="map-country-name" style={[ty.subhead, { color: T.labelSecondary, flexShrink: 1 }]}>{country}</Text> : null}
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SF name={expanded ? 'chevron.up' : 'chevron.down'} size={12} color={T.labelSecondary} />
      </View>
    </GlassSurface>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start', columnGap: 8,
    minHeight: minTouch, minWidth: minTouch, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill,
  },
});
