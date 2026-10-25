// Icon component backed by @expo/vector-icons (Ionicons + MaterialCommunityIcons).
// Keeps the SF-Symbols-style names used across the app, mapped to real icons.
// Глифы, которых нет в шрифтах, нарисованы вручную как SVG (viewBox 24) — ветка `svg`.
import { Ionicons,MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import Svg,{ Path } from 'react-native-svg';

export type SFName =
  | 'book.fill' | 'book' | 'sparkles' | 'sparkles.outline' | 'person.3.fill' | 'person.3'
  | 'briefcase.fill' | 'briefcase' | 'person.crop.circle.fill' | 'person.crop.circle'
  | 'play.fill' | 'play.circle.fill' | 'chevron.forward' | 'chevron.right' | 'chevron.left'
  | 'chevron.down' | 'chevron.up' | 'magnifyingglass' | 'flame.fill' | 'trophy.fill' | 'crown.fill' | 'list.number'
  | 'medal.fill' | 'star.fill' | 'star' | 'heart.fill' | 'heart' | 'checkmark.circle.fill'
  | 'checkmark' | 'checkmark.seal.fill' | 'plus' | 'plus.circle' | 'plus.circle.fill'
  | 'xmark' | 'gearshape' | 'bell.fill' | 'bell.badge.fill' | 'envelope.fill' | 'phone.fill'
  | 'mappin.circle.fill' | 'mappin.and.ellipse' | 'person.fill' | 'building.2.fill'
  | 'cart.fill' | 'cart' | 'target' | 'location.fill' | 'bolt.fill' | 'clock' | 'airplane' | 'arrow.down.circle' | 'square.and.arrow.down' | 'trash.fill' | 'creditcard.fill' | 'clock.arrow.circlepath' | 'lock.open.fill' | 'photo' | 'smallcircle.filled.circle' | 'xmark.circle.fill' | 'waveform' | 'doc.text.fill' | 'headphones' | 'eye.fill' | 'person.2.fill' | 'figure.run' | 'brain.head.profile' | 'quote.bubble.fill' | 'quote.bubble' | 'bubble.left' | 'bubble.left.fill' | 'arrow.up'
  | 'heart.text.square.fill' | 'leaf.fill' | 'arrow.up.circle.fill' | 'bookmark'
  | 'bookmark.fill' | 'square.and.arrow.up' | 'ellipsis' | 'lock.fill' | 'lock'
  | 'doc.text' | 'doc.fill' | 'circle.fill' | 'circle' | 'list.bullet' | 'map.fill' | 'map'
  | 'paperplane.fill' | 'goforward.15' | 'gobackward.15' | 'pause.fill' | 'airplayvideo'
  | 'arrow.up.left.and.arrow.down.right' | 'clock.fill' | 'calendar' | 'graduationcap.fill'
  | 'puzzlepiece.fill' | 'figure.2.and.child.holdinghands' | 'flag.fill' | 'tag.fill'
  | 'percent' | 'globe' | 'house.fill' | 'figure.walk' | 'arrow.right'
  | 'soccerball' | 'tennis.racket' | 'bicycle' | 'figure.mind.and.body' | 'dumbbell' | 'cube.fill'
  | 'cup.and.saucer.fill' | 'fork.knife' | 'bed.double.fill' | 'beach.umbrella.fill'
  | 'tree.fill' | 'basket.fill' | 'camera.fill' | 'exclamationmark.bubble'
  | 'applelogo' | 'logo.google'
  | 'wifi.slash' | 'arrow.clockwise' | 'tray' | 'moon.fill' | 'sun.max.fill'
  | 'rosette' | 'checkmark.circle' | 'gearshape.fill' | 'paintpalette.fill'
  | 'face.smiling' | 'person.badge.plus' | 'mic.fill' | 'stop.fill'
  | 'circle.lefthalf.filled' | 'textformat.size' | 'arrow.counterclockwise'
  | 'arrow.down' | 'minus' | 'slider.horizontal.3'
  | 'square.and.pencil' | 'info.circle' | 'rectangle.portrait.and.arrow.right'
  | 'gift.fill' | 'gift'
  | 'stopwatch' | 'mountain.2.fill' | 'tent.fill' | 'chart.line.uptrend.xyaxis' | 'kettlebell'
  | 'waveform.path.ecg' | 'arrow.down.circle.fill' | 'books.vertical.fill';

type Lib = 'ion' | 'mci' | 'svg';

// «Бегущий человек» (person-running): в Layero Round его нет, глиф нарисован в том же
// стиле. Источник — handoff 2026-10-20, design-source/Icon.dc.html, вариант solid.
const SVG_PATHS: Record<string, string> = {
  'person.running': 'M17.89 4.01L17.76 3.59L17.55 3.20L17.27 2.86L16.93 2.58L16.54 2.37L16.12 2.24L15.68 2.20L15.24 2.24L14.82 2.37L14.43 2.58L14.09 2.86L13.81 3.20L13.60 3.59L13.47 4.01L13.43 4.45L13.47 4.89L13.60 5.31L13.81 5.70L14.09 6.04L14.43 6.32L14.82 6.53L15.24 6.66L15.68 6.70L16.12 6.66L16.54 6.53L16.93 6.32L17.27 6.04L17.55 5.70L17.76 5.31L17.89 4.89L17.93 4.45L17.89 4.01Z M8.94 8.55L8.63 8.46L8.42 8.45L8.10 8.52L7.82 8.67L7.59 8.90L7.44 9.19L7.38 9.51L7.39 9.72L7.49 10.03L7.60 10.21L7.75 10.37L10.03 12.04L10.35 12.20L10.01 12.86L9.94 13.16L9.93 13.46L8.14 16.33L4.63 17.68L4.41 17.79L4.22 17.94L3.99 18.23L3.86 18.57L3.83 18.82L3.85 19.06L3.96 19.41L4.17 19.71L4.46 19.94L4.69 20.04L4.93 20.09L5.29 20.08L5.53 20.02L9.43 18.52L9.63 18.41L9.90 18.20L10.04 18.01L11.97 14.92L14.23 15.89L13.26 20.28L13.23 20.52L13.25 20.77L13.36 21.11L13.50 21.32L13.67 21.50L13.87 21.64L14.09 21.74L14.45 21.80L14.70 21.78L15.04 21.67L15.25 21.53L15.43 21.36L15.57 21.16L15.67 20.94L16.90 15.42L16.93 15.18L16.91 14.93L16.84 14.69L16.73 14.47L16.49 14.20L16.28 14.06L13.54 12.87L14.55 11.09L16.62 12.55L16.82 12.62L17.14 12.65L17.45 12.58L17.65 12.49L17.89 12.29L19.96 10.01L20.07 9.82L20.17 9.51L20.17 9.19L20.08 8.88L19.96 8.70L19.82 8.54L19.65 8.41L19.45 8.31L19.24 8.26L19.03 8.25L18.71 8.31L18.52 8.41L18.34 8.53L16.93 10.08L15.64 9.16L15.85 8.74L15.93 8.29L15.91 7.99L15.83 7.69L15.60 7.30L15.39 7.08L15.15 6.90L14.87 6.78L14.42 6.70L13.97 6.76L13.69 6.86L13.43 7.03L13.11 7.36L12.18 8.98L10.74 9.83L8.94 8.55Z',
};
// name -> [library, icon]
const MAP: Record<string, [Lib, string]> = {
  'book.fill': ['ion', 'book'], 'book': ['ion', 'book-outline'],
  'sparkles': ['ion', 'sparkles'], 'sparkles.outline': ['ion', 'sparkles-outline'],
  'person.3.fill': ['ion', 'people'], 'person.3': ['ion', 'people-outline'],
  'briefcase.fill': ['ion', 'briefcase'], 'briefcase': ['ion', 'briefcase-outline'],
  'person.crop.circle.fill': ['ion', 'person-circle'], 'person.crop.circle': ['ion', 'person-circle-outline'],
  'play.fill': ['ion', 'play'], 'play.circle.fill': ['ion', 'play-circle'],
  'chevron.forward': ['ion', 'chevron-forward'], 'chevron.right': ['ion', 'chevron-forward'],
  'chevron.left': ['ion', 'chevron-back'], 'chevron.down': ['ion', 'chevron-down'],
  'chevron.up': ['ion', 'chevron-up'],
  'magnifyingglass': ['ion', 'search'],
  'flame.fill': ['ion', 'flame'], 'trophy.fill': ['ion', 'trophy'],
  // Нумерованный список — для рейтинга участников. Без явной пары имя
  // деградировало бы к нейтральному кружку: в меню это выглядит как ошибка.
  'list.number': ['mci', 'format-list-numbered'],
  'crown.fill': ['mci', 'crown'], 'medal.fill': ['mci', 'medal'],
  'star.fill': ['ion', 'star'], 'star': ['ion', 'star-outline'],
  'quote.bubble.fill': ['ion', 'chatbubble-ellipses'], 'quote.bubble': ['ion', 'chatbubble-ellipses-outline'],
  'bubble.left.fill': ['ion', 'chatbubble'], 'bubble.left': ['ion', 'chatbubble-outline'],
  'arrow.up': ['ion', 'arrow-up'], 'arrow.down': ['ion', 'arrow-down'], 'minus': ['ion', 'remove'], 'slider.horizontal.3': ['ion', 'options-outline'],
  'heart.fill': ['ion', 'heart'], 'heart': ['ion', 'heart-outline'],
  'checkmark.circle.fill': ['ion', 'checkmark-circle'], 'checkmark': ['ion', 'checkmark'],
  'checkmark.seal.fill': ['mci', 'check-decagram'],
  'plus': ['ion', 'add'], 'plus.circle': ['ion', 'add-circle-outline'], 'plus.circle.fill': ['ion', 'add-circle'],
  'xmark': ['ion', 'close'], 'gearshape': ['ion', 'settings-outline'],
  'bell.fill': ['ion', 'notifications'], 'bell.badge.fill': ['mci', 'bell-badge'],
  'envelope.fill': ['ion', 'mail'], 'phone.fill': ['ion', 'call'],
  'mappin.circle.fill': ['ion', 'location'], 'mappin.and.ellipse': ['ion', 'location-outline'],
  'person.fill': ['ion', 'person'], 'building.2.fill': ['mci', 'office-building'],
  'cart.fill': ['ion', 'cart'], 'cart': ['ion', 'cart-outline'],
  'target': ['mci', 'target'], 'location.fill': ['ion', 'locate'],
  'waveform': ['mci', 'waveform'], 'doc.text.fill': ['ion', 'document-text'], 'headphones': ['ion', 'headset'], 'eye.fill': ['ion', 'eye'], 'person.2.fill': ['ion', 'people'],

  'clock': ['ion', 'time-outline'], 'airplane': ['ion', 'airplane'], 'arrow.down.circle': ['ion', 'arrow-down-circle-outline'], 'square.and.arrow.down': ['ion', 'download'], 'trash.fill': ['ion', 'trash'], 'creditcard.fill': ['ion', 'card'], 'clock.arrow.circlepath': ['ion', 'time-outline'], 'lock.open.fill': ['ion', 'lock-open'], 'photo': ['ion', 'image'], 'smallcircle.filled.circle': ['ion', 'ellipse'], 'xmark.circle.fill': ['ion', 'close-circle'],
 'bolt.fill': ['ion', 'flash'],
  'figure.run': ['svg', 'person.running'], 'brain.head.profile': ['mci', 'brain'],
  'heart.text.square.fill': ['mci', 'heart-box'], 'leaf.fill': ['ion', 'leaf'],
  'arrow.up.circle.fill': ['ion', 'arrow-up-circle'],
  'bookmark': ['ion', 'bookmark-outline'], 'bookmark.fill': ['ion', 'bookmark'],
  'square.and.arrow.up': ['ion', 'share-outline'], 'ellipsis': ['ion', 'ellipsis-horizontal'],
  'lock.fill': ['ion', 'lock-closed'], 'lock': ['ion', 'lock-closed-outline'],
  'doc.text': ['ion', 'document-text-outline'], 'doc.fill': ['ion', 'document'],
  'circle.fill': ['ion', 'ellipse'], 'circle': ['ion', 'ellipse-outline'],
  'list.bullet': ['ion', 'list'], 'map.fill': ['ion', 'map'], 'map': ['ion', 'map-outline'],
  'paperplane.fill': ['ion', 'paper-plane'],
  'goforward.15': ['mci', 'fast-forward-15'], 'gobackward.15': ['mci', 'rewind-15'],
  'pause.fill': ['ion', 'pause'], 'airplayvideo': ['mci', 'apple-airplay'],
  'arrow.up.left.and.arrow.down.right': ['ion', 'expand'],
  'clock.fill': ['ion', 'time'], 'calendar': ['ion', 'calendar-outline'],
  'graduationcap.fill': ['mci', 'school'], 'puzzlepiece.fill': ['mci', 'puzzle'],
  'figure.2.and.child.holdinghands': ['mci', 'human-male-female-child'],
  'flag.fill': ['ion', 'flag'], 'tag.fill': ['ion', 'pricetag'],
  'percent': ['mci', 'percent'], 'globe': ['ion', 'globe-outline'],
  'house.fill': ['ion', 'home'], 'figure.walk': ['mci', 'walk'],
  'arrow.right': ['ion', 'arrow-forward'],
  'soccerball': ['mci', 'soccer'], 'tennis.racket': ['mci', 'tennis'],
  'bicycle': ['ion', 'bicycle'], 'figure.mind.and.body': ['mci', 'meditation'],
  'dumbbell': ['mci', 'dumbbell'], 'cube.fill': ['ion', 'cube'],
  'cup.and.saucer.fill': ['ion', 'cafe'], 'fork.knife': ['ion', 'restaurant'],
  'bed.double.fill': ['ion', 'bed'], 'beach.umbrella.fill': ['mci', 'beach'],
  'tree.fill': ['mci', 'tree'], 'basket.fill': ['ion', 'basket'],
  'camera.fill': ['ion', 'camera'], 'exclamationmark.bubble': ['ion', 'alert-circle-outline'],
  'applelogo': ['ion', 'logo-apple'], 'logo.google': ['ion', 'logo-google'],
  'wifi.slash': ['ion', 'cloud-offline'], 'arrow.clockwise': ['ion', 'refresh'],
  'tray': ['ion', 'file-tray-outline'], 'moon.fill': ['ion', 'moon'],
  'sun.max.fill': ['ion', 'sunny'], 'rosette': ['mci', 'medal-outline'],
  'checkmark.circle': ['ion', 'checkmark-circle-outline'], 'gearshape.fill': ['ion', 'settings'],
  'paintpalette.fill': ['ion', 'color-palette'],
  'circle.lefthalf.filled': ['ion', 'contrast'], 'textformat.size': ['mci', 'format-size'],
  'arrow.counterclockwise': ['ion', 'arrow-undo'],
  'square.and.pencil': ['ion', 'create-outline'], 'info.circle': ['ion', 'information-circle-outline'],
  'rectangle.portrait.and.arrow.right': ['ion', 'exit-outline'],
  'gift.fill': ['ion', 'gift'], 'gift': ['ion', 'gift-outline'],
  'face.smiling': ['ion', 'happy-outline'], 'person.badge.plus': ['ion', 'person-add'], 'mic.fill': ['ion', 'mic'], 'stop.fill': ['ion', 'stop'],
  'stopwatch': ['ion', 'stopwatch'], 'mountain.2.fill': ['mci', 'image-filter-hdr'], 'tent.fill': ['mci', 'tent'],
  'chart.line.uptrend.xyaxis': ['ion', 'trending-up'], 'kettlebell': ['mci', 'kettlebell'],
  'waveform.path.ecg': ['ion', 'pulse'], 'arrow.down.circle.fill': ['ion', 'arrow-down-circle'],
  'books.vertical.fill': ['ion', 'library'],
};

export interface SFProps {
  name: SFName | string;
  size?: number;
  color?: string;
}

export function SF({ name, size = 20, color = '#000' }: SFProps) {
  const [lib, icon] = MAP[name] ?? ['ion', 'ellipse-outline'];
  if (lib === 'svg') {
    return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={SVG_PATHS[icon]} fill={color} /></Svg>;
  }
  if (lib === 'mci') {
    return <MaterialCommunityIcons name={icon as any} size={size} color={color} />;
  }
  return <Ionicons name={icon as any} size={size} color={color} />;
}

export default SF;
