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
const NAVY_DEEP = '#16294F';
// Uniform white mark on the navy splash (no two-tone tint).
const LOGO_BODY = '#FFFFFF';
const LOGO_HEAD = '#FFFFFF';

const MIN_DURATION_MS = 1800;

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

  // Continuous ambience: expanding ripple rings + a breathing glow.
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  // Three-dot loader under the wordmark.
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

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

  // Ambient loops: two staggered ripple rings + a slow breathing glow.
  useEffect(() => {
    const ripple = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    const r1 = ripple(ring1, 300);
    const r2 = ripple(ring2, 1600);
    const br = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    r1.start(); r2.start(); br.start();
    return () => { r1.stop(); r2.stop(); br.stop(); };
  }, [ring1, ring2, breathe]);

  // Wordmark + loader dots fade in only once the brand font is ready.
  useEffect(() => {
    if (!fontsLoaded) return;
    Animated.parallel([
      Animated.timing(wordOpacity, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(wordTranslate, { toValue: 0, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    const bounce = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
    const b1 = bounce(dot1, 0), b2 = bounce(dot2, 160), b3 = bounce(dot3, 320);
    b1.start(); b2.start(); b3.start();
    return () => { b1.stop(); b2.stop(); b3.stop(); };
  }, [fontsLoaded, wordOpacity, wordTranslate, dot1, dot2, dot3]);

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
  const ringSize = logoSize * 1.5;

  // Ripple ring: expands from ~0.7x to ~2.6x while fading out.
  const ringStyle = (v: Animated.Value) => ({
    width: ringSize,
    height: ringSize,
    borderRadius: ringSize / 2,
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.4, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 2.6] }) }],
  });
  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const breatheOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

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
      {/* Soft bottom vignette for depth */}
      <LinearGradient
        colors={['transparent', 'rgba(9,17,38,0.55)']}
        locations={[0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.center}>
        {/* Expanding ripple rings */}
        <Animated.View style={[styles.ring, ringStyle(ring1)]} />
        <Animated.View style={[styles.ring, ringStyle(ring2)]} />

        {/* Soft radial halo behind the mark (breathes gently) */}
        <Animated.View
          style={[
            styles.halo,
            {
              width: haloSize,
              height: haloSize,
              borderRadius: haloSize / 2,
              opacity: Animated.multiply(haloOpacity, breatheOpacity),
              transform: [{ scale: Animated.multiply(haloScale, breatheScale) }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(159,180,255,0.34)', 'rgba(159,180,255,0.07)', 'transparent']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
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

        {/* Three-dot loader */}
        <Animated.View style={[styles.dots, { opacity: wordOpacity }]}>
          <Animated.View style={[styles.dot, { opacity: dot1 }]} />
          <Animated.View style={[styles.dot, { opacity: dot2 }]} />
          <Animated.View style={[styles.dot, { opacity: dot3 }]} />
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
  center: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  ring: {
    position: 'absolute',
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  wordmark: {
    ...ty.title2,
    color: '#FFFFFF',
    marginTop: 22,
    letterSpacing: 0.6,
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
});
