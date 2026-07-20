// Launch screen — minimalist reveal of the Divergents η-mark + wordmark + slogan.
// Renders on a fixed brand-navy backdrop that matches the native splash
// (app.json -> expo.splash.backgroundColor) for a seamless native -> JS handoff.
// Reveal is gated on `fontsLoaded` AND a tasteful minimum duration so it never
// flashes; then the whole overlay cross-fades into the mounted app underneath.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from '../components/Logo';
import { ty } from '../theme/tokens';

// Fixed brand palette (independent of light/dark theme) so the JS splash always
// matches the native one and reads cleanly in white-on-navy.
const NAVY_TOP = '#2C4EA6';
const NAVY_MID = '#234088';
const NAVY_DEEP = '#16294F';
const WHITE = '#FFFFFF';

const SLOGAN = 'non-stop development';
const MIN_DURATION_MS = 1700;

export function IntroSplash({ fontsLoaded, onDone }: { fontsLoaded: boolean; onDone: () => void }) {
  const { width } = useWindowDimensions();
  const logoSize = Math.min(120, Math.round(width * 0.3));

  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordTranslate = useRef(new Animated.Value(8)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  const [minElapsed, setMinElapsed] = useState(false);
  const dismissing = useRef(false);

  // Intro: logo settles in softly.
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 56, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => setMinElapsed(true), MIN_DURATION_MS);
    return () => clearTimeout(t);
  }, [logoOpacity, logoScale]);

  // Wordmark + slogan fade in once the brand font is ready.
  useEffect(() => {
    if (!fontsLoaded) return;
    Animated.parallel([
      Animated.timing(wordOpacity, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(wordTranslate, { toValue: 0, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fontsLoaded, wordOpacity, wordTranslate]);

  // Dismiss: cross-fade the overlay away.
  useEffect(() => {
    if (!fontsLoaded || !minElapsed || dismissing.current) return;
    dismissing.current = true;
    Animated.sequence([
      Animated.delay(140),
      Animated.timing(containerOpacity, { toValue: 0, duration: 460, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onDone(); });
  }, [fontsLoaded, minElapsed, containerOpacity, onDone]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      <StatusBar style="light" />
      <LinearGradient
        colors={[NAVY_TOP, NAVY_MID, NAVY_DEEP]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.center}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Logo size={logoSize} body={WHITE} head={WHITE} />
        </Animated.View>

        <Animated.View style={{ opacity: wordOpacity, transform: [{ translateY: wordTranslate }], alignItems: 'center', maxWidth: width * 0.86 }}>
          <Animated.Text style={styles.wordmark} numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}>
            Divergents
          </Animated.Text>
          <Animated.Text style={styles.slogan} numberOfLines={1} allowFontScaling={false}>
            {SLOGAN}
          </Animated.Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
    backgroundColor: NAVY_MID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  wordmark: {
    ...ty.largeTitle,
    color: WHITE,
    marginTop: 22,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  slogan: {
    ...ty.caption1,
    color: 'rgba(255,255,255,0.62)',
    marginTop: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
