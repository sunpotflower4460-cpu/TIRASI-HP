# TIRASI iOS app (offline)

Capacitor wrapper that bundles the built site (`../dist`) into a native iOS app (`jp.tirasi.hp`, shown as 生音).
No server, Vercel or network is needed at run time. Drafts live in the app's own storage
(`Library/WebKit/jp.tirasi.hp`), separate from Safari. Take a complete backup from the Studio regularly:
iOS can remove web storage when the device is very low on space.

## How export works inside the app
`<a download>` and `window.print()` do nothing in an iOS web view, so the app uses native plugins
(`src/export/native.ts`, lazy-imported; the browser build never loads them):

| Button | What happens |
|---|---|
| 写真に保存 | PNG goes straight to Photos (`@capacitor-community/media`, add-only permission). |
| ファイルに保存 / 共有 | PNG opens the iOS share sheet (`@capacitor/filesystem` + `@capacitor/share`). |
| 印刷 / PDFとして保存 | A one-page A4 PDF is built from the rendered PNG and shared (sheet offers Print / Save to Files). |
| JSON backups | Share sheet, same as above. |

The iPhone UI is locked to light mode and portrait, like the web app's manifest.

## Update the app on the iPhone
```bash
npm ci                  # repo root: web dependencies (also used by the plugins' JS)
cd ios-app
npm ci
npm run sync            # builds ../dist and copies it, plus the plugins, into the Xcode project
node scripts/generate-ios-icon.mjs   # only when the icon or launch image changes
cd ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Release \
  -destination "generic/platform=iOS" -derivedDataPath /tmp/tirasi-dd \
  DEVELOPMENT_TEAM=<your Apple team id> -allowProvisioningUpdates build
xcrun devicectl device install app --device <device id> /tmp/tirasi-dd/Build/Products/Release-iphoneos/App.app
```
The app is signed with the paid Apple Developer team, so a build installed this way keeps running for about a
year: the provisioning profile used for the current install is valid until 2027-08-26 and the development
certificate until 2027-01-08 (check with `security cms -D -i <App.app>/embedded.mobileprovision`). Before the
earlier of those dates, run the commands above again (`-allowProvisioningUpdates` renews the certificate and
profile). Reinstalling over the existing app keeps its data; deleting the app deletes its drafts.
An App Store (or unlisted App Store) build has no such expiry.

Debugging on a device: build with `-configuration Debug`, then
`xcrun devicectl device process launch --device <id> --console jp.tirasi.hp` prints plugin calls and JS errors.
