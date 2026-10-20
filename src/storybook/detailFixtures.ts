import { BookComment, BookDetail } from '../data/books';
import { Course } from '../data/courses';
import { sampleCourse } from './courseFixtures';

// Explicit synthetic preview data, never imported into production screens.
export const demoDetailBook: BookDetail = {
  id: 'demo-book-detail', title: 'Демо · Маленькие шаги к большой цели', author: 'Автор примера',
  genres: ['Саморазвитие', 'Привычки'], description: 'Демонстрационное описание книги для проверки интерфейса.',
  rating: 4.5, ratingAvg: 4.2, ratingCount: 8, review: 'Пример редакционной рецензии, а не реальная рекомендация.',
};
export const demoBookComment: BookComment = {
  id: 'demo-review', content: 'Демонстрационная рецензия. Здесь видны длинный текст и действия автора.',
  kind: 'review', pinned: false, likes: 3, author: 'Участник примера', award: true, mine: true, date: '2026-10-01T12:00:00Z',
};
export const demoDetailCourse: Course = {
  ...sampleCourse, id: 'demo-course-detail', title: 'Демо · Развитие привычки учиться', price: 15000, source: 'live', chaptersCount: 2,
  lessons: [
    { id: 'demo-intro', n: 1, title: 'Знакомство с программой', duration: '10 мин · Видео', minutes: 10, isFree: true },
    { id: 'demo-practice', n: 2, title: 'Применяем знания в повседневной жизни', duration: '25 мин · Видео', minutes: 25, isFree: false },
  ],
};
