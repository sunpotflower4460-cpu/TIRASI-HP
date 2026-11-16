import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { templates, sizes } from "../../src/studio/registry";
test("all 20 compositions × 4 sizes produce decodable PNGs with every measured text inside safe areas", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/studio");
  await mkdir("test-results/matrix", { recursive: true });
  const report: unknown[] = [];
  const failures: string[] = [];
  for (const template of templates)
    for (const [sizeId, size] of Object.entries(sizes)) {
      const result = await page.evaluate(
        async ({ templateId, paletteId, sizeId }) => {
          const base = "/src";
          const { defaultEvent } = await import(`${base}/data/defaultEvent.ts`);
          const { createDocument } = await import(`${base}/studio/document.ts`);
          const { composeScene } = await import(`${base}/studio/scene.ts`);
          const { renderScene, scenePng } = await import(
            `${base}/studio/render.ts`
          );
          const { sizes } = await import(`${base}/studio/registry.ts`);
          const event = {
            id: "normal-fixture",
            name: "normal",
            eventData: defaultEvent,
            updatedAt: "2026-01-01T00:00:00Z",
          };
          const doc = createDocument("event-flyer", event);
          doc.design.templateId = templateId;
          doc.design.paletteId = paletteId;
          doc.design.sizeId = sizeId;
          const scene = composeScene(doc, [event]);
          const size = sizes[sizeId];
          const rendered = await renderScene(
            scene,
            new Map(),
            size.width,
            size.height,
          );
          if (rendered.errors.length)
            return {
              errors: rendered.errors,
              signature: scene.signature,
              measurements: rendered.measurements,
              bytes: 0,
              base64: "",
              width: 0,
              height: 0,
            };
          const blob = await scenePng(rendered);
          const decoded = await createImageBitmap(blob);
          const dimensions = { width: decoded.width, height: decoded.height };
          decoded.close();
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let binary = "";
          for (let start = 0; start < bytes.length; start += 32768)
            binary += String.fromCharCode(
              ...bytes.subarray(start, start + 32768),
            );
          return {
            errors: rendered.errors,
            signature: scene.signature,
            measurements: rendered.measurements,
            bytes: blob.size,
            base64: btoa(binary),
            ...dimensions,
          };
        },
        { templateId: template.id, paletteId: template.palette, sizeId },
      );
      const { base64, ...measurement } = result;
      report.push({ template: template.id, size: sizeId, ...measurement });
      if (result.errors.length) {
        failures.push(`${template.id}/${sizeId}: ${result.errors.join(" / ")}`);
        continue;
      }
      expect(result.width).toBe(size.width);
      expect(result.height).toBe(size.height);
      expect(result.bytes).toBeGreaterThan(1000);
      expect(result.measurements.every((m: { fits: boolean }) => m.fits)).toBe(
        true,
      );
      expect(
        result.measurements.map((m: { text: string }) => m.text).join("\n"),
      ).toContain("生音");
      expect(
        result.measurements.map((m: { text: string }) => m.text).join("\n"),
      ).toContain("TATEBAYASHI PUBLIC HOUSE");
      const png = Buffer.from(base64, "base64");
      expect(await sharp(png).metadata()).toMatchObject({
        width: size.width,
        height: size.height,
        format: "png",
      });
      await writeFile(`test-results/matrix/${template.id}-${sizeId}.png`, png);
    }
  await writeFile(
    "docs/evidence/render-matrix.json",
    JSON.stringify(report, null, 2),
  );
  expect(failures).toEqual([]);
  const tiles = await Promise.all(
    templates.map(async (t, index) => ({
      input: await sharp(`test-results/matrix/${t.id}-a4.png`)
        .resize(250, 354)
        .png()
        .toBuffer(),
      left: (index % 4) * 270 + 10,
      top: Math.floor(index / 4) * 374 + 10,
    })),
  );
  await sharp({
    create: { width: 1080, height: 1870, channels: 3, background: "#e7e8e0" },
  })
    .composite(tiles)
    .png()
    .toFile("docs/evidence/template-contact-sheet.png");
});
