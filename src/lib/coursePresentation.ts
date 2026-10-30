import type { Course } from '../data/courses';
import { formatPrice } from '../data/api';

/** Display semantics only; this never grants course access or changes progress. */
export function courseAccessBadge(course: Course, showPrice?: boolean) {
  const free = course.price == null || course.price <= 0;
  const gifted = course.gifted === true;
  const priced = !free && !gifted && showPrice === true;
  return {
    icon: gifted ? 'gift.fill' : free ? 'play.circle.fill' : priced ? 'creditcard.fill' : 'lock.fill',
    label: gifted ? 'Подарок' : free ? 'Бесплатно' : priced ? formatPrice(course.price) : 'Нет доступа',
    accent: gifted || free || priced,
  };
}
