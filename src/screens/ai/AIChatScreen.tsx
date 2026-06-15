import React, { useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { Capsule, Chip, T, ty } from '../../components/ui';
import { Logo } from '../../components/Logo';
import { useMyCourses } from '../../state/useMyCourses';
import { askAssistant, askCourseAI, mdToText, AiTurn } from '../../data/api';
import { AIStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<AIStackParams, 'AIChat'>;
type Msg = { id: string; role: 'user' | 'bot'; text: string };

const GENERAL = 'general';
const QUICK_GENERAL = ['Какой курс мне подойдёт?', 'Объясни мой психотип', 'С чего начать развитие?'];
const QUICK_COURSE = ['О чём этот курс?', 'Краткое содержание', 'Что в уроке 1?'];
let counter = 0;
const uid = () => `${Date.now()}_${counter++}`;

export function AIChatScreen({}: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn, getToken } = useAuth();
  const my = useMyCourses();
  const [mode, setMode] = useState<string>(GENERAL); // 'general' | courseId
  const [byMode, setByMode] = useState<Record<string, Msg[]>>({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const activeCourse = my.courses.find((c) => c.id === mode);
  const isGeneral = mode === GENERAL;
  const messages = useMemo(() => byMode[mode] ?? [], [byMode, mode]);
  const quick = isGeneral ? QUICK_GENERAL : QUICK_COURSE;

  const send = async (body: string) => {
    const q = body.trim();
    if (!q || busy) return;
    const userMsg: Msg = { id: uid(), role: 'user', text: q };
    setByMode((p) => ({ ...p, [mode]: [...(p[mode] ?? []), userMsg] }));
    setText('');
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const token = isSignedIn ? await getToken() : null;
      const history: AiTurn[] = (byMode[mode] ?? []).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const turns: AiTurn[] = [...history, { role: 'user', content: q }];
      const answer = isGeneral
        ? (await askAssistant(q, turns, token)).answer
        : (await askCourseAI(mode, q, turns, token ?? '')).answer;
      const botMsg: Msg = { id: uid(), role: 'bot', text: mdToText(answer) || 'Не удалось получить ответ.' };
      setByMode((p) => ({ ...p, [mode]: [...(p[mode] ?? []), botMsg] }));
    } catch (e: any) {
      const botMsg: Msg = { id: uid(), role: 'bot', text: e?.message ? `⚠️ ${e.message}` : '⚠️ Ошибка соединения.' };
      setByMode((p) => ({ ...p, [mode]: [...(p[mode] ?? []), botMsg] }));
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Logo size={22} />
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]}>Divergents AI</Text>
            <Text style={[ty.caption1, { color: T.green }]} numberOfLines={1}>
              {isGeneral
                ? (isSignedIn ? 'Наставник · знает ваш профиль' : 'Персональный наставник')
                : `Знает материалы курса «${activeCourse?.title}»`}
            </Text>
          </View>
        </View>
        {/* Mode selector: general + owned courses */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
          <Chip label="Общий" icon="sparkles" active={isGeneral} onPress={() => setMode(GENERAL)} />
          {my.courses.map((c) => (
            <Chip key={c.id} label={c.title.length > 20 ? c.title.slice(0, 19) + '…' : c.title}
              active={c.id === mode} onPress={() => setMode(c.id)} />
          ))}
        </ScrollView>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 8}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
          {messages.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 28 }}>
              <Capsule bg={T.brandTinted} color={T.brand}><SF name="sparkles" size={11} color={T.brand} />{isGeneral ? 'Спросите что угодно' : 'Спросите о курсе'}</Capsule>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 14, textAlign: 'center', paddingHorizontal: 20 }]}>
                {isGeneral
                  ? 'Наставник Divergents поможет с курсами, психотипами, талантами, карьерой и развитием.'
                  : `Вопросы по материалам курса «${activeCourse?.title}» — отвечаю по урокам с таймкодами.`}
              </Text>
            </View>
          ) : null}

          {messages.map((m) => (
            <View key={m.id} style={{ marginBottom: 12, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <View style={{
                maxWidth: '90%',
                backgroundColor: m.role === 'user' ? T.brand : T.fillTertiary,
                borderRadius: 18,
                borderBottomRightRadius: m.role === 'user' ? 4 : 18,
                borderBottomLeftRadius: m.role === 'user' ? 18 : 4,
                paddingVertical: 12, paddingHorizontal: 14,
              }}>
                <Text style={[ty.body, { color: m.role === 'user' ? '#fff' : T.label }]}>{m.text}</Text>
              </View>
            </View>
          ))}

          {busy ? (
            <View style={{ backgroundColor: T.fillTertiary, alignSelf: 'flex-start', borderRadius: 18, borderBottomLeftRadius: 4, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <ActivityIndicator color={T.labelSecondary} />
              <Text style={[ty.caption1, { color: T.labelSecondary }]}>{isGeneral ? 'Думаю…' : 'Ищу в материалах курса…'}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ borderTopWidth: 0.5, borderTopColor: T.separator, backgroundColor: 'rgba(249,249,249,0.98)', paddingTop: 8, paddingBottom: insets.bottom + 70 }}>
          {messages.length === 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
              {quick.map((q) => (
                <Pressable key={q} onPress={() => send(q)} style={{ backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.separator, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 14 }}>
                  <Text style={[ty.subhead, { color: T.label }]}>{q}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, alignItems: 'center' }}>
            <TextInput
              value={text} onChangeText={setText}
              placeholder={isGeneral ? 'Спросите наставника…' : 'Спросите о курсе…'} placeholderTextColor={T.labelTertiary}
              style={[ty.body, { flex: 1, backgroundColor: T.cardBg, borderRadius: 18, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 0.5, borderColor: T.separator, color: T.label }]}
              onSubmitEditing={() => send(text)} returnKeyType="send" editable={!busy}
            />
            <Pressable onPress={() => send(text)} hitSlop={6} disabled={busy || !text.trim()}>
              <SF name="arrow.up.circle.fill" size={32} color={text.trim() && !busy ? T.brand : T.labelTertiary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
