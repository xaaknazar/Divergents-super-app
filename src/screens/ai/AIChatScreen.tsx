import { useAuth } from '@clerk/clerk-expo';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import React,{ useEffect,useMemo,useRef,useState } from 'react';
import { ActivityIndicator,Alert,Keyboard,KeyboardAvoidingView,Platform,ScrollView,Text,View,useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatComposer } from '../../components/ChatComposer';
import { ChatIntroduction } from '../../components/ChatIntroduction';
import { ChatMessage } from '../../components/ChatMessage';
import { ChatSuggestions } from '../../components/ChatSuggestions';
import { HeaderIcon } from '../../components/HeaderIcon';
import { NavBarLarge } from '../../components/NavBarLarge';
import { ProfileAvatarButton } from '../../components/ProfileAvatarButton';
import { useProfileButton } from '../../state/useProfileButton';
import { PageIntro } from '../../components/PageIntro';
import { Screen } from '../../components/Screen';
import { ScreenDescription } from '../../components/ScreenDescription';
import { EmptyState } from '../../components/StateViews';
import { } from '../../components/ui';
import { Wrapper } from '../../components/Wrapper';
import { AiMessage,AiUnavailableError,askAi } from '../../data/ai';
import { askCourseAI } from '../../data/api';
import * as pl from '../../data/plural';
import { profileSummary } from '../../data/talentslab';
import { hSuccess } from '../../lib/haptics';
import { tabDockContentInset, tabDockMiniPlayerHeight } from '../../lib/tabDockLayout';
import { AIStackParams } from '../../navigation/types';
import { AiChatMsg,getAiThread,setAiThread,useAiThread } from '../../state/aiChat';
import { useOptionalAudioTrack } from '../../state/audioPlayerValue';
import { useCourses } from '../../state/CourseContext';
import { tr,useLang } from '../../state/LanguageContext';
import { useMyCourses } from '../../state/useMyCourses';
import { useTalentProfile } from '../../state/useTalentProfile';
import { useTheme } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<AIStackParams, 'AIChat'>;
// `err` marks a bubble the APP produced locally (network/server failure), not
// something the assistant said. Those must never be replayed as assistant turns.
type Msg = AiChatMsg;

const GENERAL = 'general';
const QUICK_GENERAL = ['Какой курс мне подойдёт?', 'Объясни мой психотип', 'С чего начать развитие?'];
const QUICK_COURSE = ['О чём этот курс?', 'Краткое содержание', 'Что в уроке 1?'];
let counter = 0;
const uid = () => `${Date.now()}_${counter++}`;

export function AIChatScreen({ navigation }: Props) {
  const profileButton = useProfileButton();
  const { T, ty } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const audioTrack = useOptionalAudioTrack();
  const dockInset = tabDockContentInset(insets.bottom, audioTrack
    ? tabDockMiniPlayerHeight(ty.footnoteEm.lineHeight ?? 18, ty.caption2.lineHeight ?? 14, fontScale) : 0);
  const { isSignedIn, getToken } = useAuth();
  const my = useMyCourses();
  const { courses } = useCourses();
  const { profile } = useTalentProfile();
  const [mode] = useState<string>(GENERAL); // always general — one assistant that knows everything
  // История живёт вне экрана: вкладки отсоединяются, и состояние экрана вместе
  // с несохранёнными сообщениями пропадало.
  const { messages, setMessages, clear: clearThread } = useAiThread(mode);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [kbShown, setKbShown] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const lastQueryRef = useRef('');
  // Active stream timer + mounted flag so the simulated typewriter stops (and
  // never calls setState) once the screen is unmounted.
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; if (streamTimerRef.current) clearTimeout(streamTimerRef.current); }, []);

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
  const quick = isGeneral ? QUICK_GENERAL : QUICK_COURSE;
  // Full course catalog (titles + categories + short descriptions) so the
  // general assistant knows every Divergents course by default.
  const coursesContext = useMemo(() => {
    if (!courses.length) return '';
    const lines = courses.slice(0, 120).map((c) => {
      const desc = (c.description || '').replace(/\s+/g, ' ').trim().slice(0, 220);
      return `- "${c.title}"${c.category ? ` [${c.category}]` : ''}${c.chaptersCount ? ` · ${pl.lessons(c.chaptersCount)}` : ''}${desc ? `: ${desc}` : ''}`;
    });
    return 'Каталог курсов Divergents (полный, с кратким описанием — отвечай о любом из них):\n' + lines.join('\n');
  }, [courses]);

  const streamInto = (m: string, id: string, full: string) => {
    let i = 0;
    setStreaming(true);
    const tick = () => {
      if (!mountedRef.current) return;
      i = Math.min(full.length, i + 4);
      setAiThread(m, (prev) => prev.map((msg) => (msg.id === id ? { ...msg, text: full.slice(0, i) } : msg)));
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
    setMessages((prev) => [...prev, userMsg]);
    setText('');
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const token = isSignedIn ? await getToken() : null;
      // Skip our own error bubbles: resending «⚠️ Не удалось получить ответ…»
      // as an assistant turn taught the model it had said that, and skewed the
      // next reply.
      const history: AiMessage[] = getAiThread(mode)
        .filter((m) => !m.err && m.text.trim())
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const turns: AiMessage[] = [...history, { role: 'user', content: q }];
      const answer = isGeneral
        // Профиль и каталог — РАЗНЫЕ поля: у сервера на них разные бюджеты, а
        // склеенные в одну строку они резались так, что каталог пропадал.
        ? (await askAi(turns, token, { profileContext: profileSummary(profile), coursesContext })).answer
        : (await askCourseAI(mode, q, turns, token ?? '')).answer;
      // An empty answer is our fallback copy, not the assistant's — flag it so
      // it stays out of the next request's history too.
      const failed = !(answer && answer.trim());
      const full = failed ? tr('Не удалось получить ответ. Попробуйте переформулировать вопрос.') : answer;
      const botId = uid();
      setMessages((prev) => [...prev, { id: botId, role: 'bot', text: '', err: failed }]);
      streamInto(mode, botId, full);
    } catch (e: unknown) {
      if (e instanceof AiUnavailableError) {
        // Roll back the optimistic user message and show the graceful
        // "coming soon" state; stash the query so Retry can resend it.
        lastQueryRef.current = q;
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setUnavailable(true);
        return;
      }
      // Surface server-sent Russian messages (e.g. «Нет доступа к этому курсу»);
      // otherwise fall back to a Russian generic instead of a raw English
      // network error like "Network request failed" / "Aborted".
      const raw = e instanceof Error && typeof e.message === 'string' ? e.message : '';
      const msg = /[а-яА-ЯёЁ]/.test(raw) ? raw : tr('Не удалось получить ответ. Проверьте подключение и попробуйте снова.');
      const botMsg: Msg = { id: uid(), role: 'bot', text: `⚠️ ${msg}`, err: true };
      setMessages((prev) => [...prev, botMsg]);
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
    <Screen scroll={false} tabPadding={false} aurora={false} backdrop="ai">
      <PageIntro page="ai" />
      <NavBarLarge title="Divergents AI" trailing={<>
        {messages.length > 0 ? <HeaderIcon name="square.and.pencil" label={tr('Новый чат')}
          onPress={() => Alert.alert(tr('Начать новый чат?'), tr('Переписка будет удалена с этого устройства.'), [
            { text: tr('Отмена'), style: 'cancel' },
            { text: tr('Начать заново'), style: 'destructive', onPress: () => { clearThread(); setUnavailable(false); } },
          ])} /> : null}
        <ProfileAvatarButton {...profileButton} onPress={() => navigation.getParent()?.navigate('ProfileTab' as never)} />
      </>} />
      <Wrapper paddingHorizontal={20} paddingBottom={16}>
        <ScreenDescription text={isGeneral
          ? (isSignedIn && profile?.found ? tr('Знает каталог курсов и ваш профиль') : tr('Знает каталог курсов Divergents'))
          : `${tr('Знает материалы курса')} «${activeCourse?.title ?? ''}»`} />
      </Wrapper>

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 8 }} keyboardDismissMode="interactive">
          {messages.length === 0 ? <ChatIntroduction title={isGeneral ? tr('Спросите что угодно') : tr('Спросите о курсе')}
            description={isGeneral ? tr('Ассистент Divergents поможет с курсами, психотипами, талантами, карьерой и развитием.')
              : `${tr('Вопросы по материалам курса')} «${activeCourse?.title ?? ''}» — ${tr('отвечаю по урокам с таймкодами.')}`} /> : null}
          {messages.map(m => <ChatMessage key={m.id} role={m.role} text={m.text}
            onCopy={() => { Clipboard.setStringAsync(m.text).then(hSuccess).catch(() => {}); }} />)}

          {busy ? (
            <View accessible accessibilityLabel={isGeneral ? 'Ассистент готовит ответ' : 'Ищу в материалах курса'} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" style={{ backgroundColor: T.fillTertiary, alignSelf: 'flex-start', borderRadius: 18, borderCurve: 'continuous', borderBottomLeftRadius: 4, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <ActivityIndicator color={T.labelSecondary} />
              <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{isGeneral ? tr('Думаю…') : tr('Ищу в материалах курса…')}</Text>
            </View>
          ) : null}
        </ScrollView>

        <Wrapper paddingHorizontal={16} paddingTop={8} paddingBottom={kbShown ? 10 : dockInset}>
          {messages.length === 0 ? <ChatSuggestions suggestions={quick.map(q => tr(q))} onSelect={send} disabled={locked} /> : null}
          <ChatComposer value={text} onChangeText={setText} onSend={() => send(text)} disabled={locked} busy={busy}
            placeholder={isGeneral ? tr('Спросите ассистента…') : tr('Спросите о курсе…')} />
        </Wrapper>
      </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
