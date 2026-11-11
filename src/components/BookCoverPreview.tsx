import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, View } from 'react-native';
import { bookCoverSource } from '../lib/bookCoverSource';
import { BookCover } from './BookCover';
import { BookCoverViewer, CoverOrigin } from './BookCoverViewer';

/** Inspect a cover from the book detail, without stealing catalog navigation. */
export function BookCoverPreview({ imageUrl, title }: { imageUrl?: string | null; title: string }) {
  const trigger = useRef<View>(null);
  const mounted = useRef(true);
  const [origin, setOrigin] = useState<CoverOrigin | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const source = bookCoverSource(imageUrl);
  if (!source || failed === imageUrl) return <View style={{ alignSelf: 'center' }}><BookCover imageUrl={imageUrl} size="detail" /></View>;
  const close = () => {
    setOrigin(null);
    requestAnimationFrame(() => {
      const handle = findNodeHandle(trigger.current);
      if (mounted.current && handle) AccessibilityInfo.setAccessibilityFocus(handle);
    });
  };
  return <>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel={`Открыть обложку книги «${title}»`}
      accessibilityHint="Обложку можно закрыть свайпом или кнопкой"
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, alignSelf: 'center' })}
      onPress={() => trigger.current?.measureInWindow((x, y, width, height) => {
        if (mounted.current && width > 0 && height > 0) setOrigin({ x, y, width, height });
      })}>
      <BookCover imageUrl={imageUrl} size="detail" onLoadError={() => setFailed(imageUrl!)} />
    </Pressable>
    {origin ? <BookCoverViewer source={source} title={title} origin={origin} onClose={close} /> : null}
  </>;
}
