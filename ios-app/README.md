# TIRASI iOS app (offline)

Capacitor wrapper that bundles the built site (`../dist`) into a native iOS app.
No server, Vercel or network is needed at run time. Drafts stay in the app's own storage.

## Update the app on the iPhone
```bash
cd ios-app
npm ci
npm run sync            # builds ../dist and copies it into the Xcode project
node scripts/generate-ios-icon.mjs   # only when the icon changes
cd ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Release \
  -destination "generic/platform=iOS" -derivedDataPath /tmp/tirasi-dd \
  DEVELOPMENT_TEAM=<your Apple team id> -allowProvisioningUpdates build
xcrun devicectl device install app --device <device id> /tmp/tirasi-dd/Build/Products/Release-iphoneos/App.app
```
A free Apple ID signature expires after 7 days; reinstall to renew it.
