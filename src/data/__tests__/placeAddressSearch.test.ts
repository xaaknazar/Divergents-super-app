import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { findPlaceAddress } from '../placeAddressSearch';
jest.mock('expo-location', () => ({ geocodeAsync: jest.fn(), requestForegroundPermissionsAsync: jest.fn() }));
const geocode = jest.mocked(Location.geocodeAsync);
const permission = jest.mocked(Location.requestForegroundPermissionsAsync);
const originalOS = Platform.OS;
afterEach(() => { Platform.OS = originalOS; });
beforeEach(() => { geocode.mockReset(); permission.mockReset(); Platform.OS = 'ios'; });
it('includes the chosen city and country and discards invalid coordinates', async () => {
  geocode.mockResolvedValue([{ latitude: 100, longitude: 0 }, { latitude: 43.2, longitude: 76.9 }]);
  await expect(findPlaceAddress('  Улица 14  ', 'Алматы', 'Казахстан')).resolves.toEqual({ latitude: 43.2, longitude: 76.9 });
  expect(geocode).toHaveBeenCalledWith('Улица 14, Алматы, Казахстан');
  expect(permission).not.toHaveBeenCalled();
});
it('does not geocode incomplete input', async () => {
  await expect(findPlaceAddress(' а ', 'Алматы', 'Казахстан')).resolves.toBeNull();
  expect(geocode).not.toHaveBeenCalled();
});
it('explains denied Android permission without searching or selecting a wrong pin', async () => {
  Platform.OS = 'android';
  permission.mockResolvedValue({ granted: false } as Location.LocationPermissionResponse);
  await expect(findPlaceAddress('Улица 14', 'Алматы', 'Казахстан')).rejects.toThrow('поставьте точку на карте');
  expect(geocode).not.toHaveBeenCalled();
});
