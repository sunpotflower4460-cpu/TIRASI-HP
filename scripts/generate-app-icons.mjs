// Generates the home-screen app icons from the same leaf mark used by the
// inline favicon, so the installed icon and the browser tab stay identical.
//
// iOS applies its own corner rounding when it writes the icon to the home
// screen, and it renders transparent pixels as black. Every icon here is
// therefore flattened onto an opaque field before it is written.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public");

const HOUSE = "#226454";
const CREAM = "#f6efe0";

const leaf = (background, foreground, scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" ${scale === 1 ? 'rx="14"' : ""} fill="${background}"/>
  <g ${scale === 1 ? "" : `transform="translate(32 32) scale(${scale}) translate(-32 -32)"`}>
    <path d="M32 14c-9 8-9 22 0 36 9-14 9-28 0-36z" fill="${foreground}"/>
  </g>
</svg>`;

const write = async (name, svg, size) => {
  const resized = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  const png = await sharp(resized).flatten({ background: HOUSE }).png().toBuffer();
  await sharp(png).toFile(join(out, name));
  const meta = await sharp(png).metadata();
  return `${name} ${meta.width}x${meta.height} ${meta.format} channels=${meta.channels}`;
};

mkdirSync(out, { recursive: true });

const results = [];
results.push(await write("apple-touch-icon.png", leaf(HOUSE, CREAM), 180));
results.push(await write("icon-192.png", leaf(HOUSE, CREAM), 192));
results.push(await write("icon-512.png", leaf(HOUSE, CREAM), 512));
// A maskable icon is cropped to a circle on some launchers, so the mark keeps
// a margin inside the safe zone and the background reaches every edge.
results.push(await write("icon-maskable-512.png", leaf(HOUSE, CREAM, 0.72), 512));

console.log(results.join("\n"));
