# Android 123 permission preparation - 2026-11-08

- Base: `8d535dab91b161536e463aca99864d4434bdb59c` from the completed Android build task.
- Branch: `codex/android-permissions-1108`.
- Scope: prepare a corrected closed-test Android build123. No Play upload, no public release, no iOS build or server change.

## Changes

- `android.blockedPermissions` removes READ_MEDIA_AUDIO, READ_MEDIA_IMAGES, READ_MEDIA_VIDEO and SYSTEM_ALERT_WINDOW from merged manifests, including transitive library declarations.
- `expo-media-library` granularPermissions is empty. Runtime use only exports app-created story images using requestPermissionsAsync(true) and saveToLibraryAsync.
- Image selection still uses expo-image-picker. Installed version17.0.8 requests no media-library permissions on Android13+ and uses its system picker; legacy READ/WRITE_EXTERNAL_STORAGE remain for older Android/camera compatibility. Existing iOS permission behavior is unchanged.
- No native code uses SYSTEM_ALERT_WINDOW/canDrawOverlays or application overlay windows in inspected modules/plugins. Reading foreground service and accessibility declarations are retained and still require review and device checks.

## Checks

- Expo native config introspection before/after: all four blocked permissions have tools:node=remove directives.
- Camera, microphone, foreground/background location, step counter and legacy storage permissions retained.
- iOS configuration and all generated iOS mod results are identical before/after.
- Android versionCode remains123.
- `npm run typecheck`: PASS (exit0).
- `npm run release:check`: PASS (exit0), production protocol v2 ready. First attempt could not reach the network from the restricted environment; the authorized read-only retry passed.
- `git diff --check`: PASS. No new behavior tests added for this configuration-only change; runtime/device checks remain required.
- This does not certify the corrected final AAB: a rebuild, merged final-manifest inspection, signature verification and actual Android photo-selection/story-export tests are still required.

## Remaining dependencies

- Existing restricted GOOGLE_MAPS_ANDROID_KEY is missing from the candidate. Maps remain a blocker; no substitute, unrestricted key or new billing was introduced.
- FCM remains unconfigured; Android push delivery is not promised.
- App Store Connect was inspected read-only: Divergents app6796377452, iOS1.0 preparation form has empty reviewer username/password and notes. The active mobile login is Clerk email_code with six digits; the supplied phone/four-digit method is not usable. No credentials were copied to Git or to Play.
- Console journal `codex/android-console-1108/docs/google-play-123/README.md` tracks reviewer access, audience/IARC, public legal/deletion information, Data safety and Android screenshots.

## Rollback

Revert this branch's app.config.ts change if needed before the corrected build. Do not modify or repack the already signed candidate, reset signing keys, or change the shared tester list.
