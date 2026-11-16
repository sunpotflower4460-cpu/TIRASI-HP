import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import sharp from "sharp";

// With npm run dev running, reproduce the default live gallery from real exports.
const output = "test-results/live-proof";
await mkdir(output, { recursive: true });
const fontfile = createRequire(import.meta.url).resolve(
  "@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff2",
);
const browser = await chromium.launch();
const page = await browser.newPage();
try {
  await page.goto("http://127.0.0.1:5173/studio");
  await page.getByRole("button", { name: /01 \/ EVENT/ }).click();
  const templates = await page.evaluate(async () => {
    const path = "/src/studio/registry.ts";
    return (await import(path)).templates.filter((template) =>
      ["80年代", "音楽"].includes(template.family),
    );
  });
  const report = [];
  for (const namesOnly of [false, true]) {
    const suffix = namesOnly ? "names-only" : "timetable";
    await page
      .getByLabel("出演時刻を表示", { exact: true })
      .setChecked(!namesOnly);
    const preview = page.locator(".studio-preview-panel");
    await preview
      .getByRole("button", { name: "PNGを生成", exact: true })
      .click();
    const save = preview.getByRole("button", {
      name: "PNGを保存",
      exact: true,
    });
    await save.waitFor({ state: "visible" });
    const download = page.waitForEvent("download");
    await save.click();
    await (await download).saveAs(`${output}/legacy-${suffix}.png`);
    const gallery = [{ id: "legacy", label: "旧版 / 生音 A4" }, ...templates];
    for (const template of templates) {
      const result = await page.evaluate(
        async ({ template, namesOnly }) => {
          const root = "/src";
          const { createDocument } = await import(`${root}/studio/document.ts`);
          const { composeScene } = await import(`${root}/studio/scene.ts`);
          const { renderScene } = await import(`${root}/studio/render.ts`);
          const { defaultEvent } = await import(`${root}/data/defaultEvent.ts`);
          const event = {
            id: "live-proof",
            eventData: defaultEvent,
            name: "live",
            updatedAt: "",
          };
          const doc = createDocument("event-flyer", event);
          doc.design.templateId = template.id;
          doc.design.paletteId = template.palette;
          doc.design.visibility.times = !namesOnly;
          const result = await renderScene(
            composeScene(doc, [event]),
            new Map(),
            2480,
            3508,
          );
          return {
            data: result.canvas.toDataURL("image/png").split(",")[1],
            errors: result.errors,
          };
        },
        { template, namesOnly },
      );
      if (result.errors.length)
        throw new Error(`${template.id}: ${result.errors.join("; ")}`);
      await writeFile(
        `${output}/${template.id}-${suffix}.png`,
        Buffer.from(result.data, "base64"),
      );
    }
    const tiles = [];
    for (const [index, template] of gallery.entries()) {
      const path = `${output}/${template.id}-${suffix}.png`;
      const metadata = await sharp(path).metadata();
      if (metadata.width !== 2480 || metadata.height !== 3508)
        throw new Error(`Unexpected size: ${path}`);
      report.push({
        template: template.id,
        mode: suffix,
        width: metadata.width,
        height: metadata.height,
      });
      tiles.push({
        input: await sharp(path).resize(300, 425).png().toBuffer(),
        left: (index % 4) * 330 + 15,
        top: Math.floor(index / 4) * 470 + 15,
      });
      tiles.push({
        input: await sharp({
          text: {
            text: template.label,
            font: "Noto Sans JP Thin Bold 14",
            fontfile,
            rgba: true,
          },
        })
          .png()
          .toBuffer(),
        left: (index % 4) * 330 + 17,
        top: Math.floor(index / 4) * 470 + 447,
      });
    }
    await sharp({
      create: { width: 1320, height: 940, channels: 3, background: "#e9e9e3" },
    })
      .composite(tiles)
      .png()
      .toFile(
        `docs/evidence/${namesOnly ? "live-names-only" : "live-designs"}.png`,
      );
  }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    `Exported ${report.length} live flyers, including both legacy variants.`,
  );
} finally {
  await browser.close();
}
