import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Reproducible visual proof; diagnostic PNGs are retained even when fitting fails.
// npm run dev must be running. Files stay in the ignored test-results directory.
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => arg.replace(/^--/, "").split("=")),
);
const output = args.out ?? "test-results/design-proof";
const sizeIds = (args.sizes ?? "a4,square,story").split(",");
const fixture = args.fixture ?? "event";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
try {
  await page.goto(args.origin ?? "http://127.0.0.1:5173/studio");
  const templates = await page.evaluate(async () => {
    const path = "/src/studio/registry.ts";
    return (await import(path)).templates;
  });
  const report = [];
  for (const sizeId of sizeIds) {
    const tiles = [];
    for (const [index, template] of templates.entries()) {
      const result = await page.evaluate(
        async ({ template, sizeId, fixture }) => {
          const root = "/src";
          const { createDocument } = await import(`${root}/studio/document.ts`);
          const { composeScene } = await import(`${root}/studio/scene.ts`);
          const { renderScene } = await import(`${root}/studio/render.ts`);
          const { defaultEvent } = await import(`${root}/data/defaultEvent.ts`);
          const event = {
            id: "proof-event",
            name: "proof",
            eventData: defaultEvent,
            updatedAt: "",
          };
          const doc = createDocument(
            fixture === "free" ? "free-flyer" : "event-flyer",
            event,
          );
          if (doc.kind === "free-flyer")
            doc.content = {
              title: "週末の、よりみち。",
              subtitle: "Small discoveries, good company.",
              facts: "2026.5.9 / 11:00–18:00",
              blocks: [
                {
                  id: "body",
                  type: "text",
                  text: "お気に入りに出会う、\n小さなマーケット。\n\n手仕事の道具、季節の花、\n淹れたてのコーヒー。\nゆっくりお楽しみください。",
                  visible: true,
                },
                {
                  id: "info",
                  type: "details",
                  text: "まちのアトリエ\n群馬県館林市\n\n入場無料・雨天開催\nお問い合わせは主催者まで",
                  visible: true,
                },
              ],
            };
          doc.design.templateId = template.id;
          doc.design.paletteId = template.palette;
          doc.design.sizeId = sizeId;
          const scene = composeScene(doc, [event]);
          const rendered = await renderScene(scene, new Map());
          return {
            png: rendered.canvas.toDataURL("image/png").split(",")[1],
            errors: rendered.errors,
            measurements: rendered.measurements,
          };
        },
        { template, sizeId, fixture },
      );
      const png = Buffer.from(result.png, "base64");
      await writeFile(`${output}/${template.id}-${sizeId}.png`, png);
      report.push({
        template: template.id,
        size: sizeId,
        fixture,
        errors: result.errors,
        measurements: result.measurements,
      });
      const label = await sharp({
        text: { text: template.id, font: "sans-serif 15", rgba: true },
      })
        .png()
        .toBuffer();
      tiles.push({
        input: await sharp(png)
          .resize(300, 425, { fit: "contain", background: "#f3f3ef" })
          .png()
          .toBuffer(),
        left: (index % 4) * 330 + 15,
        top: Math.floor(index / 4) * 470 + 15,
      });
      tiles.push({
        input: label,
        left: (index % 4) * 330 + 17,
        top: Math.floor(index / 4) * 470 + 447,
      });
    }
    await sharp({
      create: { width: 1320, height: 2350, channels: 3, background: "#e9e9e3" },
    })
      .composite(tiles)
      .png()
      .toFile(`${output}/contact-${sizeId}.png`);
  }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  const failures = report.filter((row) => row.errors.length);
  console.log(
    JSON.stringify(
      {
        fixture,
        combinations: report.length,
        failures: failures.map((row) => ({
          template: row.template,
          size: row.size,
          errors: row.errors,
        })),
        output,
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
