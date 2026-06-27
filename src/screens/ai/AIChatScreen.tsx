import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, LayoutAnimation, Keyboard } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { Capsule, Chip, ty } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { Logo } from '../../components/Logo';
import { MarkdownText } from '../../components/MarkdownText';
import * as Clipboard from 'expo-clipboard';
import { hSuccess } from '../../lib/haptics';
import { useMyCourses } from '../../state/useMyCourses';
import { askCourseAI } from '../../data/api';
import { askAi, AiMessage, AiUnavailableError } from '../../data/ai';
import { profileSummary } from '../../data/talentslab';
import { useTalentProfile } from '../../state/useTalentProfile';
import { loadJSON, saveJSON } from '../../state/persist';
import { AIStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<AIStackParams, 'AIChat'>;
type Msg = { id: string; role: 'user' | 'bot'; text: string };

const GENERAL = 'general';
const HISTORY_KEY = 'ai.history.v1';
const MAX_PERSIST = 24; // messages kept per conversation when persisting
const QUICK_GENERAL = ['Какой курс мне подойдёт?', 'Объясни мой психотип', 'С чего начать развитие?'];
const QUICK_COURSE = ['О чём этот курс?', 'Краткое содержание', 'Что в уроке 1?'];
let counter = 0;
const uid = () => `${Date.now()}_${counter++}`;

export function AIChatScreen({}: Props) {
  const { T } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { isSignedIn, getToken } = useAuth();
  const my = useMyCourses();
  const { profile } = useTalentProfile();
  const [mode, setMode] = useState<string>(GENERAL); // 'general' | courseId
  const [byMode, setByMode] = useState<Record<string, Msg[]>>({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [kbShown, setKbShown] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const loadedRef = useRef(false);
  const lastQueryRef = useRef('');
  // Active stream timer + mounted flag so the simulated typewriter stops (and
  // never calls setState) once the screen is unmounted.
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; if (streamTimerRef.current) clearTimeout(streamTimerRef.current); }, []);

  // Restore the persisted conversation history once, on mount.
  useEffect(() => {
    let alive = true;
    loadJSON<Record<string, Msg[]>>(HISTORY_KEY, {}).then((saved) => {
      if (alive && saved && typeof saved === 'object') {
        // Drop any half-streamed empty bot bubbles from a previous session.
        const clean: Record<string, Msg[]> = {};
        for (const k of Object.keys(saved)) {
          const arr = Array.isArray(saved[k]) ? saved[k].filter((m) => m && m.text) : [];
          if (arr.length) clean[k] = arr;
        }
        setByMode(clean);
      }
      loadedRef.current = true;
    });
    return () => { alive = false; };
  }, []);

  // Persist (debounced) whenever history changes, after the initial load.
  // Debouncing avoids hammering SecureStore during the simulated stream.
  useEffect(() => {
    if (!loadedRef.current) return;
    const id = setTimeout(() => {
      const trimmed: Record<string, Msg[]> = {};
      for (const k of Object.keys(byMode)) {
        const arr = byMode[k];
        if (Array.isArray(arr) && arr.length) trimmed[k] = arr.slice(-MAX_PERSIST).filter((m) => m.text);
      }
      saveJSON(HISTORY_KEY, trimmed);
    }, 700);
    return () => clearTimeout(id);
  }, [byMode]);

  // Track keyboard visibility so the input bar can sit right above the keyboard
  // (no tab-bar gap) while typing, and clear the tab bar when it's hidden.
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKbShown(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbShown(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // The send action is locked while we await a response (busy) AND while the
  // reply is still being streamed in (streaming) — sending mid-stream would
  // splice a new message into history before the previous one finished.
  const locked = busy || streaming;

  const activeCourse = my.courses.find((c) => c.id === mode);
  const isGeneral = mode === GENERAL;
  const messages = useMemo(() => byMode[mode] ?? [], [byMode, mode]);
  const quick = isGeneral ? QUICK_GENERAL : QUICK_COURSE;

  const streamInto = (m: string, id: string, full: string) => {
    let i = 0;
    setStreaming(true);
    const tick = () => {
      if (!mountedRef.current) return;
      i = Math.min(full.length, i + 4);
      setByMode((p) => ({ ...p, [m]: (p[m] ?? []).map((msg) => (msg.id === id ? { ...msg, text: full.slice(0, i) } : msg)) }));
      if (i % 80 === 0) scrollRef.current?.scrollToEnd({ animated: true });
      if (i < full.length) streamTimerRef.current = setTimeout(tick, 16);
      else { setStreaming(false); scrollRef.current?.scrollToEnd({ animated: true }); }
    };
    tick();
  };

  const send = async (body: string) => {
    const q = body.trim();
    if (!q || locked) return;
    setUnavailable(false);
    const userMsg: Msg = { id: uid(), role: 'user', text: q };
    setByMode((p) => ({ ...p, [mode]: [...(p[mode] ?? []), userMsg] }));
    setText('');
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const token = isSignedIn ? await getToken() : null;
      const history: AiMessage[] = (byMode[mode] ?? []).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const turns: AiMessage[] = [...history, { role: 'user', content: q }];
      const answer = isGeneral
        ? (await askAi(turns, token, { profileContext: profileSummary(profile) })).answer
        : (await askCourseAI(mode, q, turns, token ?? '')).answer;
      const full = (answer && answer.trim()) ? answer : tr('Не удалось получить ответ. Попробуйте переформулировать вопрос.');
      const botId = uid();
      setByMode((p) => ({ ...p, [mode]: [...(p[mode] ?? []), { id: botId, role: 'bot', text: '' }] }));
      streamInto(mode, botId, full);
    } catch (e: unknown) {
      if (e instanceof AiUnavailableError) {
        // Roll back the optimistic user message and show the graceful
        // "coming soon" state; stash the query so Retry can resend it.
        lastQueryRef.current = q;
        setByMode((p) => ({ ...p, [mode]: (p[mode] ?? []).filter((m) => m.id !== userMsg.id) }));
        setUnavailable(true);
        return;
      }
      // Surface server-sent Russian messages (e.g. «Нет доступа к этому курсу»);
      // otherwise fall back to a Russian generic instead of a raw English
      // network error like "Network request failed" / "Aborted".
      const raw = e instanceof Error && typeof e.message === 'string' ? e.message : '';
      const msg = /[а-яА-ЯёЁ]/.test(raw) ? raw : tr('Не удалось получить ответ. Проверьте подключение и попробуйте снова.');
      const botMsg: Msg = { id: uid(), role: 'bot', text: `⚠️ ${msg}` };
      setByMode((p) => ({ ...p, [mode]: [...(p[mode] ?? []), botMsg] }));
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    }
  };

  const retryUnavailable = () => {
    setUnavailable(false);
    const q = lastQueryRef.current;
    if (q) setTimeout(() => send(q), 0);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Logo size={22} />
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>Divergents AI</Text>
            <Text style={[ty.caption1, { color: T.green }]} numberOfLines={1}>
              {isGeneral
                ? (isSignedIn ? tr('Ассистент · знает ваш профиль') : tr('Персональный ассистент'))
                : `${tr('Знает материалы курса')} «${activeCourse?.title ?? ''}»`}
            </Text>
          </View>
        </View>
        {/* Mode selector: general + owned courses */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
          <Chip label={tr('Общий')} icon="sparkles" active={isGeneral} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setUnavailable(false); setMode(GENERAL); }} />
          {my.courses.map((c) => (
            <Chip key={c.id} label={c.title.length > 20 ? c.title.slice(0, 19) + '…' : c.title}
              active={c.id === mode} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setUnavailable(false); setMode(c.id); }} />
          ))}
        </ScrollView>
      </View>

      {unavailable ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="sparkles"
            title={tr('AI скоро будет доступен')}
            subtitle={tr('Ассистент Divergents появится в ближайшем обновлении. Загляните позже.')}
            actionLabel={tr('Повторить')}
            onAction={retryUnavailable}
          />
        </View>
      ) : (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 8}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 8 }} keyboardDismissMode="interactive">
          {messages.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 28 }}>
              <Capsule bg={T.brandTinted} color={T.brand}><SF name="sparkles" size={11} color={T.brand} />{isGeneral ? tr('Спросите что угодно') : tr('Спросите о курсе')}</Capsule>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 14, textAlign: 'center', paddingHorizontal: 20 }]}>
                {isGeneral
                  ? tr('Ассистент Divergents поможет с курсами, психотипами, талантами, карьерой и развитием.')
                  : `${tr('Вопросы по материалам курса')} «${activeCourse?.title ?? ''}» — ${tr('отвечаю по урокам с таймкодами.')}`}
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
                {m.role === 'user'
                  ? <Text style={[ty.body, { color: '#fff' }]}>{m.text}</Text>
                  : <MarkdownText text={m.text} color={T.label} />}
              </View>
              {m.role === 'bot' && m.text.length > 0 ? (
                <Pressable onPress={() => { Clipboard.setStringAsync(m.text).then(hSuccess).catch(() => {}); }} hitSlop={6} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, paddingHorizontal: 6, opacity: pressed ? 0.5 : 1 })}>
                  <SF name="doc.text" size={12} color={T.labelTertiary} />
                  <Text style={[ty.caption2, { color: T.labelTertiary }]} numberOfLines={1}>{tr('Копировать')}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}

          {busy ? (
            <View style={{ backgroundColor: T.fillTertiary, alignSelf: 'flex-start', borderRadius: 18, borderBottomLeftRadius: 4, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <ActivityIndicator color={T.labelSecondary} />
              <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{isGeneral ? tr('Думаю…') : tr('Ищу в материалах курса…')}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ borderTopWidth: 0.5, borderTopColor: T.separator, backgroundColor: T.cardBg, paddingTop: 8, paddingBottom: kbShown ? 10 : insets.bottom + 70 }}>
          {messages.length === 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
              {quick.map((q) => (
                <Pressable key={q} onPress={() => send(q)} disabled={locked} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.separator, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 14, opacity: locked ? 0.5 : pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                  <SF name="sparkles" size={11} color={T.brand} />
                  <Text style={[ty.subhead, { color: T.label }]} numberOfLines={1}>{tr(q)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, alignItems: 'center' }}>
            <TextInput
              value={text} onChangeText={setText}
              placeholder={isGeneral ? tr('Спросите ассистента…') : tr('Спросите о курсе…')} placeholderTextColor={T.labelTertiary}
              style={[ty.body, { flex: 1, backgroundColor: T.cardBg, borderRadius: 18, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 0.5, borderColor: T.separator, color: T.label }]}
              onSubmitEditing={() => send(text)} returnKeyType="send" editable={!locked}
            />
            <Pressable onPress={() => send(text)} hitSlop={6} disabled={locked || !text.trim()}>
              <SF name="arrow.up.circle.fill" size={32} color={text.trim() && !locked ? T.brand : T.labelTertiary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      )}
    </View>
  );
}
