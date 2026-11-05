import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ReadingEditableSession } from '../data/readingBooks';
import { parseReadingPages, readingEntryDate } from '../data/readingPageEntry';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Wrapper } from './Wrapper';
import { Button } from './Button';
import { ReadingPagesForm } from './ReadingPagesForm';

export function ReadingSessionCorrection({ session, busy, onSave }: {
  session: ReadingEditableSession; busy: boolean; onSave: (session: ReadingEditableSession, pages: number) => Promise<void>;
}) {
  const { T, ty } = useTheme();
  const [editing, setEditing] = useState(false), [value, setValue] = useState(String(session.pages));
  const [error, setError] = useState<string>(), [saved, setSaved] = useState(false);
  const minutes = Math.floor(session.elapsedMs / 60000);
  const date = readingEntryDate(session.date);
  const time = new Date(session.startedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' });
  const save = async () => {
    const pages = parseReadingPages(value);
    if (pages === null || busy) return;
    setError(undefined);
    try { await onSave(session, pages); setEditing(false); setSaved(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить. Проверьте интернет и повторите попытку.'); }
  };
  return <Wrapper gap={8}>
    {editing ? <>
      <ReadingPagesForm value={value} onChange={v => { setValue(v); setError(undefined); }} onSubmit={() => void save()}
        purpose="correction" sessionMinutes={minutes} bookTitle={`${session.book} · ${date}, ${time}`} busy={busy}
        invalid={parseReadingPages(value) === session.pages} submitLabel="Сохранить изменения" />
      {error ? <Text accessibilityRole="alert" style={[ty.subhead, { color: T.redText }]}>{error}</Text> : null}
      <Button label="Отмена" variant="plain" disabled={busy} onPress={() => { setEditing(false); setError(undefined); }} />
    </> : <View style={[styles.row, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>{date} · {time}</Text>
      <Text style={[ty.headline, { color: T.label }]}>{session.book}</Text>
      <Text style={[ty.body, { color: T.label }]}>{session.pages} стр. · {minutes} мин</Text>
      {saved ? <Text accessibilityLiveRegion="polite" style={[ty.footnote, { color: T.greenText }]}>Изменения сохранены</Text> : null}
      <Button label="Изменить страницы" icon="square.and.pencil" variant="tinted" disabled={busy}
        accessibilityHint={`Подход за ${date} в ${time}. Время чтения не изменится`}
        onPress={() => { setValue(String(session.pages)); setEditing(true); setSaved(false); }} />
    </View>}
  </Wrapper>;
}
const styles = StyleSheet.create({ row: { borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 1, padding: 16, gap: 8 } });
