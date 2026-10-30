import React from 'react';
import { Text,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { MarkdownText } from './MarkdownText';
import { Wrapper } from './Wrapper';
export function ChatMessage({ role, text, onCopy }: { role: 'user' | 'bot'; text: string; onCopy?: () => void }) {
  const { T, ty } = useTheme();
  const user = role === 'user';
  return <Wrapper align={user ? 'flex-end' : 'flex-start'} marginBottom={16}>
    <View style={{ maxWidth: '90%', backgroundColor: user ? T.brand : T.fillTertiary,
      borderRadius: 18, borderBottomRightRadius: user ? 4 : 18, borderBottomLeftRadius: user ? 18 : 4,
      borderCurve: 'continuous', paddingVertical: 12, paddingHorizontal: 14 }}>
      {user ? <Text style={[ty.body, { color: T.onBrand }]}>{text}</Text> : <MarkdownText text={text} color={T.label} />}
    </View>
    {!user && text.length > 0 && onCopy ? <Wrapper marginTop={4}><Button label="Копировать" icon="doc.text" variant="plain" tone="neutral" size="compact" onPress={onCopy} /></Wrapper> : null}
  </Wrapper>;
}
