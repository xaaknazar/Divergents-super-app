// SFIcon — original SF-Symbols-style glyphs drawn as react-native-svg.
// These are hand-drawn approximations (not Apple's actual symbol font).
import React from 'react';
import Svg, { Path, Circle, Rect, Ellipse, Polygon, Text as SvgText } from 'react-native-svg';
import { T, FF } from '../theme/tokens';

export type SFName =
  | 'book.fill' | 'book' | 'sparkles' | 'person.3.fill' | 'person.3'
  | 'briefcase.fill' | 'briefcase' | 'person.crop.circle.fill' | 'person.crop.circle'
  | 'play.fill' | 'play.circle.fill' | 'chevron.forward' | 'chevron.right' | 'chevron.left'
  | 'chevron.down' | 'magnifyingglass' | 'flame.fill' | 'trophy.fill' | 'crown.fill'
  | 'medal.fill' | 'star.fill' | 'star' | 'heart.fill' | 'heart' | 'checkmark.circle.fill'
  | 'checkmark' | 'checkmark.seal.fill' | 'plus' | 'plus.circle' | 'plus.circle.fill'
  | 'xmark' | 'gearshape' | 'bell.fill' | 'bell.badge.fill' | 'envelope.fill' | 'phone.fill'
  | 'mappin.circle.fill' | 'mappin.and.ellipse' | 'person.fill' | 'building.2.fill'
  | 'cart.fill' | 'cart' | 'target' | 'bolt.fill' | 'figure.run' | 'brain.head.profile'
  | 'heart.text.square.fill' | 'leaf.fill' | 'arrow.up.circle.fill' | 'bookmark'
  | 'bookmark.fill' | 'square.and.arrow.up' | 'ellipsis' | 'lock.fill' | 'lock'
  | 'doc.text' | 'doc.fill' | 'circle.fill' | 'circle' | 'list.bullet' | 'map.fill'
  | 'paperplane.fill' | 'goforward.15' | 'gobackward.15' | 'pause.fill' | 'airplayvideo'
  | 'arrow.up.left.and.arrow.down.right' | 'clock.fill' | 'calendar' | 'graduationcap.fill'
  | 'puzzlepiece.fill' | 'figure.2.and.child.holdinghands' | 'flag.fill' | 'tag.fill'
  | 'percent' | 'globe' | 'house.fill' | 'figure.walk' | 'arrow.right';

export interface SFProps {
  name: SFName | string;
  size?: number;
  color?: string;
}

export function SF({ name, size = 20, color = '#000' }: SFProps) {
  const sw = 1.6;
  const s = { stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const V = (children: React.ReactNode) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">{children}</Svg>
  );

  switch (name) {
    case 'book.fill': return V(<><Path d="M4 4.5C4 3.7 4.7 3 5.5 3H11v17H5.5C4.7 20 4 19.3 4 18.5V4.5z" fill={color}/><Path d="M20 4.5C20 3.7 19.3 3 18.5 3H13v17h5.5C19.3 20 20 19.3 20 18.5V4.5z" fill={color}/></>);
    case 'book': return V(<Path d="M4 4.5C4 3.7 4.7 3 5.5 3H11v17H5.5C4.7 20 4 19.3 4 18.5V4.5z M20 4.5C20 3.7 19.3 3 18.5 3H13v17h5.5C19.3 20 20 19.3 20 18.5V4.5z" {...s}/>);
    case 'sparkles': return V(<><Path d="M12 3l1.5 4 4 1.5-4 1.5L12 14l-1.5-4-4-1.5 4-1.5L12 3z" fill={color}/><Path d="M19 14l.8 2 2 .8-2 .8L19 19.6 18.2 17.6l-2-.8 2-.8L19 14z" fill={color}/><Path d="M5 16l.6 1.6L7.2 18.2 5.6 18.8 5 20.4 4.4 18.8 2.8 18.2 4.4 17.6 5 16z" fill={color}/></>);
    case 'person.3.fill': return V(<><Circle cx="6" cy="9" r="2.4" fill={color}/><Circle cx="18" cy="9" r="2.4" fill={color}/><Circle cx="12" cy="8" r="3" fill={color}/><Path d="M3 18c0-2.2 1.5-4 3-4h0c1.5 0 3 1.8 3 4v1H3v-1z M15 18c0-2.2 1.5-4 3-4s3 1.8 3 4v1h-6v-1z M7 19c0-2.5 2-4.5 5-4.5s5 2 5 4.5v1H7v-1z" fill={color}/></>);
    case 'person.3': return V(<><Circle cx="6" cy="9" r="2.4" {...s}/><Circle cx="18" cy="9" r="2.4" {...s}/><Circle cx="12" cy="8" r="3" {...s}/><Path d="M7 20c0-2.5 2-4.5 5-4.5s5 2 5 4.5 M3 19c0-2.2 1.5-4 3-4 M21 19c0-2.2-1.5-4-3-4" {...s}/></>);
    case 'briefcase.fill': return V(<><Rect x="3" y="7" width="18" height="13" rx="2.5" fill={color}/><Path d="M9 7V5.5C9 4.7 9.7 4 10.5 4h3c.8 0 1.5.7 1.5 1.5V7" {...s}/></>);
    case 'briefcase': return V(<><Rect x="3" y="7" width="18" height="13" rx="2.5" {...s}/><Path d="M9 7V5.5C9 4.7 9.7 4 10.5 4h3c.8 0 1.5.7 1.5 1.5V7" {...s}/></>);
    case 'person.crop.circle.fill': return V(<><Circle cx="12" cy="12" r="9" fill={color}/><Circle cx="12" cy="10" r="3.2" fill="#fff"/><Path d="M5.5 18.5c1.2-2.5 3.7-4 6.5-4s5.3 1.5 6.5 4" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round"/></>);
    case 'person.crop.circle': return V(<><Circle cx="12" cy="12" r="9" {...s}/><Circle cx="12" cy="10" r="3.2" {...s}/><Path d="M5.5 18.5c1.2-2.5 3.7-4 6.5-4s5.3 1.5 6.5 4" {...s}/></>);
    case 'play.fill': return V(<Path d="M6 4.5v15l13-7.5L6 4.5z" fill={color}/>);
    case 'play.circle.fill': return V(<><Circle cx="12" cy="12" r="10" fill={color}/><Path d="M10 8l6 4-6 4V8z" fill="#fff"/></>);
    case 'chevron.forward':
    case 'chevron.right': return V(<Path d="M9 5l7 7-7 7" {...s}/>);
    case 'chevron.left': return V(<Path d="M15 5l-7 7 7 7" {...s}/>);
    case 'chevron.down': return V(<Path d="M5 9l7 7 7-7" {...s}/>);
    case 'magnifyingglass': return V(<><Circle cx="10.5" cy="10.5" r="6.5" {...s}/><Path d="M15.5 15.5l4 4" {...s}/></>);
    case 'flame.fill': return V(<Path d="M12 3c1 3 4 4 4 8a4 4 0 11-8 0c0-1.5.5-2 .5-3.5 0 0 2-1 1.5-3 0 .5 2 0 2-1.5z" fill={color}/>);
    case 'trophy.fill': return V(<><Path d="M7 5h10v4a5 5 0 01-10 0V5z" fill={color}/><Path d="M5 6H3v2a3 3 0 003 3 M19 6h2v2a3 3 0 01-3 3 M10 15h4v2h-4z M8 17h8v2H8z" {...s}/></>);
    case 'crown.fill': return V(<Path d="M3 7l3 4 3-6 3 6 3-6 3 6 3-4-1.5 11h-15L3 7z" fill={color}/>);
    case 'medal.fill': return V(<><Circle cx="12" cy="14" r="6" fill={color}/><Path d="M8 3l2 6M16 3l-2 6" {...s}/></>);
    case 'star.fill': return V(<Path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5L12 17l-5.5 3.5L8 14l-5-4.5L9.5 9 12 3z" fill={color}/>);
    case 'star': return V(<Path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5L12 17l-5.5 3.5L8 14l-5-4.5L9.5 9 12 3z" {...s}/>);
    case 'heart.fill': return V(<Path d="M12 20s-7-4.5-7-10c0-2.5 2-4.5 4.5-4.5 1.5 0 2.5.8 2.5 1.5 0-.7 1-1.5 2.5-1.5C17 5.5 19 7.5 19 10c0 5.5-7 10-7 10z" fill={color}/>);
    case 'heart': return V(<Path d="M12 20s-7-4.5-7-10c0-2.5 2-4.5 4.5-4.5 1.5 0 2.5.8 2.5 1.5 0-.7 1-1.5 2.5-1.5C17 5.5 19 7.5 19 10c0 5.5-7 10-7 10z" {...s}/>);
    case 'checkmark.circle.fill': return V(<><Circle cx="12" cy="12" r="10" fill={color}/><Path d="M7.5 12.5l3 3 6-6" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none"/></>);
    case 'checkmark': return V(<Path d="M5 12.5l4.5 4.5L19 7" {...s}/>);
    case 'checkmark.seal.fill': return V(<><Path d="M12 2l2.2 1.6 2.7-.4.8 2.6 2.6.8-.4 2.7L21 12l-1.6 2.2.4 2.7-2.6.8-.8 2.6-2.7-.4L12 22l-2.2-1.6-2.7.4-.8-2.6-2.6-.8.4-2.7L3 12l1.6-2.2-.4-2.7 2.6-.8.8-2.6 2.7.4L12 2z" fill={color}/><Path d="M8 12.5l3 3 5-6" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/></>);
    case 'plus': return V(<Path d="M12 5v14M5 12h14" {...s}/>);
    case 'plus.circle': return V(<><Circle cx="12" cy="12" r="9.5" {...s}/><Path d="M12 8v8M8 12h8" {...s}/></>);
    case 'plus.circle.fill': return V(<><Circle cx="12" cy="12" r="10" fill={color}/><Path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth={2} strokeLinecap="round"/></>);
    case 'xmark': return V(<Path d="M6 6l12 12M18 6L6 18" {...s}/>);
    case 'gearshape': return V(<><Circle cx="12" cy="12" r="3" {...s}/><Path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2L5 6 3 9.3l2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5L5 18l2.3-.9a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2L19 18l2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" {...s}/></>);
    case 'bell.fill': return V(<Path d="M12 3a6 6 0 00-6 6v3.5L4 16h16l-2-3.5V9a6 6 0 00-6-6zM10 18a2 2 0 004 0" fill={color}/>);
    case 'bell.badge.fill': return V(<><Path d="M12 3a6 6 0 00-6 6v3.5L4 16h16l-2-3.5V9a6 6 0 00-6-6zM10 18a2 2 0 004 0" fill={color}/><Circle cx="19" cy="5" r="3" fill={T.red}/></>);
    case 'envelope.fill': return V(<><Rect x="3" y="6" width="18" height="13" rx="2" fill={color}/><Path d="M3 8l9 6 9-6" stroke="#fff" strokeWidth={1.5} fill="none"/></>);
    case 'phone.fill': return V(<Path d="M5 4.5C5 3.7 5.7 3 6.5 3h2c.6 0 1.2.4 1.4 1l1 3c.2.6 0 1.3-.5 1.7L9 9.8c1 2 2.2 3.2 4.2 4.2l1.1-1.4c.4-.5 1.1-.7 1.7-.5l3 1c.6.2 1 .8 1 1.4v2c0 .8-.7 1.5-1.5 1.5C10 18 6 14 6 6.5 6 5 5 5 5 4.5z" fill={color}/>);
    case 'mappin.circle.fill': return V(<><Circle cx="12" cy="12" r="10" fill={color}/><Path d="M12 6.5c-2.2 0-4 1.8-4 4 0 2.5 4 7 4 7s4-4.5 4-7c0-2.2-1.8-4-4-4z M12 11.5a1 1 0 100-2 1 1 0 000 2z" fill="#fff"/></>);
    case 'mappin.and.ellipse': return V(<><Path d="M12 3a5 5 0 00-5 5c0 4 5 9 5 9s5-5 5-9a5 5 0 00-5-5z" {...s}/><Circle cx="12" cy="8" r="1.8" fill={color}/><Ellipse cx="12" cy="20" rx="6" ry="1.5" {...s}/></>);
    case 'person.fill': return V(<><Circle cx="12" cy="8" r="4" fill={color}/><Path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" fill={color}/></>);
    case 'building.2.fill': return V(<><Rect x="3" y="9" width="8" height="12" fill={color}/><Rect x="11" y="3" width="10" height="18" fill={color}/><Rect x="13" y="6" width="2" height="2" fill="#fff"/><Rect x="17" y="6" width="2" height="2" fill="#fff"/><Rect x="13" y="11" width="2" height="2" fill="#fff"/><Rect x="17" y="11" width="2" height="2" fill="#fff"/><Rect x="13" y="16" width="2" height="2" fill="#fff"/><Rect x="17" y="16" width="2" height="2" fill="#fff"/><Rect x="6" y="13" width="2" height="2" fill="#fff"/><Rect x="6" y="17" width="2" height="2" fill="#fff"/></>);
    case 'cart.fill': return V(<><Path d="M3 4h2l2 12h12l2-8H7" {...s}/><Circle cx="9" cy="20" r="1.5" fill={color}/><Circle cx="17" cy="20" r="1.5" fill={color}/></>);
    case 'cart': return V(<><Path d="M3 4h2l2 12h12l2-8H7" {...s}/><Circle cx="9" cy="20" r="1.5" {...s}/><Circle cx="17" cy="20" r="1.5" {...s}/></>);
    case 'target': return V(<><Circle cx="12" cy="12" r="9" {...s}/><Circle cx="12" cy="12" r="5" {...s}/><Circle cx="12" cy="12" r="1.5" fill={color}/></>);
    case 'bolt.fill': return V(<Path d="M14 2L5 14h5l-2 8 10-13h-5l1-7z" fill={color}/>);
    case 'figure.run': return V(<><Circle cx="14" cy="5" r="2" fill={color}/><Path d="M9 13l3-4 3 1 2 4 2 1M6 19l3-1 2-3" {...s}/></>);
    case 'brain.head.profile': return V(<><Path d="M10 4C6.5 4 4 7 4 10c0 1.5.5 2.5 1 3l-1 3 2.5-.5L7 18l3 .5V21h3v-3.5c1.5 0 3-.5 4-1.5l1.5 1 .5-3c.5-1 1-2 1-3.5 0-3.5-3-6.5-6.5-6.5h-3.5z" {...s}/><Circle cx="10" cy="11" r="0.8" fill={color}/></>);
    case 'heart.text.square.fill': return V(<><Rect x="3" y="3" width="18" height="18" rx="4" fill={color}/><Path d="M12 17s-4-2.5-4-6c0-1.5 1-2.5 2.5-2.5.7 0 1.2.3 1.5.7.3-.4.8-.7 1.5-.7C15 8.5 16 9.5 16 11c0 3.5-4 6-4 6z" fill="#fff"/></>);
    case 'leaf.fill': return V(<Path d="M20 4s-1 11-8 14c-4 2-8-1-8-1s.5-9 7-12c4-2 9-1 9-1z" fill={color}/>);
    case 'arrow.up.circle.fill': return V(<><Circle cx="12" cy="12" r="10" fill={color}/><Path d="M12 8v8M8 12l4-4 4 4" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none"/></>);
    case 'bookmark': return V(<Path d="M6 4h12v17l-6-4-6 4V4z" {...s}/>);
    case 'bookmark.fill': return V(<Path d="M6 4h12v17l-6-4-6 4V4z" fill={color}/>);
    case 'square.and.arrow.up': return V(<Path d="M12 3v12 M8 7l4-4 4 4 M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" {...s}/>);
    case 'ellipsis': return V(<><Circle cx="5" cy="12" r="1.6" fill={color}/><Circle cx="12" cy="12" r="1.6" fill={color}/><Circle cx="19" cy="12" r="1.6" fill={color}/></>);
    case 'lock.fill': return V(<><Rect x="5" y="10" width="14" height="11" rx="2" fill={color}/><Path d="M8 10V7a4 4 0 018 0v3" {...s}/></>);
    case 'lock': return V(<><Rect x="5" y="10" width="14" height="11" rx="2" {...s}/><Path d="M8 10V7a4 4 0 018 0v3" {...s}/></>);
    case 'doc.text': return V(<><Path d="M6 3h8l4 4v14H6V3z" {...s}/><Path d="M9 12h6 M9 15h6 M9 18h4" {...s}/></>);
    case 'doc.fill': return V(<Path d="M6 3h8l4 4v14H6V3z" fill={color}/>);
    case 'circle.fill': return V(<Circle cx="12" cy="12" r="6" fill={color}/>);
    case 'circle': return V(<Circle cx="12" cy="12" r="9" {...s}/>);
    case 'list.bullet': return V(<><Circle cx="5" cy="6" r="1" fill={color}/><Circle cx="5" cy="12" r="1" fill={color}/><Circle cx="5" cy="18" r="1" fill={color}/><Path d="M9 6h11M9 12h11M9 18h11" {...s}/></>);
    case 'map.fill': return V(<Path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" fill={color}/>);
    case 'paperplane.fill': return V(<Path d="M3 11l18-8-7 18-3-7-8-3z" fill={color}/>);
    case 'goforward.15': return V(<><Path d="M5 12a7 7 0 1014-1" {...s}/><Path d="M18 6v4h-4" {...s}/><SvgText x="12" y="16" fontSize="7" fill={color} textAnchor="middle" fontWeight="700" fontFamily={FF}>15</SvgText></>);
    case 'gobackward.15': return V(<><Path d="M19 12a7 7 0 11-3-5.7" {...s}/><Path d="M6 6v4h4" {...s}/><SvgText x="12" y="16" fontSize="7" fill={color} textAnchor="middle" fontWeight="700" fontFamily={FF}>15</SvgText></>);
    case 'pause.fill': return V(<><Rect x="6" y="4" width="4" height="16" fill={color}/><Rect x="14" y="4" width="4" height="16" fill={color}/></>);
    case 'airplayvideo': return V(<Path d="M3 5h18v12h-4 M12 14l-5 7h10l-5-7z" {...s}/>);
    case 'arrow.up.left.and.arrow.down.right': return V(<Path d="M4 4l6 6M14 14l6 6M4 4h6V4 M4 4v6 M20 20h-6 M20 20v-6" {...s}/>);
    case 'clock.fill': return V(<><Circle cx="12" cy="12" r="9" fill={color}/><Path d="M12 7v5l3 2" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" fill="none"/></>);
    case 'calendar': return V(<><Rect x="3" y="5" width="18" height="16" rx="2" {...s}/><Path d="M3 9h18 M8 3v4 M16 3v4" {...s}/></>);
    case 'graduationcap.fill': return V(<><Path d="M12 3L2 8l10 5 7-3.5V15a1 1 0 002 0V8L12 3z" fill={color}/><Path d="M6 12v3c0 2 3 4 6 4s6-2 6-4v-3" {...s}/></>);
    case 'puzzlepiece.fill': return V(<Path d="M9 3h6v3a2 2 0 004 0V9h3v6h-3a2 2 0 000 4h3v3H9a3 3 0 01-3-3v-3a2 2 0 01-4 0V9h4V6a3 3 0 013-3z" fill={color}/>);
    case 'figure.2.and.child.holdinghands': return V(<><Circle cx="7" cy="5" r="2" fill={color}/><Circle cx="17" cy="5" r="2" fill={color}/><Path d="M5 14v6h4v-6 M15 14v6h4v-6 M9 14l3-3 3 3" {...s}/></>);
    case 'flag.fill': return V(<Path d="M5 3v18M5 4h12l-2 4 2 4H5" fill={color} stroke={color} strokeLinejoin="round"/>);
    case 'tag.fill': return V(<><Path d="M3 12V4h8l10 10-8 8L3 12z" fill={color}/><Circle cx="8" cy="9" r="1.5" fill="#fff"/></>);
    case 'percent': return V(<><Path d="M6 18L18 6" {...s}/><Circle cx="8" cy="8" r="2" {...s}/><Circle cx="16" cy="16" r="2" {...s}/></>);
    case 'globe': return V(<><Circle cx="12" cy="12" r="9" {...s}/><Ellipse cx="12" cy="12" rx="4" ry="9" {...s}/><Path d="M3 12h18" {...s}/></>);
    case 'house.fill': return V(<Path d="M3 10l9-7 9 7v11h-6v-6h-6v6H3V10z" fill={color}/>);
    case 'figure.walk': return V(<><Circle cx="13" cy="5" r="2" fill={color}/><Path d="M8 15l3-5 3 2v8M11 12l-3 3-2-2" {...s}/></>);
    case 'arrow.right': return V(<Path d="M4 12h16M14 6l6 6-6 6" {...s}/>);
    default: return V(<Circle cx="12" cy="12" r="6" fill={color} opacity={0.3}/>);
  }
}

export default SF;
