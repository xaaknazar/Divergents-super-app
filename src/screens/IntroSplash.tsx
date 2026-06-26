// Animated launch screen — Apple-style reveal of the Divergents η-mark.
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
const NAVY_DEEP = '#19305F';
const LOGO_BODY = '#FFFFFF';
const LOGO_HEAD = '#9FB4FF';

const MIN_DURATION_MS = 1600;

export function IntroSplash({ fontsLoaded, onDone }: { fontsLoaded: boolean; onDone: () => void }) {
  const { width } = useWindowDimensions();
  const logoSize = Math.min(132, Math.round(width * 0.34));

  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.6)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordTranslate = useRef(new Animated.Value(10)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  const [minElapsed, setMinElapsed] = useState(false);
  const dismissing = useRef(false);

  // Intro: halo blooms, logo springs in with a soft settle.
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 7.5, tension: 58, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(haloOpacity, { toValue: 1, duration: 760, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(haloScale, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => setMinElapsed(true), MIN_DURATION_MS);
    return () => clearTimeout(t);
  }, [haloOpacity, haloScale, logoOpacity, logoScale]);

  // Wordmark fades in only once the brand font is ready (avoids a system-font flash).
  useEffect(() => {
    if (!fontsLoaded) return;
    Animated.parallel([
      Animated.timing(wordOpacity, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(wordTranslate, { toValue: 0, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fontsLoaded, wordOpacity, wordTranslate]);

  // Dismiss: tiny settle-up on the logo, then the overlay cross-fades away.
  useEffect(() => {
    if (!fontsLoaded || !minElapsed || dismissing.current) return;
    dismissing.current = true;
    Animated.sequence([
      Animated.delay(160),
      Animated.parallel([
        Animated.timing(logoScale, { toValue: 1.05, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(haloOpacity, { toValue: 0, duration: 460, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(containerOpacity, { toValue: 0, duration: 480, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => { if (finished) onDone(); });
  }, [fontsLoaded, minElapsed, containerOpacity, haloOpacity, logoScale, onDone]);

  const haloSize = logoSize * 2.6;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      <StatusBar style="light" />
      <LinearGradient
        colors={[NAVY_TOP, NAVY_MID, NAVY_DEEP]}
        locations={[0, 0.52, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.center}>
        {/* Soft radial halo behind the mark */}
        <Animated.View
          style={[
            styles.halo,
            {
              width: haloSize,
              height: haloSize,
              borderRadius: haloSize / 2,
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(159,180,255,0.30)', 'rgba(159,180,255,0.06)', 'transparent']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
            // round it into a soft disc
          />
        </Animated.View>

        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Logo size={logoSize} body={LOGO_BODY} head={LOGO_HEAD} />
        </Animated.View>

        <Animated.Text
          style={[styles.wordmark, { opacity: wordOpacity, transform: [{ translateY: wordTranslate }] }]}
          allowFontScaling={false}
        >
          Divergents
        </Animated.Text>
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
  center: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  wordmark: {
    ...ty.title2,
    color: '#FFFFFF',
    marginTop: 22,
    letterSpacing: 0.6,
  },
});
