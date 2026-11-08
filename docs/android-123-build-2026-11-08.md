# Android 123 — candidate, not published

EAS build `2efff331-7c8b-48bb-b378-e1edd2650fd3` completed 2026-11-08T14:52:30.280Z with production-reading. Source `719dd827331d22989b9f0470ff80a006d0b9ca8d`, branch `codex/android-play-1108`: merge iOS 123 source `0d3956c2988273c7d4fa0b6f4b57fc7a9a343227`, then only Android versionCode 1 → 123. Main and iOS source not modified. Typecheck passed; shared source iOS release checks 1311 tests passed. No physical Android test.

Artifact `/Users/xaknazar/divergents-private-backups/2026-11-08/divergents-android123.aab`, 104887679 bytes.
SHA-256 `4b7db66aa2238461671a59d0500f9847c8d37d76027b9c7e09bb42002c657cb0`.

Bundletool1.18.3 validate exit0. Manifest package kz.divergents.app, versionName1.0.0/versionCode123, minSDK24/targetSDK36, debuggable=false. 108 native libraries across ABIs; all27 arm64 libraries have PT_LOAD alignment >=16384. Duplicate ZIP entries0. jarsigner verifies signature; warnings: self-signed upload certificate, no timestamp, POSIX metadata and MANIFEST.MF ordering differences for streaming JarInputStream. Archive not repacked/resigned. Upload certificate SHA-256 matches existing EAS key:
`33:2C:83:27:D1:3D:4C:B8:A8:05:7D:67:18:C7:CA:70:71:06:11:EF:85:90:B6:12:2E:87:84:FA:2E:2D:59:DC`.

## Release blockers / limitations

- Final base manifest lacks `com.google.android.geo.API_KEY`; MapHome/PlaceDetail use react-native-maps. Do not call map functional. app.config.ts reads GOOGLE_MAPS_ANDROID_KEY, but this build did not receive one.
- Existing EAS credentials showed no FCM setup; Android push delivery unverified.
- Broad READ_MEDIA_AUDIO/IMAGES/VIDEO and SYSTEM_ALERT_WINDOW exist in final manifest. Minimize or prove use before Google review. Existing media save/photo picker paths suggest broad access may be unnecessary; not changed during build.
- Background location, AccessibilityService and specialUse foreground timer require accurate declarations and actual Android verification. Reading Android differs from iOS; do not claim Live Activity/identical allowed-app selection.
- Reviewer access, IARC/age/operator/privacy/delete evidence are tracked by the Google Play console chat. No authentication bypass introduced.
- This candidate was not uploaded to Play, so versionCode123 remains available for a corrected build. No rollout, no public production.

Evidence `/private/tmp/android123-manifest.xml`, `android123-bundle-validation.log`, `android123-certificate.txt`, `android123-signature.txt`, `android123-elf-alignment.json`. EAS state `/private/tmp/divergents-android123-status.json` stays private because it contains artifact/log URLs.
