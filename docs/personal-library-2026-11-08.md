# Моя библиотека — 2026-11-08

Implementation is prepared locally; it has not been deployed. This is an ordinary extension of the incumbent mobile UI, not a new visual direction.

## User behavior

- Profile and the existing `MyBooks` route display «Моя библиотека». The profile entry remains available when the library is empty.
- A bottom «Добавить прочитанную книгу» action with a plus icon opens a sheet with required title and author fields. Both accept up to 180 characters. A confirmed save adds the entry to «Прочитано».
- Saving disables repeated submissions; a failed save keeps the form and shows a Russian retry message. Account changes and stale fetches cannot replace the current reader's confirmed library state.
- Manual books persist through the website API. They can move between «Прочитано» and «Читаю». Their writes do not create Reading sessions, pages, time, points, or challenge results. Existing catalog and Reading-book behavior is retained.
- The row accessibility hint now describes marking a book read without promising that every book changes Reading challenges.

## Implementation and incumbent comparison

`AddReadBookSheet` composes the existing `HalfSheet` and `Button`; `AddReadBookForm` owns its layout and composes `ReadingField` and `InlineNotice`. The screen composes these components with existing `Wrapper`, `PageHeading`, `MyBooksSection`, and `MyBookRow`. Form and sheet stories cover both themes, filled/empty fields, retry, saving, and a compact large-text form configuration; story coverage is not proof of native-device verification.

The documentation pass compared `PRODUCT.md`, `DESIGN.md`, `src/theme/tokens.ts`, the new form/sheet, existing `HalfSheet`, `ReadingField`, `Button`, and the profile/library diffs. It also opened the supplied light/dark captures. The extension inherits the active `useTheme()` palette and typography, existing rounded sheet/field/button shapes, and the incumbent Russian field hierarchy. The form adds only a 16-point gap, with no new palette or type scale.

System summary:

1. Palette: active Divergents navy/blue with semantic light/dark backgrounds and labels.
2. Type: existing Gotham Rounded theme roles; `title3` sheet header, `body` fields, `subhead` explanation, `footnote` note, `headline` action.
3. Layout: existing half-sheet, scrollable fields, safe-area footer, and screen wrappers.
4. Shape: existing rounded fields and pill actions, inherited from shared components.
5. Rules: reuse shared atoms, keep Russian labels, respect active theme and text preferences, and describe only real library effects.

`DESIGN.md`, `.impeccable/design.json`, and theme/token files are preserved. `DESIGN.md` already documents older global neutral-color/radius drift; current code confirms it (for example, `radius.action` is 999 in source while the older record says 16). This task neither repairs nor canonizes that pre-existing drift.

## Verification and limits

The implementation handoff reports 10 passing mobile tests across five suites, five passing backend tests, and passing TypeScript checks in both repositories. Backend tests use mocked storage; no migration was executed against an actual database during this task.

Evidence: `/tmp/personal-library-light.png` and `/tmp/personal-library-dark.png`. The sheet header and fields were inspected in both appearances. An existing `expo-notifications` debug warning covers part of the footer, so these captures do not establish full footer acceptance. Physical-phone behavior, keyboard interaction, and large-font behavior were not checked because the host was locked. Native HTML/CSS design detection is inapplicable and was not run.

The finish review returned **ship at its scoped verdict**: two listed fixes were resolved—empty-library profile access is unconditional, and the misleading VoiceOver promise about Reading was removed. This is not whole-app or release approval.

## Release sequence

1. Before release, back up the target database and verify migration/runtime role permissions. Validate the additive SQL on a representative database; this remains outstanding.
2. Apply backend `prisma/migrations/20261108_personal_library.sql` **before deploying the new backend**. The new GET route queries `PersonalLibraryBook`, so deploying code first can fail library reads.
3. Build/generate the backend Prisma client and deploy the backend. Verify authenticated create/list/status updates, account isolation, duplicate retry behavior, and database permissions in the target environment.
4. Release the mobile changes after the backend is available; complete the remaining native keyboard, large-text, and unobscured-footer checks.

No production changes, database migration, or deployment were performed by this documentation pass.
