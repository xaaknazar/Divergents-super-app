// Lightweight Markdown renderer for AI answers. Renders (never leaks the raw
// syntax) headings, bold/italic, inline code, ~~strike~~, links, blockquotes,
// bullet/numbered lists and horizontal rules. Any stray/unpaired markers are
// stripped so the text always reads cleanly.
import React from 'react';
import { View, Text, TextStyle, Platform, Linking } from 'react-native';
import { ty } from '../theme/tokens';

const BOLD = 'GothamRnd-Bold';
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string;

// One combined matcher for inline spans, tried left-to-right (so *** before **
// before *). Non-greedy bodies allow a bold run to contain a lone `*` (e.g. a
// multiplication sign) without breaking.
const INLINE_RE =
  /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|__[\s\S]+?__|~~[\s\S]+?~~|`[^`]+?`|\[[^\]]+?\]\([^)\s]+?\)|\*[^*\n]+?\*)/g;

// Remove inline markers without styling — used for headings (already bold).
function stripInlineMarkers(s: string): string {
  return s
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '$1')
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/__([\s\S]+?)__/g, '$1')
    .replace(/~~([\s\S]+?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .trim();
}

function span(p: string, key: number, color: string): React.ReactNode {
  if (/^\*\*\*[\s\S]+\*\*\*$/.test(p)) return <Text key={key} style={{ fontFamily: BOLD, fontStyle: 'italic' }}>{p.slice(3, -3)}</Text>;
  if (/^\*\*[\s\S]+\*\*$/.test(p)) return <Text key={key} style={{ fontFamily: BOLD }}>{p.slice(2, -2)}</Text>;
  if (/^__[\s\S]+__$/.test(p)) return <Text key={key} style={{ fontFamily: BOLD }}>{p.slice(2, -2)}</Text>;
  if (/^~~[\s\S]+~~$/.test(p)) return <Text key={key} style={{ textDecorationLine: 'line-through' }}>{p.slice(2, -2)}</Text>;
  if (/^`[^`]+`$/.test(p)) return <Text key={key} style={{ fontFamily: MONO, backgroundColor: 'rgba(127,127,127,0.16)' }}>{` ${p.slice(1, -1)} `}</Text>;
  const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
  if (link) return <Text key={key} onPress={() => Linking.openURL(link[2]).catch(() => {})} style={{ textDecorationLine: 'underline' }}>{link[1]}</Text>;
  if (/^\*[^*\n]+\*$/.test(p)) return <Text key={key} style={{ fontStyle: 'italic' }}>{p.slice(1, -1)}</Text>;
  // Literal text — drop any leftover unpaired bold/underscore markers.
  return <Text key={key}>{p.replace(/\*\*/g, '').replace(/__/g, '')}</Text>;
}

function Inline({ text, color, bold }: { text: string; color: string; bold?: boolean }) {
  const parts = text.split(INLINE_RE).filter((p) => p !== '' && p !== undefined);
  return (
    <Text style={[ty.body, { color, ...(bold ? { fontFamily: BOLD } : null) } as TextStyle]}>
      {parts.map((p, i) => span(p, i, color))}
    </Text>
  );
}

export function MarkdownText({ text, color }: { text: string; color: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  return (
    <View>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (line.trim() === '') return <View key={i} style={{ height: 6 }} />;
        // horizontal rule: --- / *** / ___
        if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return <View key={i} style={{ height: 0.5, backgroundColor: color, opacity: 0.2, marginVertical: 8 }} />;
        // headings (# … ######) — already bold; strip any inline markers inside.
        const h = line.match(/^#{1,6}\s+(.*)$/);
        if (h) return <Text key={i} style={[ty.headline, { color, marginTop: i ? 6 : 0, marginBottom: 2 }]}>{stripInlineMarkers(h[1])}</Text>;
        // blockquote
        const q = line.match(/^>\s?(.*)$/);
        if (q) return (
          <View key={i} style={{ flexDirection: 'row', gap: 8, marginVertical: 1 }}>
            <View style={{ width: 3, borderRadius: 2, backgroundColor: color, opacity: 0.3 }} />
            <View style={{ flex: 1 }}><Inline text={q[1]} color={color} /></View>
          </View>
        );
        // bullets ( -, •, * followed by a space )
        const b = line.match(/^\s*[-•*]\s+(.*)$/);
        if (b) return (
          <View key={i} style={{ flexDirection: 'row', gap: 6, marginVertical: 1 }}>
            <Text style={[ty.body, { color }]}>•</Text>
            <View style={{ flex: 1 }}><Inline text={b[1]} color={color} /></View>
          </View>
        );
        // numbered
        const n = line.match(/^\s*(\d+)\.\s+(.*)$/);
        if (n) return (
          <View key={i} style={{ flexDirection: 'row', gap: 6, marginVertical: 1 }}>
            <Text style={[ty.body, { color, fontFamily: BOLD }]}>{n[1]}.</Text>
            <View style={{ flex: 1 }}><Inline text={n[2]} color={color} /></View>
          </View>
        );
        return <View key={i} style={{ marginVertical: 1 }}><Inline text={line} color={color} /></View>;
      })}
    </View>
  );
}
