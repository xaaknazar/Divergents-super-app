import type { Course } from '../data/courses';

/** Only call with the complete, successfully validated authenticated list. */
export function reconcileCourseAccess(course: Course, owned: { id: string; serverProgress?: number }[]): Course {
  const match = owned.find(item => item.id === course.id);
  if (match) {
    if (course.owned === true && (match.serverProgress == null || course.serverProgress === match.serverProgress)) return course;
    return { ...course, owned: true, ...(match.serverProgress == null ? {} : { serverProgress: match.serverProgress }) };
  }
  if (course.source !== 'live' || (course.price ?? 0) <= 0 || course.owned !== true) return course;
  return { ...course, owned: false, gifted: false, attachments: [],
    lessons: course.lessons.map(lesson => lesson.isFree ? lesson : { ...lesson, hlsUrl: null, playbackId: null }) };
}
