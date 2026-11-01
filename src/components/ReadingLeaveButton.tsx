import React from 'react';
import { Alert } from 'react-native';
import { Button } from './Button';

/** Destructive reset stays separate from the timer and requires explicit confirmation. */
export function ReadingLeaveButton({ busy, onLeave }: { busy: boolean; onLeave: () => void }) {
  return <Button label="Покинуть челлендж" variant="plain" tone="danger" loading={busy}
    onPress={() => Alert.alert('Покинуть челлендж?',
      'Ваши страницы, время, красные флаги, место в рейтинге и история этого челленджа будут сброшены. Текущий подход тоже не сохранится. При возвращении начнётся новый день 1. Это действие нельзя отменить.',
      [{ text: 'Остаться', style: 'cancel' }, { text: 'Выйти и сбросить данные', style: 'destructive', onPress: onLeave }])} />;
}
