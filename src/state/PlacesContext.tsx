// Places state: selected country/city, live (API) + user-added places, user reviews.
// User additions persist on-device; the selected country/city filter also
// persists across restarts. Live places come from the website API (admin
// publishes them) — there is no hardcoded seed data.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Place, Review, PlaceTag, fetchPlaces } from '../data/places';
import { loadJSON, saveJSON } from './persist';

interface SavedLoc { country: string; city: string; manual: boolean }

interface PlacesState {
  country: string;
  city: string;
  locManual: boolean;                    // user explicitly picked a city (vs auto/GPS)
  setLocation: (country: string, city: string, manual?: boolean) => void;
  places: Place[];                       // merged (live + user), with ratings
  placesLoading: boolean;
  placesError: boolean;
  reloadPlaces: () => void;
  getPlace: (id: string) => Place | undefined;
  addPlace: (p: Omit<Place, 'id' | 'reviews' | 'rating'> & { reviews?: Review[] }) => string;
  updatePlace: (id: string, patch: Partial<Place>) => void;
  addReview: (placeId: string, r: Omit<Review, 'id' | 'date'>) => void;
  favs: string[];
  isFav: (id: string) => boolean;
  toggleFav: (id: string) => void;
}

const Ctx = createContext<PlacesState | null>(null);

export function ratingOf(p: Place): number {
  if (!p.reviews.length) return 0;
  return p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length;
}

export function PlacesProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountry] = useState('kz');
  const [city, setCity] = useState('almaty');
  const [locManual, setLocManual] = useState(false);
  const manualRef = useRef(false);
  const [remotePlaces, setRemotePlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placesError, setPlacesError] = useState(false);
  const [userPlaces, setUserPlaces] = useState<Place[]>([]);
  const [userReviews, setUserReviews] = useState<Record<string, Review[]>>({});
  const [favs, setFavs] = useState<string[]>([]);

  const reloadPlaces = useCallback(() => {
    setPlacesLoading(true);
    setPlacesError(false);
    fetchPlaces()
      .then((list) => { setRemotePlaces(list); setPlacesError(false); })
      .catch(() => { setRemotePlaces([]); setPlacesError(true); })
      .finally(() => setPlacesLoading(false));
  }, []);

  useEffect(() => {
    loadJSON<Place[]>('dvg.userPlaces', []).then(setUserPlaces);
    loadJSON<Record<string, Review[]>>('dvg.placeReviews', {}).then(setUserReviews);
    loadJSON<string[]>('dvg.placeFavs', []).then(setFavs);
    loadJSON<SavedLoc | null>('dvg.placeLoc', null).then((saved) => {
      if (saved && saved.country && saved.city) {
        setCountry(saved.country);
        setCity(saved.city);
        if (saved.manual) { setLocManual(true); manualRef.current = true; }
      }
    });
    reloadPlaces();
  }, [reloadPlaces]);

  const setLocation = useCallback((c: string, ci: string, manual = false) => {
    setCountry(c);
    setCity(ci);
    const isManual = manual || manualRef.current;
    if (manual) { manualRef.current = true; setLocManual(true); }
    saveJSON('dvg.placeLoc', { country: c, city: ci, manual: isManual } as SavedLoc);
  }, []);

  const addPlace: PlacesState['addPlace'] = useCallback((p) => {
    const id = `u_${Date.now()}`;
    const place: Place = { ...p, id, reviews: p.reviews ?? [] } as Place;
    setUserPlaces((prev) => { const n = [place, ...prev]; saveJSON('dvg.userPlaces', n); return n; });
    return id;
  }, []);

  const updatePlace = useCallback((id: string, patch: Partial<Place>) => {
    setUserPlaces((prev) => { const n = prev.map((p) => (p.id === id ? { ...p, ...patch } : p)); saveJSON('dvg.userPlaces', n); return n; });
  }, []);

  const toggleFav = useCallback((id: string) => {
    setFavs((prev) => { const n = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]; saveJSON('dvg.placeFavs', n); return n; });
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
    const base = [...userPlaces, ...remotePlaces];
    return base.map((p) => ({ ...p, reviews: [...(userReviews[p.id] ?? []), ...p.reviews] }));
  }, [userPlaces, remotePlaces, userReviews]);

  const value = useMemo<PlacesState>(() => ({
    country, city, locManual, setLocation, places, placesLoading, placesError, reloadPlaces,
    getPlace: (id) => places.find((p) => p.id === id),
    addPlace, updatePlace, addReview,
    favs, isFav: (id) => favs.includes(id), toggleFav,
  }), [country, city, locManual, setLocation, places, placesLoading, placesError, reloadPlaces, addPlace, updatePlace, addReview, favs, toggleFav]);

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
