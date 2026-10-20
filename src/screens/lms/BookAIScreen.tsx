import React, { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { DetailScreen } from '../../components/DetailScreen';
import { BottomBar } from '../../components/BottomBar';
import { ChatThread } from '../../components/ChatThread';
import { ChatComposer } from '../../components/ChatComposer';
import { ChatSuggestions } from '../../components/ChatSuggestions';
import { askAi, AiMessage, AiUnavailableError } from '../../data/ai';
import { profileSummary } from '../../data/talentslab';
import { useTalentProfile } from '../../state/useTalentProfile';
import { LMSStackParams } from '../../navigation/types';
import { useAiThread, getAiThread } from '../../state/aiChat';

type Props = NativeStackScreenProps<LMSStackParams, 'BookAI'>;
type Msg = { id: string; role: 'user' | 'bot'; text: string };
const uid = () => Math.random().toString(36).slice(2);

const SUGGEST = [
  'Что почитать под мои таланты?',
  'Книги по лидерству для меня',
  'Посоветуй книгу под мой психотип',
  'С чего начать развитие?',
];

// Steer the assistant toward the Divergents library and personalisation.
const BOOK_FOCUS =
  'Контекст: пользователь в разделе «Книги». Рекомендуй книги ТОЛЬКО из библиотеки Divergents, ' +
  'учитывая его таланты (Gallup), психотип, MBTI и Гарднера. Для каждой книги дай 1 строку — почему именно она подходит. ' +
  'Вопрос пользователя: ';

export function BookAIScreen({ navigation }: Props) {
  const { getToken, isSignedIn } = useAuth();
  const { profile } = useTalentProfile();
  // Та же история, что у общего ассистента, но своей веткой: советник по книгам
  // — отдельный разговор, и терять его при выходе с экрана незачем.
  const { messages: msgs, setMessages: setMsgs } = useAiThread('books');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q || busy) return;
    const userMsg: Msg = { id: uid(), role: 'user', text: q };
    setMsgs((p) => [...p, userMsg]);
    setText('');
    setBusy(true);
    try {
      const token = isSignedIn ? await getToken() : null;
      const history: AiMessage[] = getAiThread('books').map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const turns: AiMessage[] = [...history, { role: 'user', content: BOOK_FOCUS + q }];
      const { answer } = await askAi(turns, token, { profileContext: profileSummary(profile) });
      const full = (answer && answer.trim()) ? answer : 'Не удалось получить ответ. Попробуйте переформулировать.';
      setMsgs((p) => [...p, { id: uid(), role: 'bot', text: full }]);
    } catch (e: unknown) {
      // Distinguish "AI not deployed yet" and server-sent Russian errors (auth/
      // rate-limit) from a generic network failure.
      const msg = e instanceof AiUnavailableError
        ? 'AI скоро будет доступен. Загляните позже.'
        : (e instanceof Error && /[а-яА-ЯёЁ]/.test(e.message) ? e.message : 'Не удалось получить ответ. Проверьте подключение и попробуйте снова.');
      setMsgs((p) => [...p, { id: uid(), role: 'bot', text: `⚠️ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  return <DetailScreen title="Книжный советник" backLabel="Книги" onBack={() => navigation.goBack()} scroll={false} keyboard
    footer={<BottomBar>
      {!msgs.length ? <ChatSuggestions suggestions={SUGGEST} onSelect={send} disabled={busy} /> : null}
      <ChatComposer value={text} onChangeText={setText} onSend={() => send()} busy={busy} disabled={false} multiline
        inputLabel="Спросить про книги" placeholder="Спросить про книги…" />
    </BottomBar>}>
    <ChatThread messages={msgs} busy={busy} title="Книжный советник"
      description="Знаю всю библиотеку Divergents и ваш профиль — подберу книги под ваши таланты, психотип и цели."
      note={!isSignedIn ? 'Войдите, чтобы рекомендации учитывали ваш профиль.' : undefined} />
  </DetailScreen>;
}
