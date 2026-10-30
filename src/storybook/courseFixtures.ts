import type { Course } from '../data/courses';

// Synthetic, local-only examples: no user data or API calls.
export const sampleCourse: Course = {
  id: 'storybook-learning', title: 'Привычки, которые помогают двигаться вперёд',
  author: 'Divergents', category: 'Саморазвитие', description: 'Учебный пример для библиотеки компонентов.',
  lessonsLabel: '12 уроков', chaptersCount: 12, lessons: [], icon: 'book.fill',
  tint: '#234088', iconColor: '#234088', price: 0,
};
export const sampleCourses: Course[] = [
  sampleCourse,
  { ...sampleCourse, id: 'storybook-focus', title: 'Управление вниманием', category: 'Продуктивность', price: 15000 },
  { ...sampleCourse, id: 'storybook-gift', title: 'Первые шаги к своей цели', gifted: true, price: 10000 },
];
