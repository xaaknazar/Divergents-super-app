// Minimal Markdown renderer for AI answers: headings, bold, bullet/numbered lists.
import React from 'react';
import { View, Text, TextStyle } from 'react-native';
import { ty } from '../theme/tokens';

function Inline({ text, color, bold }: { text: string; color: string; bold?: boolean }) {
  // split by **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== '');
  return (
    <Text style={[ty.body, { color, ...(bold ? { fontFamily: 'GothamRnd-Bold' } : null) } as TextStyle]}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <Text key={i} style={{ fontFamily: 'GothamRnd-Bold' }}>{p.slice(2, -2)}</Text>
          : <Text key={i}>{p}</Text>
      )}
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
        // headings
        const h = line.match(/^#{1,3}\s+(.*)$/);
        if (h) return <Text key={i} style={[ty.headline, { color, marginTop: i ? 6 : 0, marginBottom: 2 }]}>{h[1]}</Text>;
        // bullets
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
            <Text style={[ty.body, { color, fontFamily: 'GothamRnd-Bold' }]}>{n[1]}.</Text>
            <View style={{ flex: 1 }}><Inline text={n[2]} color={color} /></View>
          </View>
        );
        return <View key={i} style={{ marginVertical: 1 }}><Inline text={line} color={color} /></View>;
      })}
    </View>
  );
}
