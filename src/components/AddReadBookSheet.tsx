import React, { useRef, useState } from 'react';
import { HalfSheet } from './HalfSheet';
import { Button } from './Button';
import { AddReadBookForm } from './AddReadBookForm';

export function AddReadBookSheet({ onClose, onSave }: {
  onClose: () => void; onSave: (title: string, author: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const saving = useRef(false);
  const save = async () => {
    if (saving.current || !title.trim() || !author.trim()) return;
    saving.current = true; setBusy(true); setError(undefined);
    try { await onSave(title.trim(), author.trim()); onClose(); }
    catch (e) { setError(e instanceof Error && /[А-Яа-яЁё]/.test(e.message) ? e.message : 'Не удалось сохранить книгу. Попробуйте ещё раз.'); }
    finally { saving.current = false; setBusy(false); }
  };
  return <HalfSheet visible title="Прочитанная книга" onClose={() => { if (!saving.current) onClose(); }}
    footer={<Button label="Добавить в библиотеку" icon="plus" loading={busy} disabled={!title.trim() || !author.trim() || busy} onPress={() => void save()} />}>
    <AddReadBookForm title={title} author={author} onTitleChange={setTitle} onAuthorChange={setAuthor} busy={busy} error={error} />
  </HalfSheet>;
}
