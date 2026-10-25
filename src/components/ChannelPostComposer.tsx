// Новая публикация канала: статья (заголовок + текст) или голосовое (запись или ссылка).
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useVoiceRecorder } from '../state/useVoiceRecorder';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';
import { Button } from './Button';
import { ChannelTextField } from './ChannelTextField';
import { Segmented } from './Segmented';
import { SF } from './SFIcon';
import { SheetModal } from './SheetModal';

export type ChannelPostDraft = { type: 'article' | 'audio'; title: string; body?: string; audioUri?: string; audioUrl?: string };

export function ChannelPostComposer({ visible, onClose, onPublish }: {
  visible: boolean; onClose: () => void;
  /** Загрузка и отправка — у экрана. true — опубликовано, лист закрывается и очищается. */
  onPublish: (draft: ChannelPostDraft) => Promise<boolean>;
}) {
  const { T, ty } = useTheme();
  const voice = useVoiceRecorder();
  const [type, setType] = useState<'article' | 'audio'>('article');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!visible) { setTitle(''); setBody(''); setLink(''); setType('article'); voice.reset(); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = title.trim().length > 1 && (type === 'article' ? body.trim().length > 0 : !!voice.uri || link.trim().length > 5) && !voice.active;
  const publish = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      await onPublish({ type, title: title.trim(), ...(type === 'article' ? { body: body.trim() }
        : voice.uri ? { audioUri: voice.uri } : { audioUrl: link.trim() }) });
    } finally { setBusy(false); }
  };
  const minutes = `${Math.floor(voice.seconds / 60)}:${String(voice.seconds % 60).padStart(2, '0')}`;
  return <SheetModal visible={visible} title="Новая публикация" onClose={onClose} tall>
    <Segmented items={['Статья', 'Голосовое']} value={type === 'article' ? 0 : 1} onChange={i => setType(i === 0 ? 'article' : 'audio')} leadingIcons={['doc.text.fill', 'waveform']} />
    <ChannelTextField label="Заголовок" value={title} onChange={setTitle} placeholder="О чём публикация" autoCapitalize="sentences" />
    {type === 'article' ? <ChannelTextField label="Текст" value={body} onChange={setBody} placeholder="Расскажите участникам канала" multiline autoCapitalize="sentences" />
      : <View style={styles.voice}>
        <View style={[styles.recorder, { backgroundColor: T.cardBg }]}>
          <View style={[styles.mic, { backgroundColor: voice.active ? T.red : T.brandTinted }]}>
            <SF name={voice.active ? 'stop.fill' : voice.uri ? 'checkmark' : 'mic.fill'} size={20} color={voice.active ? T.onRed : T.brandText} />
          </View>
          <View style={styles.recText}>
            <Text style={[ty.headline, nums, { color: T.label }]}>{voice.active ? `Идёт запись · ${minutes}` : voice.uri ? `Голос записан · ${minutes}` : 'Голосовое сообщение'}</Text>
            <Text style={[ty.footnote, { color: T.labelSecondary }]}>{voice.active ? 'Нажмите «Остановить», когда закончите.' : voice.uri ? 'Можно опубликовать или записать заново.' : 'Запишите прямо здесь или вставьте ссылку ниже.'}</Text>
          </View>
        </View>
        <Button label={voice.active ? 'Остановить' : voice.uri ? 'Записать заново' : 'Начать запись'} icon={voice.active ? 'stop.fill' : 'mic.fill'}
          variant={voice.active ? 'solid' : 'tinted'} tone={voice.active ? 'danger' : 'brand'} onPress={voice.active ? voice.stop : voice.start} />
        {!voice.uri && !voice.active ? <ChannelTextField label="Или ссылка на аудио" value={link} onChange={setLink} placeholder="https://… (mp3 или m4a)" autoCapitalize="none" /> : null}
      </View>}
    <Button label="Опубликовать" size="large" loading={busy} disabled={!ready} onPress={publish} />
  </SheetModal>;
}
const styles = StyleSheet.create({
  voice: { gap: 12 },
  recorder: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.block, borderCurve: 'continuous' },
  mic: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  recText: { flex: 1, minWidth: 0, gap: 2 },
});
