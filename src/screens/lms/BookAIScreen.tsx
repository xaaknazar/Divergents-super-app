import React, { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { BackNav } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { Chip, ty } from '../../components/ui';
import { MarkdownText } from '../../components/MarkdownText';
import { askAi, AiMessage } from '../../data/ai';
import { profileSummary } from '../../data/talentslab';
import { useTalentProfile } from '../../state/useTalentProfile';
import { LMSStackParams } from '../../navigation/types';

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
  const { T } = useTheme();
  const { getToken, isSignedIn } = useAuth();
  const { profile } = useTalentProfile();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q || busy) return;
    const userMsg: Msg = { id: uid(), role: 'user', text: q };
    setMsgs((p) => [...p, userMsg]);
    setText('');
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const token = isSignedIn ? await getToken() : null;
      const history: AiMessage[] = msgs.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const turns: AiMessage[] = [...history, { role: 'user', content: BOOK_FOCUS + q }];
      const { answer } = await askAi(turns, token, { profileContext: profileSummary(profile) });
      const full = (answer && answer.trim()) ? answer : 'Не удалось получить ответ. Попробуйте переформулировать.';
      setMsgs((p) => [...p, { id: uid(), role: 'bot', text: full }]);
    } catch {
      setMsgs((p) => [...p, { id: uid(), role: 'bot', text: '⚠️ Не удалось получить ответ. Проверьте подключение и попробуйте снова.' }]);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back="Книги" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={84}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {msgs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 28, paddingHorizontal: 12 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <SF name="sparkles" size={30} color="#fff" />
              </View>
              <Text style={[ty.title3, { color: T.label, textAlign: 'center' }]}>Книжный советник</Text>
              <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center', marginTop: 6 }]}>
                Знаю всю библиотеку Divergents и ваш профиль — подберу книги под ваши таланты, психотип и цели.
              </Text>
              {!isSignedIn ? (
                <Text style={[ty.footnote, { color: T.labelTertiary, textAlign: 'center', marginTop: 10 }]}>
                  Войдите, чтобы рекомендации учитывали ваш профиль.
                </Text>
              ) : null}
            </View>
          ) : null}

          {msgs.map((m) => (
            <View key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', marginBottom: 12 }}>
              <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: m.role === 'user' ? T.brand : T.cardBg }}>
                {m.role === 'user'
                  ? <Text style={[ty.body, { color: '#fff' }]}>{m.text}</Text>
                  : <MarkdownText text={m.text} color={T.label} />}
              </View>
            </View>
          ))}
          {busy ? (
            <View style={{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, backgroundColor: T.cardBg, marginBottom: 12 }}>
              <ActivityIndicator color={T.brand} size="small" />
            </View>
          ) : null}
        </ScrollView>

        {msgs.length === 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
            {SUGGEST.map((s) => <Chip key={s} label={s} onPress={() => send(s)} />)}
          </ScrollView>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 28, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          <View style={{ flex: 1, backgroundColor: T.fillTertiary, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 120 }}>
            <TextInput value={text} onChangeText={setText} multiline placeholder="Спросить про книги…" placeholderTextColor={T.labelTertiary} style={[ty.body, { color: T.label, paddingVertical: 0 }]} />
          </View>
          <Pressable onPress={() => send()} disabled={busy || !text.trim()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: text.trim() ? T.brand : T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="arrow.up" size={18} color={text.trim() ? '#fff' : T.labelTertiary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
