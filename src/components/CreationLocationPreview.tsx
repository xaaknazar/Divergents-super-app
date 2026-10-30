import React from 'react';
import { StyleSheet,View } from 'react-native';
import MapView,{ Marker } from 'react-native-maps';
import { useTheme } from '../theme/ThemeContext';

export interface CreationLocationPreviewProps {
  coordinate: { latitude: number; longitude: number };
  location: string;
}

/** A read-only preview of the selected meeting point, never the user's location. */
export function CreationLocationPreview({ coordinate, location }: CreationLocationPreviewProps) {
  const { T, isDark } = useTheme();
  if (!Number.isFinite(coordinate.latitude) || Math.abs(coordinate.latitude) > 90
    || !Number.isFinite(coordinate.longitude) || Math.abs(coordinate.longitude) > 180) return null;
  return <View style={[styles.frame, { backgroundColor: T.secondaryBg }]}>
    <MapView key={`${coordinate.latitude}:${coordinate.longitude}`} testID="creation-location-map" style={styles.map}
      accessible accessibilityLabel={`Место встречи на карте: ${location}`}
      initialRegion={{ ...coordinate, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
      userInterfaceStyle={isDark ? 'dark' : 'light'} loadingEnabled
      scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
      showsUserLocation={false} showsMyLocationButton={false} showsCompass={false} toolbarEnabled={false}>
      <Marker coordinate={coordinate} title={location} pinColor={T.brand} />
    </MapView>
  </View>;
}

const styles = StyleSheet.create({
  frame: { height: 184, borderRadius: 16, overflow: 'hidden' },
  map: { flex: 1 },
});
