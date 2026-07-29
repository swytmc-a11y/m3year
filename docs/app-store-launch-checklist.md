# App Store / Google Play — Launch Checklist (Deferred)

Status as of 2026-07-29: **postponed by the user's decision.** The app runs
as a web deployment (miyear.site) for now; store submission work resumes once
the product is considered feature-complete — real payments (Paylink) live and
confirmed, plus any further requested changes.

This file exists so the checklist survives a context reset. Nothing below has
been executed.

## What's already true in this repo (confirmed at time of writing)

- `mobile/app.json`: `bundleIdentifier`/`package` = `com.miyar.app`, iOS
  `buildNumber: 4` (a test IPA has been built before, not submitted).
- EAS project registered: `owner: swe6mm`, `extra.eas.projectId` set.
- `mobile/eas.json` has a `production` build profile.
- In-app legal screens exist (`mobile/app/legal/privacy.tsx`,
  `mobile/app/legal/terms.tsx`) but stores require a **public web URL**, not
  an in-app screen only.
- No store screenshots or listing copy exist yet.
- Android adaptive icon assets exist; iOS 1024×1024 icon needs verification
  against Apple's exact spec (no transparency).

## 1. Developer accounts (manual, outside this repo)

| Store | Requirement | Cost | Notes |
|---|---|---|---|
| Apple App Store | Apple Developer account | $99/year | Start as **Individual**, not Organization, unless Miyar is a registered legal entity — Organization requires a D-U-N-S number and can take weeks. |
| Google Play | Play Console account | $25 one-time | New accounts sometimes need identity review. |

## 2. Product-level requirements

1. **Public privacy policy URL** — publish the existing `legal/privacy.tsx`
   content at `miyear.site/privacy` (the marketing site already exists).
2. **Data Safety / App Privacy questionnaire** — filled per-store based on
   what's actually collected (name, phone, email, photos; no location
   tracking as far as this audit found).
3. **Reviewer demo account** — Apple in particular often requires working
   login credentials since most of the app is gated behind auth.
4. **Age rating** — standard business/finance category, no special
   restrictions expected.
5. **Financial-activity framing for review** — be ready to state clearly:
   "Miyar is a listings-and-verification platform only; the deal itself
   happens off-platform; we never hold funds or give investment advice."
   (This is now also the closing line of the in-app onboarding.)

## 3. Store assets needed (not yet created)

- Screenshots per required device size (iOS: multiple; Android: phone,
  optional tablet).
- Short + long description copy in Arabic (and possibly English).
- Apple's separate 100-character Keywords field.
- App icon re-verified against each store's exact spec.
- Promotional video: optional, not required.

## 4. Build & submit (via EAS, once ready)

```
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios
eas submit --platform android
```
Then fill each store's review form (description, screenshots, privacy URL,
Data Safety) and submit for review. Typical review time: Apple 1–3 days,
Google hours–1 day for an established account (can be longer for a brand
new one).

## Priority order when this resumes

1. Developer accounts (blocks everything else).
2. Publish privacy policy at a public URL (~5 min of work).
3. Screenshots + listing copy (the largest actual prep effort).
4. Reviewer demo account.
5. EAS build + submit.
