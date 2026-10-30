import React, { useRef } from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ChatIntroduction } from './ChatIntroduction';
import { ChatMessage } from './ChatMessage';
import { ContentLoading } from './ContentLoading';
import { InlineNotice } from './InlineNotice';

export function ChatThread({ messages, busy, title, description, note }: {
  messages: { id: string; role: 'user' | 'bot'; text: string }[]; busy: boolean; title: string; description: string; note?: string;
}) {
  const { reduceMotion } = useTheme();
  const scroll = useRef<ScrollView>(null);
  return <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
    contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 24 }}
    onContentSizeChange={() => { if (messages.length) scroll.current?.scrollToEnd({ animated: !reduceMotion }); }}>
    {!messages.length ? <>
      <ChatIntroduction title={title} description={description} />
      {note ? <InlineNotice message={note} /> : null}
    </> : null}
    {messages.map(message => <ChatMessage key={message.id} role={message.role} text={message.text} />)}
    {busy ? <ContentLoading /> : null}
  </ScrollView>;
}
