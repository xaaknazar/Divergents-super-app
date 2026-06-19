// Places state: selected country/city, mock + user-added places, user reviews.
// User additions persist on-device.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { PLACES, Place, Review, PlaceTag } from '../data/places';
import { loadJSON, saveJSON } from './persist';

interface PlacesState {
  country: string;
  city: string;
  setLocation: (country: string, city: string) => void;
  places: Place[];                       // merged (mock + user), with ratings
  getPlace: (id: string) => Place | undefined;
  addPlace: (p: Omit<Place, 'id' | 'reviews' | 'rating'> & { reviews?: Review[] }) => string;
  addReview: (placeId: string, r: Omit<Review, 'id' | 'date'>) => void;
}

const Ctx = createContext<PlacesState | null>(null);

export function ratingOf(p: Place): number {
  if (!p.reviews.length) return 0;
  return p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length;
}

export function PlacesProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountry] = useState('kz');
  const [city, setCity] = useState('almaty');
  const [userPlaces, setUserPlaces] = useState<Place[]>([]);
  const [userReviews, setUserReviews] = useState<Record<string, Review[]>>({});

  useEffect(() => {
    loadJSON<Place[]>('dvg.userPlaces', []).then(setUserPlaces);
    loadJSON<Record<string, Review[]>>('dvg.placeReviews', {}).then(setUserReviews);
  }, []);

  const setLocation = useCallback((c: string, ci: string) => { setCountry(c); setCity(ci); }, []);

  const addPlace: PlacesState['addPlace'] = useCallback((p) => {
    const id = `u_${Date.now()}`;
    const place: Place = { ...p, id, reviews: p.reviews ?? [] } as Place;
    setUserPlaces((prev) => { const n = [place, ...prev]; saveJSON('dvg.userPlaces', n); return n; });
    return id;
  }, []);

  const addReview = useCallback((placeId: string, r: Omit<Review, 'id' | 'date'>) => {
    const review: Review = { ...r, id: `ur_${Date.now()}`, date: 'сейчас' };
    setUserReviews((prev) => {
      const n = { ...prev, [placeId]: [review, ...(prev[placeId] ?? [])] };
      saveJSON('dvg.placeReviews', n);
      return n;
    });
  }, []);

  const places = useMemo(() => {
    const base = [...userPlaces, ...PLACES];
    return base.map((p) => ({ ...p, reviews: [...(userReviews[p.id] ?? []), ...p.reviews] }));
  }, [userPlaces, userReviews]);

  const value = useMemo<PlacesState>(() => ({
    country, city, setLocation, places,
    getPlace: (id) => places.find((p) => p.id === id),
    addPlace, addReview,
  }), [country, city, setLocation, places, addPlace, addReview]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlaces() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePlaces must be used within PlacesProvider');
  return c;
}

export function filterPlaces(places: Place[], country: string, city: string, cat: string | null, tags: PlaceTag[], q: string): Place[] {
  const ql = q.trim().toLowerCase();
  return places.filter((p) =>
    p.country === country && p.city === city &&
    (!cat || p.category === cat) &&
    tags.every((t) => p.tags.includes(t)) &&
    (!ql || p.name.toLowerCase().includes(ql) || p.highlights.toLowerCase().includes(ql))
  );
}
