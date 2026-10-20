import React from 'react';
import { ScrollView } from 'react-native';
import { Button } from './Button';
export function ChatSuggestions({ suggestions, onSelect, disabled }: { suggestions: readonly string[]; onSelect: (text: string) => void; disabled: boolean }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
    contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
    {suggestions.map(text => <Button key={text} label={text} onPress={() => onSelect(text)} disabled={disabled} size="compact" variant="tinted" />)}
  </ScrollView>;
}
