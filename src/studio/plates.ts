/// <reference types="vite/client" />
import { templateById, type ModernTemplateId, type Palette } from "./registry";
import { withTimeout } from "../export/files";
import { tr } from "../i18n";

// Vite fingerprints the local WebPs. Looking up a URL does not fetch the plate.
const urls = import.meta.glob<string>("../assets/posters/*.webp", {
  eager: true,
  import: "default",
  query: "?url",
});
const originals = new Map<string, Promise<HTMLImageElement>>();
const impressions = new Map<
  string,
  { palette: string; canvas: HTMLCanvasElement }
>();

const rgb = (hex: string) =>
  [1, 3, 5].map((pos) => parseInt(hex.slice(pos, pos + 2), 16));
const luminance = ([r, g, b]: number[]) => (r * 54 + g * 183 + b * 19) / 256;

// Print a two-ink edition when the author picks another palette. Keep the
// transparent ink density of botanical plates, including on dark stock.
function reink(
  image: HTMLImageElement,
  id: ModernTemplateId,
  palette: Palette,
) {
  const cached = impressions.get(id);
  if (cached?.palette === palette.id) return cached.canvas;
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const paper = rgb(palette.paper),
    ink = rgb(palette.ink),
    accent = rgb(palette.accent);
  const transparent = ["botanical", "watercolor", "serif"].includes(id);
  const lightStock = luminance(paper) > luminance(ink);
  const stops = transparent
    ? [ink, accent, accent]
    : lightStock
      ? [ink, accent, paper]
      : [paper, accent, ink];
  const tones = Array.from({ length: 256 }, (_, luma) => {
    const pos = (luma / 255) * 2;
    const i = Math.min(1, Math.floor(pos));
    return stops[i].map(
      (channel, k) => channel + (stops[i + 1][k] - channel) * (pos - i),
    );
  });
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    const tone =
      tones[(data[i] * 54 + data[i + 1] * 183 + data[i + 2] * 19) >> 8];
    data[i] = tone[0];
    data[i + 1] = tone[1];
    data[i + 2] = tone[2];
  }
  ctx.putImageData(pixels, 0, 0);
  impressions.set(id, { palette: palette.id, canvas });
  return canvas;
}

export async function loadPlate(id: ModernTemplateId, palette: Palette) {
  if (["washi", "deco", "swiss", "information"].includes(id)) return;
  let pending = originals.get(id);
  if (!pending) {
    const image = new Image();
    image.src = urls[`../assets/posters/${id}.webp`];
    pending = withTimeout(image.decode())
      .then(() => image)
      .catch(() => {
        originals.delete(id);
        throw new Error(
          tr("チラシの図版を読み込めません。再読み込みするか、装飾を外してください。"),
        );
      });
    originals.set(id, pending);
  }
  const image = await pending;
  return palette.id === templateById(id).palette
    ? image
    : reink(image, id, palette);
}
