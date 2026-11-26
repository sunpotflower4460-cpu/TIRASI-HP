# App Store release: TIRASI ライブチラシ作成

## Prepared (in this repository)
- Listing texts, in-app purchases, review notes, age rating and privacy answers: `metadata.json`
- Screenshots 1320×2868 (6.9"): `screenshots/` ・ purchase screens for review: `review/`
  (regenerate with `scripts/store-screenshots.mjs`)
- Privacy policy and support pages: `site/` (`npm run store:site`, from `src/store/legal.json`)
- In the app: privacy policy and licence notices under Settings (`npm run store:licenses`)
- `npm run store:check` fails while anything needed for submission is missing.

## English
The app follows the device language (Japanese, otherwise English) and has a language setting.
- Listing texts and purchase names for en-US: `metadata.json` → `localizations`
- Screenshots: `screenshots-en/` (`node scripts/store-screenshots.mjs <origin> en`)
- Pages: `site/privacy-en.html`, `site/support-en.html`
- In App Store Connect the owner adds the English localization (listing and the three purchases), chooses the
  countries, and uploads a build with the English text (build 2 or later).

## Published
`site/` is served by GitHub Pages from the `gh-pages` branch (only these pages; Vercel deployments are
turned off in that branch). After editing the policy: `npm run store:site`, then update that branch.
- Support: https://sunpotflower4460-cpu.github.io/TIRASI-HP/support.html
- Privacy policy: https://sunpotflower4460-cpu.github.io/TIRASI-HP/privacy.html

## Waiting for the owner
1. Artwork: see `artwork-provenance.md` (generators and terms recorded; confirm no plate imitates an
   existing work or brand).
2. App Store Connect: bundle id and app record, paid-apps agreement with tax and banking, Small Business
   Program, the three in-app purchases, listing entry.
3. Permission to upload a build (creates a distribution certificate and profile in the developer account).
4. TestFlight purchase test on a device, then submit the version together with the three purchases.
