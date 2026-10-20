// HeaderBackdrop — фон шапки корневых экранов вкладок (handoff 2026-10-20, §2.3).
// Бледная заливка тоном бренда + тонкий линейный рисунок раздела, исчезающий к низу.
// Ставит Screen (prop `backdrop`), слой за контентом, касания не перехватывает.
// Рисунок задан в координатах 390×360 макета и масштабируется по ширине экрана.
// Reduce Transparency — только заливка, без рисунка.
import React from 'react';
import { StyleSheet,View,useWindowDimensions } from 'react-native';
import Svg,{ Circle,Defs,Ellipse,G,LinearGradient,Path,RadialGradient,Rect,Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

export type HeaderBackdropMotif = 'learn' | 'ai' | 'community' | 'profile';

const W = 390;
const H = 360;

type Shape =
  | { kind: 'line'; d: string; o: number; w?: number }
  | { kind: 'dot'; x: number; y: number; r: number; o: number }
  | { kind: 'ring'; x: number; y: number; r: number; o: number }
  | { kind: 'spark'; x: number; y: number; s: number; o: number }
  | { kind: 'ellipse'; rx: number; ry: number; o: number };

function motifShapes(motif: HeaderBackdropMotif): Shape[] {
  const out: Shape[] = [];
  const line = (d: string, o: number, w?: number) => out.push({ kind: 'line', d, o, w });
  const dot = (x: number, y: number, r: number, o: number) => out.push({ kind: 'dot', x, y, r, o });
  if (motif === 'learn') {
    // «Расходящиеся пути»: одна точка внизу слева, веер кривых вправо вверх.
    for (let i = 0; i < 10; i++) {
      const y = -70 + i * 30;
      line(`M 30 340 C 150 340, 250 ${y + 110}, 430 ${y}`, 0.15 - i * 0.008);
    }
    dot(318, 52, 3, 0.42); dot(250, 22, 2.5, 0.36); dot(372, 150, 3.5, 0.32); dot(300, 196, 2.5, 0.28);
  } else if (motif === 'ai') {
    // Орбиты вокруг (330, 30) и четыре «искры».
    for (let k = 1; k <= 7; k++) {
      const r = k * 34;
      line(`M ${330 - r} 30 a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`, 0.17 - k * 0.017);
    }
    out.push({ kind: 'spark', x: 232, y: 64, s: 7, o: 0.42 }, { kind: 'spark', x: 282, y: 160, s: 5, o: 0.34 },
      { kind: 'spark', x: 184, y: 128, s: 4, o: 0.28 }, { kind: 'spark', x: 356, y: 210, s: 6, o: 0.3 });
    dot(330, 30, 5, 0.35);
  } else if (motif === 'community') {
    // Сеть: 10 узлов и 13 связей в правом верхнем углу.
    const P = [[396, 14], [346, 30], [300, 10], [256, 36], [214, 12], [392, 128], [352, 152], [300, 178], [398, 206], [170, 26]];
    const L = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 4], [1, 5], [0, 5], [5, 6], [6, 7], [6, 8], [5, 8], [4, 9], [3, 7]];
    L.forEach(([a, b]) => line(`M ${P[a][0]} ${P[a][1]} L ${P[b][0]} ${P[b][1]}`, 0.13, 1.1));
    P.forEach(([x, y], j) => j % 3 === 0 ? out.push({ kind: 'ring', x, y, r: 5, o: 0.5 }) : dot(x, y, 3, 0.4));
  } else {
    // Контурные эллипсы, повёрнутые на −18°, вокруг (330, 40).
    for (let r = 1; r <= 8; r++) out.push({ kind: 'ellipse', rx: 26 + r * 30, ry: 18 + r * 22, o: 0.16 - r * 0.012 });
    dot(330, 40, 4, 0.4);
  }
  return out;
}

export function HeaderBackdrop({ motif }: { motif: HeaderBackdropMotif }) {
  const { T, isDark, reduceTransparency } = useTheme();
  const { width } = useWindowDimensions();
  const height = Math.round((H * width) / W);
  const accent = T.brandAccent;
  const ink = isDark ? T.brandAccent : T.brand;
  const strength = isDark ? 0.6 : 1;
  const shapes = reduceTransparency ? [] : motifShapes(motif);
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[styles.root, { height }]}>
    <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin slice">
      <Defs>
        {/* Тон акцента поверх фона страницы: 0.11 даёт #DDE5F6 макета на #F2F2F7, 0.06 — #E7ECF8 на 45 %. */}
        <LinearGradient id="hb-wash" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity={0.11 * strength} />
          <Stop offset="0.45" stopColor={accent} stopOpacity={0.06 * strength} />
          <Stop offset="1" stopColor={accent} stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id="hb-right" cx={W} cy={0} rx={W * 0.9} ry={H * 0.8} fx={W} fy={0} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={accent} stopOpacity={0.2 * strength} />
          <Stop offset="0.7" stopColor={accent} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="hb-left" cx={0} cy={0} rx={W * 0.7} ry={H * 0.6} fx={0} fy={0} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={T.brand} stopOpacity={0.12 * strength} />
          <Stop offset="0.7" stopColor={T.brand} stopOpacity={0} />
        </RadialGradient>
        {/* Рисунок гаснет быстрее заливки: полный до 22 %, ноль к 78 % высоты. */}
        <LinearGradient id="hb-ink" x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <Stop offset="0.22" stopColor={ink} stopOpacity={1} />
          <Stop offset="0.78" stopColor={ink} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="hb-dot" x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <Stop offset="0.22" stopColor={accent} stopOpacity={1} />
          <Stop offset="0.78" stopColor={accent} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill="url(#hb-wash)" />
      <Rect x={0} y={0} width={W} height={H} fill="url(#hb-right)" />
      <Rect x={0} y={0} width={W} height={H} fill="url(#hb-left)" />
      <G>
        {shapes.map((s, i) => {
          if (s.kind === 'line') return <Path key={i} d={s.d} fill="none" stroke="url(#hb-ink)" strokeOpacity={s.o * strength} strokeWidth={s.w ?? 1.2} strokeLinecap="round" />;
          if (s.kind === 'dot') return <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="url(#hb-dot)" fillOpacity={s.o * strength} />;
          if (s.kind === 'ring') return <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={T.groupedBg} stroke="url(#hb-dot)" strokeOpacity={s.o * strength} strokeWidth={1.4} />;
          if (s.kind === 'spark') {
            const { x, y, s: k } = s;
            return <Path key={i} fill="url(#hb-dot)" fillOpacity={s.o * strength}
              d={`M ${x} ${y - k} Q ${x} ${y} ${x + k} ${y} Q ${x} ${y} ${x} ${y + k} Q ${x} ${y} ${x - k} ${y} Q ${x} ${y} ${x} ${y - k} Z`} />;
          }
          return <Ellipse key={i} cx={330} cy={40} rx={s.rx} ry={s.ry} transform="rotate(-18 330 40)" fill="none"
            stroke="url(#hb-ink)" strokeOpacity={s.o * strength} strokeWidth={1.2} />;
        })}
      </G>
    </Svg>
  </View>;
}

const styles = StyleSheet.create({ root: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' } });
