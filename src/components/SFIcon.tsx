// Icon component backed by @expo/vector-icons (Ionicons + MaterialCommunityIcons).
// Keeps the SF-Symbols-style names used across the app, mapped to real icons.
import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export type SFName =
  | 'book.fill' | 'book' | 'sparkles' | 'person.3.fill' | 'person.3'
  | 'briefcase.fill' | 'briefcase' | 'person.crop.circle.fill' | 'person.crop.circle'
  | 'play.fill' | 'play.circle.fill' | 'chevron.forward' | 'chevron.right' | 'chevron.left'
  | 'chevron.down' | 'magnifyingglass' | 'flame.fill' | 'trophy.fill' | 'crown.fill'
  | 'medal.fill' | 'star.fill' | 'star' | 'heart.fill' | 'heart' | 'checkmark.circle.fill'
  | 'checkmark' | 'checkmark.seal.fill' | 'plus' | 'plus.circle' | 'plus.circle.fill'
  | 'xmark' | 'gearshape' | 'bell.fill' | 'bell.badge.fill' | 'envelope.fill' | 'phone.fill'
  | 'mappin.circle.fill' | 'mappin.and.ellipse' | 'person.fill' | 'building.2.fill'
  | 'cart.fill' | 'cart' | 'target' | 'location.fill' | 'bolt.fill' | 'figure.run' | 'brain.head.profile'
  | 'heart.text.square.fill' | 'leaf.fill' | 'arrow.up.circle.fill' | 'bookmark'
  | 'bookmark.fill' | 'square.and.arrow.up' | 'ellipsis' | 'lock.fill' | 'lock'
  | 'doc.text' | 'doc.fill' | 'circle.fill' | 'circle' | 'list.bullet' | 'map.fill' | 'map'
  | 'paperplane.fill' | 'goforward.15' | 'gobackward.15' | 'pause.fill' | 'airplayvideo'
  | 'arrow.up.left.and.arrow.down.right' | 'clock.fill' | 'calendar' | 'graduationcap.fill'
  | 'puzzlepiece.fill' | 'figure.2.and.child.holdinghands' | 'flag.fill' | 'tag.fill'
  | 'percent' | 'globe' | 'house.fill' | 'figure.walk' | 'arrow.right'
  | 'soccerball' | 'tennis.racket' | 'bicycle' | 'figure.mind.and.body' | 'dumbbell' | 'cube.fill'
  | 'wifi.slash' | 'arrow.clockwise' | 'tray' | 'moon.fill' | 'sun.max.fill'
  | 'rosette' | 'checkmark.circle' | 'gearshape.fill' | 'paintpalette.fill';

type Lib = 'ion' | 'mci';
// name -> [library, icon]
const MAP: Record<string, [Lib, string]> = {
  'book.fill': ['ion', 'book'], 'book': ['ion', 'book-outline'],
  'sparkles': ['ion', 'sparkles'],
  'person.3.fill': ['ion', 'people'], 'person.3': ['ion', 'people-outline'],
  'briefcase.fill': ['ion', 'briefcase'], 'briefcase': ['ion', 'briefcase-outline'],
  'person.crop.circle.fill': ['ion', 'person-circle'], 'person.crop.circle': ['ion', 'person-circle-outline'],
  'play.fill': ['ion', 'play'], 'play.circle.fill': ['ion', 'play-circle'],
  'chevron.forward': ['ion', 'chevron-forward'], 'chevron.right': ['ion', 'chevron-forward'],
  'chevron.left': ['ion', 'chevron-back'], 'chevron.down': ['ion', 'chevron-down'],
  'magnifyingglass': ['ion', 'search'],
  'flame.fill': ['ion', 'flame'], 'trophy.fill': ['ion', 'trophy'],
  'crown.fill': ['mci', 'crown'], 'medal.fill': ['mci', 'medal'],
  'star.fill': ['ion', 'star'], 'star': ['ion', 'star-outline'],
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
  'target': ['mci', 'target'], 'location.fill': ['ion', 'locate'], 'bolt.fill': ['ion', 'flash'],
  'figure.run': ['mci', 'run'], 'brain.head.profile': ['mci', 'brain'],
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
  'wifi.slash': ['ion', 'cloud-offline'], 'arrow.clockwise': ['ion', 'refresh'],
  'tray': ['ion', 'file-tray-outline'], 'moon.fill': ['ion', 'moon'],
  'sun.max.fill': ['ion', 'sunny'], 'rosette': ['mci', 'medal-outline'],
  'checkmark.circle': ['ion', 'checkmark-circle-outline'], 'gearshape.fill': ['ion', 'settings'],
  'paintpalette.fill': ['ion', 'color-palette'],
};

export interface SFProps {
  name: SFName | string;
  size?: number;
  color?: string;
}

export function SF({ name, size = 20, color = '#000' }: SFProps) {
  const [lib, icon] = MAP[name] ?? ['ion', 'ellipse-outline'];
  if (lib === 'mci') {
    return <MaterialCommunityIcons name={icon as any} size={size} color={color} />;
  }
  return <Ionicons name={icon as any} size={size} color={color} />;
}

export default SF;
