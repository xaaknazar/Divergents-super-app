# Divergents IARC and target audience - 2026-11-08

## Confirmed owner instructions

- IARC terms accepted specifically for Divergents; questionnaire completion authorized.
- Target audience: teenagers13+ and adults. Pending Console groups:13-15,16-17,18+.
- Official published catalog has no violence, sexual content, profanity or drug material, confirmed by the owner during questionnaire completion.

## Saved IARC answers

- Category: all other apps; public contact support@divergents-lms.kz.
- Restricted content in the downloaded binary: No.
- User content exchange: Yes. Primary content source is not UGC. No intentional public nudity/real-world violence content.
- Blocking: Yes (ModerationContext and author hiding).
- Reporting: Yes, supported for places via `reportPlace` and `/api/mobile/places/[id]/report`. This is NOT a claim that every report button works; see known gap below.
- Chat moderation: No. Interactions restricted to invited friends only: No.
- Online content: Yes (courses, books/materials, AI output).
- Violence, sexual content/nudity, profanity, drugs in official content: No, based on owner confirmation.
- Promotion/sale of age-restricted goods/activities: No.
- Precise location shared with others: Yes. MapHomeScreen.shareRoute can include the user's current coordinates as the route origin in a shared link. This is user-initiated sharing, not a claim of continuous public live tracking.
- Digital purchases within this Android app: No. `src/state/coursePurchases.ts` makes StoreKit available only on iOS; Android has no purchase module and CoursePurchasesContext.available is false. Reassess when Android purchases are added.
- Cash, convertible crypto/NFT rewards: No. Browser/search engine: No. Mainly educational: Yes.

## Verified result

- Google Play overview shows IARC status "Выполнен" on2026-11-08.
- IARC Generic (remaining countries, including selected Kazakhstan):3+.
- PEGI:3+. Russia/Korea:3+. ESRB/ClassInd/USK:Everyone.
- Interactive elements: user interaction, shares location.
- Certificate number is still shown as a dash; no identifier invented.
- Screenshot `/private/tmp/divergents-iarc-complete-1108.png`.
- App target-audience13+ is independent of this content rating and remains unsaved: Play displays "Заполните раздел Учетные данные" first.
- No Alpha bundle upload, review submission or rollout performed.

## Known gap

Channel and lesson-comment report actions (`ServerChannelScreen.tsx:67`, `VideoScreen.tsx:154`) show a thank-you Alert without sending a report. Local blocking exists; place reports are server-backed. The authorized project chat was notified. Do not describe reporting as complete across all UGC surfaces or moderation as proven.

## References

- Precise-location rating definition: https://support.google.com/googleplay/android-developer/answer/11069750
- Privacy identification and deletion requirements: https://support.google.com/googleplay/android-developer/answer/10144311

## Rollback / continuation

Use a new questionnaire if functionality/content changes. Complete App access, then save target age groups13-15,16-17,18+. Store credentials only in Play. Finish map configuration, corrected AAB, Android validation/screenshots and truthful data/deletion declarations before closed-test submission.
