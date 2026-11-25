// Writes the 1024x1024 iOS app icon: the same leaf mark as the PWA icons,
// flattened onto an opaque square (iOS rounds the corners itself and rejects alpha).
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1024" height="1024">
  <rect width="64" height="64" fill="#226454"/>
  <path d="M32 14c-9 8-9 22 0 36 9-14 9-28 0-36z" fill="#f6efe0"/>
</svg>`;
await sharp(Buffer.from(svg)).resize(1024, 1024).flatten({ background: "#226454" }).removeAlpha().png().toFile(out);
const m = await sharp(out).metadata();
console.log(`${out}\n${m.width}x${m.height} channels=${m.channels} alpha=${m.hasAlpha}`);
