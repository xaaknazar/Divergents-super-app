// First-visit page intro. Drop <PageIntro page="..." /> into a tab's root screen:
// the first time that tab is focused, a designed explainer modal appears (icon,
// what the page is for, key features) and is remembered so it shows only once.
import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { ty } from '../theme/tokens';
import { SF, SFName } from './SFIcon';
import { PrimaryButton } from './ui';
import { usePageIntroState } from '../state/PageIntroContext';

export type PageKey = 'lms' | 'ai' | 'community' | 'map' | 'profile';

interface IntroPoint { icon: SFName; text: string }
interface IntroInfo { icon: SFName; title: string; tagline: string; points: IntroPoint[]; cta: string }

// Per-page copy (Russian, per app convention). Career is intentionally absent —
// that tab is a "в разработке" placeholder that already explains itself.
const PAGE_INTROS: Record<PageKey, IntroInfo> = {
  lms: {
    icon: 'graduationcap.fill',
    title: 'Обучение',
    tagline: 'Курсы, книги и видео-уроки Divergents — всё для роста в одном месте.',
    points: [
      { icon: 'play.circle.fill', text: 'Живые курсы с видео, конспектами и материалами' },
      { icon: 'checkmark.seal.fill', text: '«Мои курсы» — ваш прогресс сохраняется' },
      { icon: 'book.fill', text: 'Книги и аудио — читайте и слушайте' },
      { icon: 'bubble.left.fill', text: 'Обсуждение уроков с сообществом' },
    ],
    cta: 'Начать обучение',
  },
  ai: {
    icon: 'sparkles',
    title: 'AI-ассистент',
    tagline: 'Персональный помощник, который знает ваш психотип и сильные стороны.',
    points: [
      { icon: 'sparkles', text: 'Советы по курсам, книгам и карьере под вас' },
      { icon: 'bubble.left.fill', text: 'Задайте любой вопрос в чате' },
      { icon: 'brain.head.profile', text: 'Ответы с учётом ваших талантов' },
    ],
    cta: 'Понятно',
  },
  community: {
    icon: 'person.3.fill',
    title: 'Сообщество',
    tagline: 'Челленджи, поездки, спорт и каналы — живите ценностями вместе.',
    points: [
      { icon: 'flame.fill', text: 'Командные челленджи с баллами и лидербордом' },
      { icon: 'map.fill', text: 'Поездки и походы с единомышленниками' },
      { icon: 'figure.run', text: 'Спортивные активности и встречи' },
      { icon: 'person.3.fill', text: 'Каналы сообщества с новостями' },
    ],
    cta: 'В сообщество',
  },
  map: {
    icon: 'map.fill',
    title: 'Карта',
    tagline: 'Места сообщества и точки встреч рядом с вами — даже офлайн.',
    points: [
      { icon: 'mappin.and.ellipse', text: 'Полезные места сообщества на карте' },
      { icon: 'location.fill', text: 'Точки встреч поездок и активностей' },
      { icon: 'plus.circle.fill', text: 'Добавляйте свои места' },
      { icon: 'arrow.down.circle', text: 'Офлайн-карта — работает без интернета' },
    ],
    cta: 'Открыть карту',
  },
  profile: {
    icon: 'person.crop.circle.fill',
    title: 'Профиль',
    tagline: 'Ваши достижения, таланты и настройки — в одном месте.',
    points: [
      { icon: 'rosette', text: 'Достижения и награды за активность' },
      { icon: 'brain.head.profile', text: 'Анкета талантов и психотип' },
      { icon: 'paintpalette.fill', text: 'Персонализация приложения' },
      { icon: 'square.and.arrow.down', text: 'Загрузки для офлайна' },
    ],
    cta: 'Понятно',
  },
};

function IntroModal({ info, visible, onClose }: { info: IntroInfo; visible: boolean; onClose: () => void }) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) { a.setValue(0); Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 6 }).start(); }
  }, [visible, a]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Animated.View style={{
          width: '100%', maxWidth: 380, backgroundColor: T.cardBg, borderRadius: 26, overflow: 'hidden',
          opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
          shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 10,
        }}>
          {/* Gradient header with a big soft glyph */}
          <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: 28, paddingBottom: 22, paddingHorizontal: 20, alignItems: 'center' }}>
            <View pointerEvents="none" style={{ position: 'absolute', right: -12, top: -20, opacity: 0.16 }}>
              <SF name={info.icon} size={132} color="#fff" />
            </View>
            <View style={{ width: 74, height: 74, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
              <SF name={info.icon} size={38} color="#fff" />
            </View>
            <Text style={[ty.title2, { color: '#fff', marginTop: 14, textAlign: 'center' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{info.title}</Text>
          </LinearGradient>

          {/* Body: tagline + feature rows + CTA */}
          <View style={{ padding: 22, paddingBottom: Math.max(22, insets.bottom) }}>
            <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center', lineHeight: 21 }]}>{info.tagline}</Text>
            <View style={{ marginTop: 18, gap: 14 }}>
              {info.points.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                    <SF name={p.icon} size={17} color={T.brand} />
                  </View>
                  <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{p.text}</Text>
                </View>
              ))}
            </View>
            <PrimaryButton label={info.cta} icon="checkmark" onPress={onClose} style={{ marginTop: 22 }} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function PageIntro({ page }: { page: PageKey }) {
  const isFocused = useIsFocused();
  const { ready, isSeen, markSeen } = usePageIntroState();
  const [visible, setVisible] = React.useState(false);
  const info = PAGE_INTROS[page];

  // Show once, on the first focus of this tab after the seen-list has loaded.
  useEffect(() => {
    if (isFocused && ready && info && !isSeen(page) && !visible) setVisible(true);

  }, [isFocused, ready, page]);

  if (!info) return null;
  const close = () => { setVisible(false); markSeen(page); };
  return <IntroModal info={info} visible={visible} onClose={close} />;
}
