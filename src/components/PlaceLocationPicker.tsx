import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './ui';
import { findPlaceAddress, PlaceCoordinate } from '../data/placeAddressSearch';

export interface PlaceLocationPickerProps {
  coordinate: PlaceCoordinate;
  city: string;
  country: string;
  onChange: (coordinate: PlaceCoordinate) => void;
}

/** Address search places a pin; the selected coordinates are the submission's source of truth. */
export function PlaceLocationPicker({ coordinate, city, country, onChange }: PlaceLocationPickerProps) {
  const { T, ty, isDark } = useTheme();
  const map = useRef<MapView>(null);
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const cancel = () => { request.current++; if (timer.current) clearTimeout(timer.current); setBusy(false); };
  useEffect(() => () => { request.current++; if (timer.current) clearTimeout(timer.current); }, []);
  const search = async () => {
    if (busy || address.trim().length < 3) return;
    const id = ++request.current;
    setBusy(true); setMessage(''); Keyboard.dismiss();
    timer.current = setTimeout(() => {
      if (request.current !== id) return;
      request.current++; setBusy(false);
      setMessage('Поиск занял слишком много времени. Повторите или поставьте точку на карте.');
    }, 12000);
    try {
      const point = await findPlaceAddress(address, city, country);
      if (request.current !== id) return;
      if (!point) { setMessage('Адрес не найден. Уточните улицу и дом или поставьте точку на карте.'); return; }
      onChange(point);
      map.current?.animateToRegion({ ...point, latitudeDelta: 0.003, longitudeDelta: 0.003 }, 400);
      setMessage('Проверьте точку на карте. При необходимости перетащите метку к нужному входу.');
    } catch (error) {
      if (request.current === id) setMessage(error instanceof Error && error.message.startsWith('Для поиска адреса')
        ? error.message : 'Не удалось найти адрес. Проверьте интернет или поставьте точку на карте.');
    } finally {
      if (request.current === id) { if (timer.current) clearTimeout(timer.current); setBusy(false); }
    }
  };
  const placePin = (point: PlaceCoordinate) => {
    cancel(); onChange(point); setMessage('Точка выбрана вручную. При отправке сохраним её положение на карте.');
  };
  return <View style={styles.content}>
    <Text style={[ty.headline, { color: T.label }]}>Где находится место</Text>
    <Text style={[ty.subhead, { color: T.labelSecondary }]}>{city}, {country}</Text>
    <TextInput value={address} onChangeText={value => { cancel(); setAddress(value); setMessage(''); }}
      accessibilityLabel="Улица и номер дома" placeholder="Улица и номер дома" placeholderTextColor={T.labelTertiary}
      autoCorrect={false} returnKeyType="search" onSubmitEditing={() => { void search(); }} maxLength={200}
      style={[ty.body, styles.input, { color: T.label, backgroundColor: T.cardBg }]} />
    <Button label="Найти на карте" icon="magnifyingglass" onPress={() => { void search(); }} loading={busy} disabled={busy || address.trim().length < 3} />
    {message ? <Text accessibilityLiveRegion="polite" style={[ty.footnote, { color: T.labelSecondary }]}>{message}</Text> : null}
    <View style={styles.mapFrame}>
      <MapView ref={map} testID="place-location-map" style={styles.map} mapType="standard" showsBuildings showsPointsOfInterest
        initialRegion={{ ...coordinate, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
        userInterfaceStyle={isDark ? 'dark' : 'light'} pitchEnabled={false}
        onPress={event => placePin(event.nativeEvent.coordinate)}>
        <Marker draggable coordinate={coordinate} pinColor={T.brand}
          onDragEnd={event => placePin(event.nativeEvent.coordinate)} />
      </MapView>
    </View>
    <Text style={[ty.caption1, { color: T.labelSecondary }]}>Приблизьте карту, чтобы рассмотреть дома. Можно нажать на карту или перетащить метку.</Text>
  </View>;
}
const styles = StyleSheet.create({
  content: { gap: 10 },
  input: { minHeight: 48, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  mapFrame: { height: 280, borderRadius: 20, overflow: 'hidden' },
  map: { flex: 1 },
});
