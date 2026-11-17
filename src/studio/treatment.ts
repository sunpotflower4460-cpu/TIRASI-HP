import type { CreativeDocument, Treatment } from "./document";
import { defaultPlacement } from "./document";
import { drawImageInBox } from "./render";
import { sizes } from "./registry";
import type { RenderResult } from "./render";
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
// Fixed processing order: placement/crop → tone → halftone/registration → grain/scratches → vignette/stamp.
// All texture coordinates use the same 1000px reference plane at every export resolution.
export function applyTreatment(canvas: HTMLCanvasElement, recipe: Treatment) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { width, height } = canvas;
  const intensity = recipe.intensity;
  if (intensity <= 0 && !recipe.stamp) return;
  const pixels = ctx.getImageData(0, 0, width, height);
  const original = new Uint8ClampedArray(pixels.data);
  const data = pixels.data;
  const rand = seededRandom(recipe.seed);
  const preset = recipe.preset;
  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  const offset = Math.round(
    (recipe.registration *
      intensity *
      (preset === "risograph" ? 3 : 1.2) *
      width) /
      1000,
  );
  const cell = Math.max(3, Math.round(width / 170));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = original[i],
        g = original[i + 1],
        b = original[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      let nr = r,
        ng = g,
        nb = b;
      if (preset === "fresh1985") {
        nr = (r - 128) * 1.16 + 132;
        ng = (g - 128) * 1.08 + 128;
        nb = (b - 128) * 1.1 + 126;
      }
      if (preset === "aged1985") {
        nr = r * 0.82 + 46;
        ng = g * 0.8 + 39;
        nb = b * 0.72 + 32;
      }
      if (preset === "photocopy") {
        nr = ng = nb = clamp((lum - 128) * 2 + 128);
      }
      if (preset === "risograph") {
        const t = lum / 255;
        nr = 31 + 211 * t;
        ng = 47 + 187 * t;
        nb = 76 + 140 * t;
        const mid = Math.max(0, 1 - Math.abs(lum - 120) / 110);
        nr += mid * 95;
        ng -= mid * 20;
        nb -= mid * 30;
      }
      if (preset === "neon") {
        const t = lum / 255;
        nr = 31 + t * 224;
        ng = 23 + t * 145;
        nb = 65 + t * 175;
        if (lum < 115) {
          ng += 28;
          nb += 35;
        }
      }
      if (preset === "film") {
        nr = r * 0.91 + 18;
        ng = g * 0.94 + 12;
        nb = b * 0.86 + 13;
      }
      nr += recipe.warmth * 14;
      nb -= recipe.warmth * 12;
      const fade = recipe.fade * 0.28;
      nr = nr * (1 - fade) + 240 * fade;
      ng = ng * (1 - fade) + 226 * fade;
      nb = nb * (1 - fade) + 199 * fade;
      if (offset) {
        const other = (y * width + Math.max(0, x - offset)) * 4;
        nr = nr * 0.75 + original[other] * 0.25;
        if (preset === "risograph" && Math.abs(original[other] - r) > 10) {
          nr += 18;
          nb -= 8;
        }
      }
      const grain =
        (rand() - 0.5) * recipe.grain * (preset === "photocopy" ? 45 : 25);
      const dx = (x % cell) - cell / 2,
        dy = (y % cell) - cell / 2;
      const dots =
        dx * dx + dy * dy < (cell * 0.18) ** 2
          ? -recipe.halftone * 24
          : recipe.halftone * 2;
      const edge =
        ((x / width - 0.5) ** 2 + (y / height - 0.5) ** 2) *
        recipe.vignette *
        50;
      data[i] = clamp(
        r * (1 - intensity) + (nr + grain + dots - edge) * intensity,
      );
      data[i + 1] = clamp(
        g * (1 - intensity) + (ng + grain + dots - edge) * intensity,
      );
      data[i + 2] = clamp(
        b * (1 - intensity) + (nb + grain + dots - edge) * intensity,
      );
    }
  ctx.putImageData(pixels, 0, 0);
  if (recipe.scratches > 0 && intensity > 0) {
    const rng = seededRandom(recipe.seed + 73);
    ctx.save();
    ctx.strokeStyle = "#f7eddd";
    ctx.globalAlpha = intensity * recipe.scratches * 0.24;
    ctx.lineWidth = Math.max(1, width / 1700);
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
    ctx.shadowBlur = 3;
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
      "加工する画像を選択してください。PNG・JPEG・WebP、8MB・1600万画素以内に対応しています。",
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
