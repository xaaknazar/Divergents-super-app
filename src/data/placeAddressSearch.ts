import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type PlaceCoordinate = { latitude: number; longitude: number };

/** Explicit search through the device geocoder; never requests background location. */
export async function findPlaceAddress(address: string, city: string, country: string): Promise<PlaceCoordinate | null> {
  if (address.trim().length < 3) return null;
  if (Platform.OS === 'android') {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) throw new Error('Для поиска адреса на Android разрешите геолокацию или поставьте точку на карте.');
  }
  const results = await Location.geocodeAsync([address.trim(), city, country].filter(Boolean).join(', '));
  const result = results.find(point => Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180);
  return result ? { latitude: result.latitude, longitude: result.longitude } : null;
}
