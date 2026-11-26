import type { CreativeDocument, Treatment } from "./document";
import { defaultPlacement } from "./document";
import { drawImageInBox } from "./render";
import { sizes } from "./registry";
import type { RenderResult } from "./render";
import { tr } from "../i18n";
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
type Color = [number, number, number];
type ColorStop = [number, Color];
const inkRamps: Partial<Record<Treatment["preset"], ColorStop[]>> = {
  photocopy: [
    [0, [20, 21, 24]],
    [95, [40, 40, 42]],
    [165, [220, 219, 213]],
    [255, [252, 250, 243]],
  ],
  risograph: [
    [0, [25, 37, 65]],
    [68, [53, 49, 82]],
    [133, [182, 65, 57]],
    [182, [233, 125, 81]],
    [255, [250, 238, 207]],
  ],
  neon: [
    [0, [13, 14, 39]],
    [68, [37, 43, 116]],
    [135, [143, 60, 174]],
    [191, [249, 129, 191]],
    [255, [249, 239, 255]],
  ],
};

function ramp(stops: ColorStop[]) {
  return Array.from({ length: 256 }, (_, level) => {
    let i = 1;
    while (stops[i][0] < level) i++;
    const [lo, a] = stops[i - 1],
      [hi, b] = stops[i];
    const t = (level - lo) / (hi - lo);
    return a.map((v, c) => v + (b[c] - v) * t);
  });
}

// Placement → tone and ink registration → screen and grain → edge falloff.
// Positions are in a 1000-unit print, regardless of the output resolution.
export function applyTreatment(canvas: HTMLCanvasElement, recipe: Treatment) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { width, height } = canvas;
  const { intensity, preset } = recipe;
  if (intensity <= 0 && !recipe.stamp) return;
  const pixels = ctx.getImageData(0, 0, width, height);
  const data = pixels.data;
  const scale = 1000 / width;
  const offset = Math.round(
    (recipe.registration * (preset === "risograph" ? 3.5 : 1.6)) / scale,
  );
  const stops = inkRamps[preset];
  const tones = stops && ramp(stops);
  const rng = seededRandom(recipe.seed);
  const grain = Float32Array.from(
    { length: 128 * 128 },
    () => rng() + rng() - 1,
  );
  const grainAmount = recipe.grain * (preset === "photocopy" ? 41 : 29);
  const screenAmount =
    recipe.halftone *
    (preset === "risograph" || preset === "photocopy" ? 77 : 32);
  const softness = Math.max(0.025, scale / 8);
  const fade = recipe.fade * 0.28;
  const warmth = recipe.warmth * 13;
  // A right-to-left pass keeps the preceding pixel available for the
  // displaced ink plate without a second full-resolution image allocation.
  for (let y = 0; y < height; y++) {
    const py = (y + 0.5) * scale;
    const grainRow = (Math.floor(py) & 127) << 7;
    const edgeY = ((y + 0.5) / height - 0.5) ** 2;
    for (let x = width - 1; x >= 0; x--) {
      const i = (y * width + x) * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const lum = (r * 54 + g * 183 + b * 19) / 256;
      const t = lum / 255;
      const mid = 4 * t * (1 - t);
      let nr: number, ng: number, nb: number;
      if (tones) {
        [nr, ng, nb] = tones[Math.round(lum)];
      } else if (preset === "fresh1985") {
        const base = (lum - 128) * 1.13 + 130;
        nr = base + (r - lum) * 1.17 + 3;
        ng = base + (g - lum) * 1.11;
        nb = base + (b - lum) * 1.08 - 4;
      } else if (preset === "aged1985") {
        const base = 35 + 199 * t;
        nr = base + 13 + (r - lum) * 0.74;
        ng = base + 3 + (g - lum) * 0.7;
        nb = base - 10 - t * 13 + (b - lum) * 0.65;
      } else {
        const shoulder = lum * 0.86 + 15 + mid * 9;
        nr = shoulder + (r - lum) * 0.95 + t * 12;
        ng = shoulder + (g - lum) * 0.92 + 4;
        nb = shoulder + (b - lum) * 0.91 + (1 - t) * 11 - t * 6;
      }
      if (offset) {
        const other = (y * width + Math.max(0, x - offset)) * 4;
        const shift =
          (data[other] - r) * (preset === "risograph" ? 0.39 : 0.16);
        nr += shift;
        nb -= shift * 0.18;
      }
      const px = (x + 0.5) * scale;
      // A rotated dot screen opens up in the highlights. Soften the edge by
      // one output pixel and keep the average density of the source tone.
      const u = (px * 0.94 + py * 0.342) / 7.2;
      const v = (py * 0.94 - px * 0.342) / 7.2;
      const dx = u - Math.floor(u) - 0.5,
        dy = v - Math.floor(v) - 0.5;
      const radius2 = 0.013 + (1 - t) * 0.23;
      const dot = Math.max(
        0,
        Math.min(1, 0.5 + (radius2 - dx * dx - dy * dy) / softness),
      );
      const screen = (Math.PI * radius2 - dot) * screenAmount * mid;
      const noise =
        grain[grainRow + (Math.floor(px) & 127)] *
        grainAmount *
        (0.32 + 0.68 * mid);
      const edge =
        (edgeY + ((x + 0.5) / width - 0.5) ** 2) * recipe.vignette * 65;
      const texture = screen + noise - edge;
      data[i] =
        r + ((nr + warmth) * (1 - fade) + 240 * fade + texture - r) * intensity;
      data[i + 1] =
        g + (ng * (1 - fade) + 226 * fade + texture - g) * intensity;
      data[i + 2] =
        b + ((nb - warmth) * (1 - fade) + 199 * fade + texture - b) * intensity;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  if (recipe.scratches > 0 && intensity > 0) {
    const rng = seededRandom(recipe.seed + 73);
    ctx.save();
    ctx.strokeStyle = "#f7eddd";
    ctx.globalAlpha = intensity * recipe.scratches * 0.24;
    ctx.lineWidth = width / 1250;
    for (let i = 0; i < Math.round(recipe.scratches * 40); i++) {
      const x = rng() * width,
        y = rng() * height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * width * 0.05, y + rng() * height * 0.15);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (recipe.stamp) {
    ctx.save();
    ctx.font = `700 ${Math.round(width / 40)}px monospace`;
    ctx.fillStyle = "#f9ba74";
    ctx.shadowColor = "#302319";
    ctx.shadowBlur = (3 * width) / 1000;
    ctx.textAlign = "right";
    ctx.fillText(recipe.stamp, width * 0.94, height * 0.94);
    ctx.restore();
  }
}
export function renderTreatment(
  doc: Extract<CreativeDocument, { kind: "image-treatment" }>,
  images: Map<string, ImageBitmap>,
  before = false,
  light = false,
  preview = false,
): RenderResult {
  const size = sizes[doc.design.sizeId];
  const factor = preview
    ? 1000 / size.width
    : light && doc.design.sizeId === "a4"
      ? 0.5
      : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(size.width * factor);
  canvas.height = Math.round(size.height * factor);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f4efe5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const errors: string[] = [];
  const id = doc.content.sourceAssetId;
  const image = id ? images.get(id) : undefined;
  if (!image)
    errors.push(
      tr("加工する画像を選択してください。PNG・JPEG・WebP、8MB・1600万画素以内に対応しています。"),
    );
  else {
    // Contain by default so an existing flyer's full text and composition are retained.
    drawImageInBox(
      ctx,
      image,
      { x: 0, y: 0, w: canvas.width, h: canvas.height },
      {
        ...defaultPlacement,
        fit: "contain",
        ...(doc.design.placements[doc.design.sizeId] ?? {}),
      },
    );
    if (!before) applyTreatment(canvas, doc.content.recipe);
  }
  return { canvas, errors, measurements: [] };
}
