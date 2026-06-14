import React, { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { Capsule, IconSquircle, T, ty } from '../../components/ui';
import { INITIAL_MESSAGES, QUICK_REPLIES, CANNED, ChatMessage } from '../../data/ai';
import { AIStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<AIStackParams, 'AIChat'>;

let counter = 100;
const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export function AIChatScreen({}: Props) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const send = (body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { id: String(++counter), role: 'user', text: trimmed, time: now() };
    const reply = CANNED[trimmed] ?? 'Хороший вопрос. Я учитываю твой психотип Паранойял, таланты Strategic и Command и опыт HR-директора — дай чуть больше деталей, и я дам конкретные шаги.';
    const botMsg: ChatMessage = { id: String(++counter), role: 'bot', text: reply, time: now() };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg, paddingTop: insets.top }}>
      {/* Inline title */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: T.separator, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SF name="sparkles" size={20} color={T.brandAccent} />
        <View style={{ alignItems: 'center' }}>
          <Text style={[ty.headline, { color: T.label }]}>Divergents AI</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <SF name="circle.fill" size={6} color={T.green} />
            <Text style={[ty.caption1, { color: T.green }]}>Знает ваш профиль</Text>
          </View>
        </View>
        <SF name="ellipsis" size={20} color={T.brandAccent} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 8}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <Capsule bg={T.brandTinted} color={T.brand}><SF name="sparkles" size={11} color={T.brand} />Психотип Паранойял · 3 таланта</Capsule>
          </View>

          {messages.map((msg) => (
            <View key={msg.id} style={{ marginBottom: 12, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <View style={{ maxWidth: '88%' }}>
                <View style={{
                  backgroundColor: msg.role === 'user' ? T.brand : T.fillTertiary,
                  borderRadius: 18,
                  borderBottomRightRadius: msg.role === 'user' ? 4 : 18,
                  borderBottomLeftRadius: msg.role === 'user' ? 18 : 4,
                  paddingVertical: 12, paddingHorizontal: 14,
                }}>
                  <Text style={[ty.body, { color: msg.role === 'user' ? '#fff' : T.label }]}>{msg.text}</Text>
                  {msg.cards ? (
                    <View style={{ marginTop: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, overflow: 'hidden' }}>
                      {msg.cards.map((r, i, arr) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 }}>
                          <IconSquircle icon={r.i} bg={r.c} size={32} />
                          <View style={{ flex: 1 }}>
                            <Text style={[ty.footnoteEm, { color: T.label }]}>{r.t}</Text>
                            <Text style={[ty.caption1, { color: T.labelSecondary }]}>{r.s}</Text>
                          </View>
                          <SF name="chevron.forward" size={12} color={T.labelTertiary} />
                          {i < arr.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 54, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
                <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 4, marginHorizontal: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }]}>{msg.time}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Quick replies + input */}
        <View style={{ borderTopWidth: 0.5, borderTopColor: T.separator, backgroundColor: 'rgba(249,249,249,0.98)', paddingTop: 8, paddingBottom: insets.bottom + 70 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
            {QUICK_REPLIES.map((q) => (
              <Pressable key={q} onPress={() => send(q)} style={{ backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.separator, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 14 }}>
                <Text style={[ty.subhead, { color: T.label }]}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, alignItems: 'center' }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
              <SF name="plus" size={18} color={T.labelSecondary} />
            </View>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Спросите что-нибудь..."
              placeholderTextColor={T.labelTertiary}
              style={[ty.body, { flex: 1, backgroundColor: T.cardBg, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 0.5, borderColor: T.separator, color: T.label }]}
              onSubmitEditing={() => send(text)}
              returnKeyType="send"
            />
            <Pressable onPress={() => send(text)} hitSlop={6}>
              <SF name="arrow.up.circle.fill" size={32} color={text.trim() ? T.brand : T.labelTertiary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
