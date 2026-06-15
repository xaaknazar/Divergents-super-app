import React, { useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { Capsule, Chip, PrimaryButton, T, ty } from '../../components/ui';
import { Logo } from '../../components/Logo';
import { useMyCourses } from '../../state/useMyCourses';
import { askCourseAI, mdToText, AiTurn } from '../../data/api';
import { AIStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<AIStackParams, 'AIChat'>;
type Msg = { id: string; role: 'user' | 'bot'; text: string };

const QUICK = ['О чём этот курс?', 'Краткое содержание', 'Главные идеи'];
let counter = 0;
const now = () => `${Date.now()}_${counter++}`;

export function AIChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn, getToken } = useAuth();
  const my = useMyCourses();
  const [courseId, setCourseId] = useState<string | null>(null);
  const [byCourse, setByCourse] = useState<Record<string, Msg[]>>({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const activeId = courseId ?? my.courses[0]?.id ?? null;
  const activeCourse = my.courses.find((c) => c.id === activeId);
  const messages = useMemo(() => (activeId ? byCourse[activeId] ?? [] : []), [byCourse, activeId]);

  const send = async (body: string) => {
    const q = body.trim();
    if (!q || !activeId || busy) return;
    if (!isSignedIn) return;
    const userMsg: Msg = { id: now(), role: 'user', text: q };
    setByCourse((p) => ({ ...p, [activeId]: [...(p[activeId] ?? []), userMsg] }));
    setText('');
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const token = await getToken();
      const history: AiTurn[] = (byCourse[activeId] ?? []).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const { answer } = await askCourseAI(activeId, q, [...history, { role: 'user', content: q }], token ?? '');
      const botMsg: Msg = { id: now(), role: 'bot', text: mdToText(answer) || 'Не удалось получить ответ.' };
      setByCourse((p) => ({ ...p, [activeId]: [...(p[activeId] ?? []), botMsg] }));
    } catch (e: any) {
      const botMsg: Msg = { id: now(), role: 'bot', text: e?.message ? `⚠️ ${e.message}` : '⚠️ Ошибка соединения.' };
      setByCourse((p) => ({ ...p, [activeId]: [...(p[activeId] ?? []), botMsg] }));
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    }
  };

  // ── Gate: not signed in ──
  if (!isSignedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Logo size={56} />
        <Text style={[ty.title2, { color: T.label, marginTop: 16, textAlign: 'center' }]}>Divergents AI</Text>
        <Text style={[ty.body, { color: T.labelSecondary, marginTop: 8, textAlign: 'center' }]}>
          Ассистент отвечает по материалам ваших курсов. Войдите, чтобы начать.
        </Text>
        <PrimaryButton label="Войти по почте" style={{ marginTop: 22, alignSelf: 'stretch' }}
          onPress={() => navigation.getParent()?.getParent()?.navigate('Auth' as never)} />
      </View>
    );
  }

  // ── Gate: no owned courses ──
  if (!my.loading && my.courses.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <SF name="sparkles" size={48} color={T.brand} />
        <Text style={[ty.title3, { color: T.label, marginTop: 14, textAlign: 'center' }]}>Нет доступных курсов</Text>
        <Text style={[ty.body, { color: T.labelSecondary, marginTop: 8, textAlign: 'center' }]}>
          Ассистент знает материалы курсов, которые у вас есть. Откройте курс на вкладке «Обучение».
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Logo size={22} />
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]}>Divergents AI</Text>
            <Text style={[ty.caption1, { color: T.green }]} numberOfLines={1}>
              {activeCourse ? `Знает материалы курса «${activeCourse.title}»` : 'Выберите курс'}
            </Text>
          </View>
        </View>
        {/* Course selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
          {my.courses.map((c) => (
            <Chip key={c.id} label={c.title.length > 22 ? c.title.slice(0, 21) + '…' : c.title}
              active={c.id === activeId} onPress={() => setCourseId(c.id)} />
          ))}
        </ScrollView>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 8}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
          {messages.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 30 }}>
              <Capsule bg={T.brandTinted} color={T.brand}><SF name="sparkles" size={11} color={T.brand} />Спросите о курсе</Capsule>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 14, textAlign: 'center', paddingHorizontal: 20 }]}>
                Задайте вопрос по материалам курса «{activeCourse?.title}» — я отвечу по урокам с таймкодами.
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
              <Text style={[ty.caption1, { color: T.labelSecondary }]}>Ищу в материалах курса…</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Quick replies + input */}
        <View style={{ borderTopWidth: 0.5, borderTopColor: T.separator, backgroundColor: 'rgba(249,249,249,0.98)', paddingTop: 8, paddingBottom: insets.bottom + 70 }}>
          {messages.length === 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
              {QUICK.map((q) => (
                <Pressable key={q} onPress={() => send(q)} style={{ backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.separator, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 14 }}>
                  <Text style={[ty.subhead, { color: T.label }]}>{q}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, alignItems: 'center' }}>
            <TextInput
              value={text} onChangeText={setText}
              placeholder="Спросите о курсе…" placeholderTextColor={T.labelTertiary}
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
