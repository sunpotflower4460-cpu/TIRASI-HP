// The store app's 1024x1024 icon and launch image: a flyer on a night-stage blue,
// clearly different from the personal app's green leaf. No text, no alpha.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const assets = join(dirname(fileURLToPath(import.meta.url)), "..", "ios/App/App/Assets.xcassets");
const NIGHT = "#232a57";

// A tilted sheet with a headline bar, a note and two lines, drawn on a 1024 grid.
const flyer = `
  <g transform="rotate(-8 512 512)">
    <rect x="262" y="196" width="500" height="632" rx="34" fill="#fbf6ea"/>
    <rect x="322" y="262" width="380" height="96" rx="14" fill="#e9507f"/>
    <path d="M590 420 v170 a62 52 -18 1 1 -34 -47 V462 l-110 26 v142 a62 52 -18 1 1 -34 -47 V456 z" fill="${NIGHT}"/>
    <rect x="322" y="706" width="380" height="30" rx="15" fill="#f2b544"/>
    <rect x="322" y="760" width="250" height="24" rx="12" fill="#b9b6c8"/>
  </g>`;

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${NIGHT}"/>${flyer}</svg>`;
await sharp(Buffer.from(icon)).flatten({ background: NIGHT }).removeAlpha().png()
  .toFile(join(assets, "AppIcon.appiconset/AppIcon-512@2x.png"));

const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732" width="2732" height="2732">
  <rect width="2732" height="2732" fill="${NIGHT}"/>
  <g transform="translate(1366 1366) scale(0.75) translate(-512 -512)">${flyer}</g></svg>`;
for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await sharp(Buffer.from(splash)).flatten({ background: NIGHT }).removeAlpha().png()
    .toFile(join(assets, "Splash.imageset", name));
}
console.log("store icon and launch image written to", assets);
