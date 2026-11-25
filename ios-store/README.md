# TIRASI ライブチラシ作成 (App Store edition)

Bundle id `jp.tirasi.livechirashi`, home-screen name ライブチラシ, iPhone only, portrait, offline.
It is built from the same source as the personal app (`ios-app/`, `jp.tirasi.hp`); both can be installed.

## What differs from the personal app
`vite --mode store` (`npm run build:store`, output `dist-store/`):
- `vite.config.ts` swaps `src/App.tsx` for `src/store/StoreApp.tsx` and `src/data/defaultEvent.ts` for
  `defaultEvent.store.ts`, and does not copy `public/` (except font licences). No venue content ships.
- Store-only UI: `src/store/` (home, editor toolbar, guide, styles) and `src/plan/` (plans and purchases).

## Plans (non-consumables, no subscription)
| Product id | Price (JPY) | Unlocks |
|---|---|---|
| (free) | 0 | 5 designs, 4 colours, A4 + square, 2 image effects |
| `jp.tirasi.livechirashi.standard` | 600 | 11 designs, 8 colours, all 4 sizes, 4 effects |
| `jp.tirasi.livechirashi.full` | 1,200 | everything |
| `jp.tirasi.livechirashi.upgrade` | 600 | standard → full (offered to standard owners only) |

The rules live in `src/plan/entitlements.ts`. A design's recommended colour is always usable with it.
Locked choices can be tried (preview is marked お試し表示); saving, sharing and printing open the plan screen.
Purchases use StoreKit 2 in the app (`ios/App/App/StoreCore.swift`, `TirasiStorePlugin.swift`); no server.

## New live flyers
A second live flyer is separate by default (own event, started from the latest entries). Settings (top right)
can change this to sharing with the latest live or asking every time. "デザイン違いを作る" always shares;
a shared flyer shows a notice and can be separated.

## Build and install
```bash
npm ci                         # repo root
cd ios-store && npm ci && npm run sync
node scripts/generate-store-icon.mjs      # only when the icon changes
cd ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Release -destination "generic/platform=iOS" \
  -derivedDataPath /tmp/tirasi-store-dd DEVELOPMENT_TEAM=<team id> -allowProvisioningUpdates build
xcrun devicectl device install app --device <device id> /tmp/tirasi-store-dd/Build/Products/Release-iphoneos/App.app
```

## Trying purchases without real money
- **From Xcode**: open `ios/App/App.xcodeproj` and press Run. The shared scheme uses `Products.storekit`,
  Apple's local test store. An app installed from the command line cannot see these test products, so its
  plan screen shows "価格を取得できません" until the products exist in App Store Connect.
- **Automated**: `cd StoreKitTests && xcodegen generate && xcodebuild test -project StoreKitTests.xcodeproj
  -scheme StoreKitTests -destination "platform=iOS Simulator,name=iPhone 17 Pro,OS=26.2"`.
  (On the iOS 26.3 simulator the StoreKit test session itself fails with `SKInternalErrorDomain 3`.)

## Submitting to the App Store
Prepared material and what only the account owner can do: [docs/appstore/README.md](../docs/appstore/README.md).
Run `npm run store:check` (repo root) before archiving.
