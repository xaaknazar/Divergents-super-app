// Community places & ratings ("2GIS для своих"). Divergents drop pins for cafes,
// hotels, tourism spots etc. with community-values tags; others rate & comment.
import { SFName } from '../components/SFIcon';

export type PlaceCategory =
  | 'cafe' | 'restaurant' | 'hotel' | 'guesthouse' | 'resort' | 'park' | 'gym' | 'picnic' | 'tourism';

export const CATEGORY_META: Record<PlaceCategory, { label: string; icon: SFName; color: string }> = {
  cafe:       { label: 'Кафе',        icon: 'cart.fill',        color: '#C2410C' },
  restaurant: { label: 'Ресторан',    icon: 'cart.fill',        color: '#B45309' },
  hotel:      { label: 'Отель',       icon: 'building.2.fill',  color: '#4338CA' },
  guesthouse: { label: 'Гостевой дом', icon: 'house.fill',      color: '#0E7490' },
  resort:     { label: 'База отдыха', icon: 'leaf.fill',        color: '#047857' },
  park:       { label: 'Парк',        icon: 'leaf.fill',        color: '#16A34A' },
  gym:        { label: 'Спортзал',    icon: 'figure.run',       color: '#BE123C' },
  picnic:     { label: 'Пикник',      icon: 'flame.fill',       color: '#EA580C' },
  tourism:    { label: 'Туризм',      icon: 'mappin.and.ellipse', color: '#0369A1' },
};
export const CATEGORIES = Object.keys(CATEGORY_META) as PlaceCategory[];

export type PlaceTag = 'halal' | 'no_alcohol' | 'clean' | 'kids_zone' | 'family' | 'prayer_room';
export const TAG_META: Record<PlaceTag, { label: string; icon: SFName }> = {
  halal:       { label: 'Халяль',        icon: 'checkmark.seal.fill' },
  no_alcohol:  { label: 'Без алкоголя',  icon: 'xmark' },
  clean:       { label: 'Чисто',         icon: 'sparkles' },
  kids_zone:   { label: 'Детская зона',  icon: 'figure.2.and.child.holdinghands' },
  family:      { label: 'Для семьи',     icon: 'heart.fill' },
  prayer_room: { label: 'Намазхана',     icon: 'moon.fill' },
};
export const TAGS = Object.keys(TAG_META) as PlaceTag[];

export interface Review { id: string; author: string; rating: number; text: string; date: string }

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  country: string;   // country key
  city: string;      // city key
  lat: number;
  lng: number;
  tags: PlaceTag[];
  highlights: string; // "Вкусный колд брю, тихо, есть розетки"
  hours: string;      // "09:00–23:00"
  approved: boolean;  // Divergents Approved
  addedBy: string;
  photo?: string | null;
  reviews: Review[];
}

export interface City { key: string; name: string; lat: number; lng: number }
export interface Country { key: string; name: string; cities: City[] }

export const COUNTRIES: Country[] = [
  { key: 'kz', name: 'Казахстан', cities: [
    { key: 'almaty', name: 'Алматы', lat: 43.2380, lng: 76.8829 },
    { key: 'astana', name: 'Астана', lat: 51.1605, lng: 71.4704 },
    { key: 'shymkent', name: 'Шымкент', lat: 42.3174, lng: 69.5901 },
    { key: 'oskemen', name: 'Усть-Каменогорск', lat: 49.9714, lng: 82.6059 },
  ]},
  { key: 'tr', name: 'Турция', cities: [
    { key: 'istanbul', name: 'Стамбул', lat: 41.0082, lng: 28.9784 },
  ]},
  { key: 'ae', name: 'ОАЭ', cities: [
    { key: 'dubai', name: 'Дубай', lat: 25.2048, lng: 55.2708 },
  ]},
];

export function cityCenter(country: string, city: string): City | undefined {
  return COUNTRIES.find((c) => c.key === country)?.cities.find((ci) => ci.key === city);
}
export function citiesOf(country: string): City[] {
  return COUNTRIES.find((c) => c.key === country)?.cities ?? [];
}

const rv = (id: string, author: string, rating: number, text: string, date: string): Review => ({ id, author, rating, text, date });

export const PLACES: Place[] = [
  {
    id: 'p1', name: 'Qara Brew Coffee', category: 'cafe', country: 'kz', city: 'almaty',
    lat: 43.2389, lng: 76.8897, tags: ['halal', 'no_alcohol', 'clean', 'prayer_room'],
    highlights: 'Отличный колд брю, тихо, есть розетки и зона для работы', hours: '08:00–23:00',
    approved: true, addedBy: 'Айгерим Б.', photo: null,
    reviews: [
      rv('r1', 'Дамир А.', 5, 'Кофе топ, персонал приветливый, есть намазхана рядом.', '12 июн'),
      rv('r2', 'Жанар К.', 4, 'Уютно и чисто, но днём многолюдно.', '3 июн'),
    ],
  },
  {
    id: 'p2', name: 'Халяль Plov Center', category: 'restaurant', country: 'kz', city: 'almaty',
    lat: 43.2451, lng: 76.9120, tags: ['halal', 'no_alcohol', 'family', 'kids_zone'],
    highlights: 'Настоящий плов, большие порции, детская комната', hours: '10:00–22:00',
    approved: true, addedBy: 'Команда Divergents',
    reviews: [rv('r3', 'Олжас Т.', 5, 'Семьёй ходим каждую неделю, детям нравится.', '8 июн')],
  },
  {
    id: 'p3', name: 'Кок-Тобе Парк', category: 'tourism', country: 'kz', city: 'almaty',
    lat: 43.2330, lng: 76.9760, tags: ['family', 'kids_zone', 'clean'],
    highlights: 'Виды на город, канатка, прогулки с семьёй', hours: '10:00–00:00',
    approved: false, addedBy: 'Нурлан Б.',
    reviews: [rv('r4', 'Аян Т.', 5, 'Закат отсюда — огонь. Чисто и безопасно.', '1 июн')],
  },
  {
    id: 'p4', name: 'FitZone Halal Gym', category: 'gym', country: 'kz', city: 'almaty',
    lat: 43.2200, lng: 76.8500, tags: ['no_alcohol', 'clean', 'prayer_room'],
    highlights: 'Раздельные часы, намазхана, новое оборудование', hours: '06:00–23:00',
    approved: false, addedBy: 'Санжар К.', reviews: [],
  },
  {
    id: 'p5', name: 'Family Guest House', category: 'guesthouse', country: 'kz', city: 'astana',
    lat: 51.1280, lng: 71.4300, tags: ['halal', 'family', 'no_alcohol', 'clean'],
    highlights: 'Тихий район, завтрак халяль, для семейного отдыха', hours: 'Круглосуточно',
    approved: true, addedBy: 'Команда Divergents',
    reviews: [rv('r5', 'Мадина Е.', 5, 'Чисто, спокойно, хозяева приветливые.', '20 мая')],
  },
  {
    id: 'p6', name: 'Specialty Coffee Astana', category: 'cafe', country: 'kz', city: 'astana',
    lat: 51.1700, lng: 71.4400, tags: ['no_alcohol', 'clean'],
    highlights: 'Хорошая обжарка, фильтр-кофе, спокойно по утрам', hours: '08:00–22:00',
    approved: false, addedBy: 'Ерлан С.', reviews: [],
  },
  {
    id: 'p7', name: 'Sultanahmet Halal Food', category: 'restaurant', country: 'tr', city: 'istanbul',
    lat: 41.0054, lng: 28.9768, tags: ['halal', 'no_alcohol', 'family'],
    highlights: 'Турецкая кухня, всё халяль, рядом с Голубой мечетью', hours: '09:00–23:00',
    approved: true, addedBy: 'Команда Divergents',
    reviews: [rv('r6', 'Аружан М.', 5, 'Вкусно и аутентично, удобно для туристов.', '15 апр')],
  },
];
