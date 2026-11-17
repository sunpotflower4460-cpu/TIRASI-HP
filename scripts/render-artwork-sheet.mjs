import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

// Contact sheet of every hero illustration at 360px, for visual review.
// npm run dev must be running. Usage: node scripts/render-artwork-sheet.mjs out.png [origin]
const out = process.argv[2] ?? "test-results/artwork-sheet.png";
const origin = process.argv[3] ?? "http://127.0.0.1:5173/studio";
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {},
);
const page = await browser.newPage();
try {
  await page.goto(origin);
  const data = await page.evaluate(async () => {
    const root = "/src/studio";
    const { drawArtwork } = await import(`${root}/artwork.ts`);
    const { templates, paletteById } = await import(`${root}/registry.ts`);
    const ids = templates
      .map((t) => t.id)
      .filter((id) => !["swiss", "information", "deco"].includes(id));
    const columns = 5,
      cell = 360;
    const canvas = document.createElement("canvas");
    canvas.width = columns * cell;
    canvas.height = Math.ceil(ids.length / columns) * (cell + 30);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#777";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ids.forEach((id, i) => {
      const template = templates.find((t) => t.id === id);
      const palette = paletteById(template.palette);
      const x = (i % columns) * cell,
        y = Math.floor(i / columns) * (cell + 30);
      ctx.fillStyle = palette.paper;
      ctx.fillRect(x + 5, y + 5, cell - 10, cell - 10);
      drawArtwork(ctx, {
        kind: "art",
        art: id,
        role: "hero",
        x: x + 15,
        y: y + 15,
        w: cell - 30,
        h: cell - 30,
        color: palette.accent,
        soft: palette.soft,
        ink: palette.ink,
        paper: palette.paper,
      });
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText(id, x + 10, y + cell + 20);
    });
    return canvas.toDataURL().split(",")[1];
  });
  await writeFile(out, Buffer.from(data, "base64"));
} finally {
  await browser.close();
}
