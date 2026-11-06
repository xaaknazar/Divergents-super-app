import React, { useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SF } from './SFIcon';
import { useChannelAppearance } from './useChannelAppearance';
import { ChannelPostBubble, ChannelPostBubbleProps } from './ChannelPostBubble';
import { ChannelMessageFrame, ChannelReactionMenu } from './ChannelReactionMenu';
import { hSelect } from '../lib/haptics';

export interface ChannelPostCardProps extends Omit<ChannelPostBubbleProps, 'onRequestReactions'> {}

export function ChannelPostCard(props: ChannelPostCardProps) {
  const { post, author, playing, onReact } = props;
  const C = useChannelAppearance();
  const { width } = useWindowDimensions();
  const bubble = useRef<View>(null);
  const layout = useRef({ width: 0, height: 0 });
  const [anchor, setAnchor] = useState<ChannelMessageFrame | null>(null);
  const request = useRef(0);
  useEffect(() => { setAnchor(null); request.current++; return () => { request.current++; }; }, [post.id]);
  const close = () => { request.current++; setAnchor(null); };
  const open = (event?: GestureResponderEvent) => {
    const attempt = ++request.current;
    hSelect();
    // The touch position also gives keyboard/assistive and unmeasured views a usable fallback.
    const fallback = { x: 10, y: (event?.nativeEvent.pageY ?? 180) - (event?.nativeEvent.locationY ?? 0),
      width: layout.current.width || width - 62, height: layout.current.height || 300 };
    setAnchor(fallback);
    bubble.current?.measureInWindow((x, y, w, h) => {
      if (request.current === attempt && w > 0 && h > 0) setAnchor({ x, y, width: w, height: h });
    });
  };
  return <View style={styles.messageRow}>
    <Pressable ref={bubble} testID={`channel-message-${post.id}`} accessible={false} onLongPress={open} delayLongPress={350}
      onLayout={event => { layout.current = event.nativeEvent.layout; }} style={styles.bubble}>
      <ChannelPostBubble {...props} onRequestReactions={() => open()} />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Поделиться публикацией"
      onPress={() => { Share.share({ message: [author, post.title, post.body, post.audioUrl].filter(Boolean).join('\n\n') }).catch(() => {}); }}
      style={styles.shareTarget}>
      <View style={[styles.share, { backgroundColor: C.bubble }]}><SF name="arrowshape.turn.up.right.fill" size={18} color={C.label} /></View>
    </Pressable>
    {anchor ? <ChannelReactionMenu post={post} author={author} playing={playing} anchor={anchor} onReact={onReact} onClose={close} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 10, paddingRight: 6, gap: 2, paddingBottom: 5 },
  bubble: { flex: 1, minWidth: 0 },
  shareTarget: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  share: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
