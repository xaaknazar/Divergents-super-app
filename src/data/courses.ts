// LMS data types. Real course content is fetched live from the Divergents
// website API (see ../data/api.ts → fetchCatalog / fetchCourseDetail /
// fetchMyCourses). This module intentionally contains NO hardcoded course
// content: the admin publishes courses server-side and every user sees the
// same live catalog. When the API is unreachable or empty the UI renders a
// proper empty/error state instead of fake placeholder data.
import { SFName } from '../components/SFIcon';

export interface Lesson {
  id: string;
  n: number;
  title: string;
  duration: string; // e.g. "26 мин · Видео"
  minutes: number;
  // Populated for live courses fetched from the website API:
  isFree?: boolean;
  playbackId?: string | null;
  hlsUrl?: string | null;
  description?: string | null;
}

export interface Course {
  id: string;
  title: string;
  author: string;
  level?: string;
  durationLabel?: string;
  lessonsLabel: string;
  rating?: string;
  students?: string;
  match?: number;          // % fit to the user's profile
  icon: SFName;
  tint: string;
  iconColor: string;
  category: string;
  description: string;
  lessons: Lesson[];
  // Live-data fields (from the website API):
  imageUrl?: string | null;   // UploadThing cover URL
  price?: number | null;      // course price in ₸; 0/null = free
  chaptersCount?: number;     // published chapters count
  source?: 'live' | 'mock';
  serverProgress?: number; // 0..100 from the website (owned courses)
  attachments?: { id: string; name: string; url: string }[];
}
