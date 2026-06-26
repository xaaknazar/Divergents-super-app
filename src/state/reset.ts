// Per-user data isolation: wipe every persisted user-scoped key on sign-out /
// account deletion so the next account on the same device starts clean.
//
// We intentionally KEEP device-level preferences that are not user data:
//   - dvg.onboarded   (onboarding completed — don't re-onboard)
//   - dvg.lang        (language preference)
//   - dvg.themeMode / dvg.accent / dvg.background (appearance)
import { clearKeys } from './persist';

// Every user-scoped persisted key in the app. Grep the codebase for "dvg." to
// keep this in sync when new persisted state is added.
export const USER_DATA_KEYS: string[] = [
  // LMS
  'dvg.completed',          // CourseContext — chapter completion / progress
  'dvg.enrollments',        // EnrollmentContext — owned/enrolled courses
  // Career
  'dvg.applied',            // CareerContext — applied jobs
  'dvg.saved',              // CareerContext — saved jobs
  'dvg.resume',             // useResume — local resume answers (Talentslab)
  // Notifications
  'dvg.readNotifs',         // NotificationsContext — read notification ids
  // Places / map
  'dvg.userPlaces',         // PlacesContext — user-added places
  'dvg.placeReviews',       // PlacesContext — user reviews
  'dvg.placeFavs',          // PlacesContext — favourite places
  'dvg.mapRecent',          // recent map searches
  // Community channels
  'dvg.channelJoined.v2',
  'dvg.channelRequested.v2',
  'dvg.channelApproved.v2',
  'dvg.channelPaid.v2',
  'dvg.channelSeen.v2',
  'dvg.channelLikes.v2',
  // Registration flow (анкета after sign-up) — reset for the next account
  'dvg.pendingRegistration',
];

/**
 * Delete all user-scoped persisted data. Safe to call on sign-out and on
 * account deletion. Onboarding/appearance/language preferences are preserved.
 * Individual key failures are swallowed by clearKeys.
 */
export async function clearAllAppData(): Promise<void> {
  await clearKeys(USER_DATA_KEYS);
}
