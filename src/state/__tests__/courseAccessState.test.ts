import { reconcileCourseAccess } from '../courseAccessState';
import { demoDetailCourse } from '../../storybook/detailFixtures';
const course = { ...demoDetailCourse, source: 'live' as const, price: 4000, owned: true };
test('a refunded last course drops cached ownership, private media and attachments but retains the free sample', () => {
  const result = reconcileCourseAccess(course, []);
  expect(result.owned).toBe(false); expect(result.attachments).toEqual([]);
  for (const lesson of result.lessons) {
    if (lesson.isFree) expect(lesson).toEqual(course.lessons.find(l => l.id === lesson.id));
    else { expect(lesson.playbackId).toBeNull(); expect(lesson.hlsUrl).toBeNull(); }
  }
});
test('an independent web/team grant still present in the server list retains access', () => {
  expect(reconcileCourseAccess(course, [{ id: course.id }])).toBe(course);
});
test('free and demo courses are not revoked by a purchase list', () => {
  const free = { ...course, price: 0 }, demo = { ...course, source: 'mock' as const };
  expect(reconcileCourseAccess(free, [])).toBe(free);
  expect(reconcileCourseAccess(demo, [])).toBe(demo);
});
