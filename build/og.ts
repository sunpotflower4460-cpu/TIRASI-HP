import sharp from "sharp";
import { createRequire } from "node:module";
import type { EventData } from "../src/types/event";
import { escapeHtml, ogSvg, publication } from "../src/domain/publication";
const require = createRequire(import.meta.url);
const fontfile = require.resolve(
  "@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff2",
);
const boldfile = require.resolve(
  "@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff2",
);
// Render Japanese with the bundled OFL font, independent of the build machine's system fonts.
export async function renderOgPng(event: EventData): Promise<Buffer> {
  const background = ogSvg(event).replace(/<text\b[^>]*>[\s\S]*?<\/text>/g, "");
  const { title } = publication(event);
  const lines = [
    {
      text: event.venue.name,
      size: 24,
      top: 85,
      color: "#226454",
      bold: false,
      height: 50,
    },
    {
      text: title,
      size: 65,
      top: 170,
      color: "#173d34",
      bold: true,
      height: 120,
    },
    {
      text: `${event.date} / ${event.startTime}`,
      size: 60,
      top: 310,
      color: "#226454",
      bold: false,
      height: 100,
    },
    {
      text: event.price,
      size: 34,
      top: 445,
      color: "#173d34",
      bold: true,
      height: 60,
    },
    {
      text: event.venue.address,
      size: 22,
      top: 525,
      color: "#173d34",
      bold: false,
      height: 50,
    },
  ];
  const overlays = await Promise.all(
    lines
      .filter((line) => line.text)
      .map(async (line) => ({
        input: await sharp({
          text: {
            text: `<span foreground="${line.color}">${escapeHtml(line.text)}</span>`,
            font: `Noto Sans JP Thin ${line.bold ? "Bold " : ""}${line.size}`,
            fontfile: line.bold ? boldfile : fontfile,
            width: 1040,
            rgba: true,
            dpi: 72,
          },
        })
          .resize({
            width: 1040,
            height: line.height,
            fit: "inside",
            withoutEnlargement: true,
          })
          .png()
          .toBuffer(),
        left: 80,
        top: line.top,
      })),
  );
  return sharp(Buffer.from(background)).composite(overlays).png().toBuffer();
}
