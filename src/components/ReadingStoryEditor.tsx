import React, { useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { ReadingHistory } from '../data/readingBooks';
import { readingStatistics } from '../data/readingStatistics';
import { ReadingStoryCard, ReadingStoryBackground } from './ReadingStoryCard';
import { Wrapper } from './Wrapper';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { ScreenDescription } from './ScreenDescription';
export function ReadingStoryEditor({ data }: { data: ReadingHistory }) {
  const canvas = useRef<View>(null), s = readingStatistics(data);
  const [background, setBackground] = useState<ReadingStoryBackground>('navy');
  const [photo, setPhoto] = useState<string>();
  const [imageReady, setImageReady] = useState(true);
  const [selected, setSelected] = useState(s.metrics.map(m => m.key));
  const [bookPage, setBookPage] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [9, 16] });
      if (!result.canceled && result.assets[0]) { setImageReady(false); setPhoto(result.assets[0].uri); setBackground('photo'); }
    } catch { Alert.alert('Фото недоступно', 'Попробуйте выбрать другое фото.'); }
  };
  const exportImage = async (save: boolean) => {
    if (busy || !imageReady || !canvas.current) return;
    setBusy(true); let uri: string | undefined;
    try {
      uri = await captureRef(canvas, { width: 1080, height: 1920, format: 'png', quality: 1, result: 'tmpfile' });
      if (save) {
        const p = await MediaLibrary.requestPermissionsAsync(true);
        if (!p.granted) throw new Error('Разрешите сохранение фото в настройках.');
        await MediaLibrary.saveToLibraryAsync(uri); Alert.alert('Сохранено', 'Карточка добавлена в Фото.');
      } else {
        if (!await Sharing.isAvailableAsync()) throw new Error('На этом устройстве можно сохранить карточку в Фото.');
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Моё чтение' });
      }
    } catch (e) { Alert.alert('Не удалось поделиться', e instanceof Error ? e.message : 'Попробуйте ещё раз.'); }
    finally { if (uri) releaseCapture(uri); setBusy(false); }
  };
  return <Wrapper padding={16} gap={16}>
    <Wrapper maxWidth={430} alignSelf="center" width="100%"><ReadingStoryCard ref={canvas} data={data} background={background} photo={photo} metrics={selected} bookPage={bookPage} onImageReady={() => setImageReady(true)} onImageError={() => {
      setBackground('navy'); setImageReady(true); Alert.alert('Фото недоступно', 'Выберите другое фото. Пока установлен синий фон.');
    }} /></Wrapper>
    <Wrapper dir="row" gap={8} wrap>
      {([['navy', 'Синий'], ['paper', 'Бумага'], ['night', 'Ночь']] as const).map(([value, label]) => <Button key={value} label={label} size="compact" variant="tinted" selected={background === value} onPress={() => { setBackground(value); setImageReady(true); }} />)}
      <Button label="Моё фото" size="compact" variant="tinted" selected={background === 'photo'} onPress={pickPhoto} />
    </Wrapper>
    <Wrapper dir="row" gap={8}><Button label="Цифры" variant={bookPage === null ? 'solid' : 'tinted'} onPress={() => setBookPage(null)} />
      <Button label="Книги" variant={bookPage !== null ? 'solid' : 'tinted'} disabled={!s.books.length} onPress={() => setBookPage(0)} /></Wrapper>
    {bookPage === null ? <Wrapper gap={8}>
      <ScreenDescription text="Выберите показатели для карточки" />
      {s.metrics.map(m => <Checkbox key={m.key} label={`${m.value} ${m.label}`} checked={selected.includes(m.key)} onChange={checked => setSelected(v => checked ? [...v, m.key] : v.length > 1 ? v.filter(k => k !== m.key) : v)} />)}
    </Wrapper> : s.books.length > 5 ? <Wrapper gap={8}>
      <Button label="Предыдущие книги" variant="tinted" disabled={bookPage === 0} onPress={() => setBookPage(bookPage - 1)} />
      <Button label="Следующие книги" variant="tinted" disabled={(bookPage + 1) * 5 >= s.books.length} onPress={() => setBookPage(bookPage + 1)} />
    </Wrapper> : null}
    <Button label="Поделиться" icon="square.and.arrow.up" loading={busy} disabled={!imageReady} onPress={() => exportImage(false)} />
    <Button label="Сохранить в Фото" variant="tinted" disabled={busy || !imageReady} onPress={() => exportImage(true)} />
  </Wrapper>;
}
