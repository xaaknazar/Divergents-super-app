import React, { useRef, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommunityStackParams } from '../../navigation/types';
import { ReadingAppearance } from '../../data/readingAppearance';
import { useReadingAppearance } from '../../state/useReadingAppearance';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { Wrapper } from '../../components/Wrapper';
import { InlineNotice } from '../../components/InlineNotice';
import { ReadingAppearanceGallery } from '../../components/ReadingAppearanceGallery';

export function ReadingAppearanceScreen({ navigation }: NativeStackScreenProps<CommunityStackParams, 'ReadingAppearance'>) {
  const { appearance, setAppearance } = useReadingAppearance();
  const [saving, setSaving] = useState(false), [error, setError] = useState<string>();
  const pending = useRef<Partial<ReadingAppearance>>({});
  const lock = useRef(false);
  const choose = async (patch: Partial<ReadingAppearance>) => {
    if (lock.current) return;
    lock.current = true; pending.current = patch; setSaving(true); setError(undefined);
    try { await setAppearance(patch); }
    catch { setError('Не удалось сохранить оформление на телефоне. Повторите сохранение.'); }
    finally { lock.current = false; setSaving(false); }
  };
  return <Screen topInset={false} tabPadding={false}>
    <NavHeader title="Оформление Reading" onBack={() => navigation.goBack()} />
    {error ? <Wrapper padding={16}><InlineNotice message={error} onRetry={() => { void choose(pending.current); }} /></Wrapper> : null}
    <ReadingAppearanceGallery value={appearance} onChange={patch => { void choose(patch); }} saving={saving} />
  </Screen>;
}
