// Per-user data isolation: wipe every persisted user-scoped key on sign-out /
// account deletion so the next account on the same device starts clean.
//
// We intentionally KEEP device-level preferences that are not user data:
//   - dvg.onboarded   (onboarding completed — don't re-onboard)
//   - dvg.lang        (language preference)
//   - dvg.themeMode / dvg.accent / dvg.background (appearance)
import { deleteAsync, documentDirectory } from 'expo-file-system/legacy';
import { clearKeys } from './persist';
import { resetDownloadsState } from './downloads';
import { resetAiChatState } from './aiChat';

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
  'dvg.resumeComplete',     // наследие обязательного гейта анкеты — чистим, чтобы не осталось мусора
  'dvg.resumePending',      // useResume — failed-submit resend flag
  'dvg.talentProfileCache.v1', // last verified Talentslab profile for offline fallback
  'dvg.gallup.order',       // Talentslab — local Gallup priority ordering
  'dvg.blockedAuthors',     // ModerationContext — blocked UGC authors
  'ai.history.v1',          // AIChatScreen — conversation history
  // Notifications
  'dvg.readNotifs',         // NotificationsContext — read notification ids
  // Places / map
  'dvg.userPlaces',         // PlacesContext — user-added places
  'dvg.placeReviews',       // PlacesContext — user reviews
  'dvg.placeFavs',          // PlacesContext — favourite places
  'dvg.placeLoc',           // PlacesContext/usePush — selected city/country
  'dvg.mapRecent',          // recent map searches
  'dvg.workouts.v1',        // ActivityContext — workout history + GPS routes
  // Community channels — членство и реакции живут на сервере, локально
  // остаётся только отметка прочитанного. Остальные ключи — от снятых версий.
  'dvg.channelJoined.v2',
  'dvg.channelRequested.v2',
  'dvg.channelApproved.v2',
  'dvg.channelPaid.v2',
  'dvg.channelLikes.v2',
  'dvg.channelSeen.v2',
  // Active challenge — today's local values and unsent automatic updates
  'dvg.challengeProgress.v1',
  'dvg.challengeProgressPending.v1',
  'dvg.challengeReminder.v1',
  'dvg.challengeReport.v1', // legacy manual-report state (pre auto-save)
  // Registration flow (анкета after sign-up) — reset for the next account
  'dvg.pendingRegistration',
  // Offline downloads — metadata registry (the .m4a files themselves are
  // deleted from disk in clearAllAppData below; keep this key in sync with
  // state/downloads.ts STORE_KEY).
  'downloads.audio.v1',
];

// Document-directory folders holding user-scoped binary files (purchased audio).
// Deleted on sign-out so the next account on a shared device can't access them.
const USER_DATA_DIRS: string[] = [
  `${documentDirectory ?? ''}downloads/`, // state/downloads.ts DIR
];

/**
 * Delete all user-scoped persisted data. Safe to call on sign-out and on
 * account deletion. Onboarding/appearance/language preferences are preserved.
 * Individual key failures are swallowed by clearKeys.
 */
export async function clearAllAppData(): Promise<void> {
  // Stop active audio downloads and clear the module-level registry first, so
  // no in-flight task can repopulate state while its files are being removed.
  await resetDownloadsState();
  // История ИИ-чата тоже живёт в модуле: без сброса в памяти следующий вошедший
  // увидел бы чужую переписку до перезапуска приложения.
  resetAiChatState();
  await clearKeys(USER_DATA_KEYS);
  // Remove downloaded audio files from disk. Idempotent; failures (e.g. folder
  // never created) are swallowed so sign-out never blocks on cleanup.
  await Promise.all(
    USER_DATA_DIRS.map((dir) => deleteAsync(dir, { idempotent: true }).catch(() => {})),
  );
}
