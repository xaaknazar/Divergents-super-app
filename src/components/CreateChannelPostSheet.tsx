import React, { useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { uploadFile, createChannelPost } from '../data/api';
export function CreateChannelPostSheet({ channelId, onClose, onDone, getToken }: { getToken: () => Promise<string | null>; channelId: string; onClose: () => void; onDone: () => void }) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<'article' | 'audio'>('article');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const recRef = useRef<Audio.Recording | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const recTimer = useRef<any>(null);
  const ok = title.trim().length > 1 && (type === 'article' ? body.trim().length > 0 : (!!recordedUri || audioUrl.trim().length > 5));

  const startRec = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Нет доступа к микрофону', 'Разрешите запись в настройках.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const r = new Audio.Recording();
      await r.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await r.startAsync();
      recRef.current = r; setRecording(true); setRecSec(0); setRecordedUri(null);
      recTimer.current = setInterval(() => setRecSec((x) => x + 1), 1000);
    } catch { Alert.alert('Ошибка записи', 'Не удалось начать запись.'); }
  };
  const stopRec = async () => {
    clearInterval(recTimer.current); setRecording(false);
    try { const r = recRef.current; if (r) { await r.stopAndUnloadAsync(); setRecordedUri(r.getURI() ?? null); } } catch {}
    recRef.current = null;
    // Reset the iOS audio session OUT of record mode, otherwise playback of the
    // recorded voice (and lesson videos) stays silent. playsInSilentModeIOS lets
    // it sound even with the mute switch on.
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
    } catch {}
  };
  const inp = { backgroundColor: T.cardBg, borderRadius: 12, borderCurve: 'continuous', paddingVertical: 12, paddingHorizontal: 16, color: T.label, ...ty.body } as any;
  const submit = async () => {
    if (!ok) return; setBusy(true);
    try {
      const token = await getToken();
      let finalAudio = audioUrl.trim();
      if (type === 'audio' && recordedUri) {
        const url = await uploadFile(token, recordedUri, `voice_${Date.now()}.m4a`, 'audio/m4a');
        if (!url) { Alert.alert('Не удалось загрузить аудио', 'Проверьте подключение.'); setBusy(false); return; }
        finalAudio = url;
      }
      const r = await createChannelPost(token, channelId, { type, title: title.trim(), body: type === 'article' ? body.trim() : undefined, audioUrl: type === 'audio' ? finalAudio : undefined });
      if (r) onDone(); else Alert.alert('Не удалось', 'Проверьте подключение и права.');
    } finally { setBusy(false); }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderCurve: 'continuous', padding: 20, paddingBottom: insets.bottom + 16 }}>
        <Text style={[ty.title3, { color: T.label, marginBottom: 12 }]}>Новый пост</Text>
        <View style={{ flexDirection: 'row', backgroundColor: T.fillSecondary, borderRadius: 12, borderCurve: 'continuous', padding: 4, marginBottom: 12 }}>
          {(['article', 'audio'] as const).map((k) => (
            <Pressable key={k} onPress={() => setType(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', backgroundColor: type === k ? T.cardBg : 'transparent' }}>
              <Text style={[ty.footnoteEm, { color: type === k ? T.brand : T.labelSecondary }]}>{k === 'article' ? 'Статья' : 'Аудио'}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={title} onChangeText={setTitle} placeholder="Заголовок" placeholderTextColor={T.labelTertiary} style={[inp, { marginBottom: 10 }]} />
        {type === 'article'
          ? <TextInput value={body} onChangeText={setBody} placeholder="Текст" placeholderTextColor={T.labelTertiary} multiline style={[inp, { minHeight: 110, textAlignVertical: 'top' }]} />
          : (
            <View>
              <Pressable onPress={recording ? stopRec : startRec} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: recording ? '#EF4444' : T.brandTinted, borderRadius: 12, borderCurve: 'continuous', paddingVertical: 12, paddingHorizontal: 16 }}>
                <SF name={recording ? 'pause.fill' : 'waveform'} size={18} color={recording ? '#fff' : T.brand} />
                <Text style={[ty.subheadEm, { color: recording ? '#fff' : T.brand }]}>{recording ? `Остановить · ${recSec}s` : recordedUri ? 'Записать заново' : 'Записать голос'}</Text>
              </Pressable>
              {recordedUri ? <Text style={[ty.caption1, { color: T.green, marginTop: 6 }]}>Голос записан ✓</Text> : null}
              <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 10, marginBottom: 4 }]}>или вставьте ссылку:</Text>
              <TextInput value={audioUrl} onChangeText={setAudioUrl} placeholder="Ссылка на аудио (mp3/m4a)" placeholderTextColor={T.labelTertiary} autoCapitalize="none" style={inp} />
            </View>
          )}
        <Pressable onPress={submit} disabled={!ok || busy} style={{ marginTop: 14, height: 48, borderRadius: 16, borderCurve: 'continuous', backgroundColor: ok ? T.brand : T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ty.headline, { color: ok ? '#fff' : T.labelTertiary }]}>Опубликовать</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
