import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import sharp from "sharp";
import type { Measurement } from "../../src/studio/render";
import { defaultEvent } from "../../src/data/defaultEvent";
import { templates, sizes } from "../../src/studio/registry";
test("all 20 compositions × 4 sizes produce decodable PNGs with every measured text inside safe areas", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  await page.goto("/studio");
  await mkdir("test-results/matrix", { recursive: true });
  const report: {
    template: string;
    size: string;
    errors: string[];
    signature: string;
    measurements: Measurement[];
    bytes: number;
    width: number;
    height: number;
  }[] = [];
  const required = [
    defaultEvent.title,
    // The date is typeset as a display numeral ("5/9") with year and weekday
    // beside it, so check each part instead of the single source string.
    "2026",
    "5/9",
    "(土)",
    defaultEvent.startTime,
    defaultEvent.price,
    defaultEvent.venue.name,
    ...defaultEvent.schedule
      .filter((item) => item.type === "act")
      .map((item) => item.name),
  ];
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
      const measuredText = result.measurements
        .map((m: { text: string }) => m.text)
        .join("\n");
      for (const value of required) expect(measuredText).toContain(value);
      const png = Buffer.from(base64, "base64");
      expect(await sharp(png).metadata()).toMatchObject({
        width: size.width,
        height: size.height,
        format: "png",
      });
      await writeFile(`test-results/matrix/${template.id}-${sizeId}.png`, png);
    }
  // Keep exhaustive measurement/text data with the generated PNGs in the CI artifact.
  await writeFile(
    "test-results/render-matrix-full.json",
    JSON.stringify(report, null, 2),
  );
  const summary = report.map((row) => {
    const text = row.measurements
      .map((measurement) => measurement.text)
      .join("\n");
    return {
      template: row.template,
      size: row.size,
      compositionSignature: row.signature,
      width: row.width,
      height: row.height,
      pngBytes: row.bytes,
      measuredTextRuns: row.measurements.length,
      smallestFontSize: row.measurements.length
        ? Math.min(
            ...row.measurements.map((measurement) => measurement.fontSize),
          )
        : 0,
      allTextFits: row.measurements.every((measurement) => measurement.fits),
      requiredTextPresent: required.every((value) => text.includes(value)),
      errors: row.errors,
    };
  });
  await writeFile(
    "docs/evidence/render-matrix.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        renderer: `Chromium ${browser.version()} / ${process.platform}`,
        combinations: summary.length,
        fullMeasurements: "CI artifact: test-results/render-matrix-full.json",
        results: summary,
      },
      null,
      2,
    ),
  );
  expect(failures).toEqual([]);
  const fontfile = createRequire(import.meta.url).resolve(
    "@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff2",
  );
  const tiles = await Promise.all(
    templates.map(async (t, index) => ({
      input: await sharp(`test-results/matrix/${t.id}-a4.png`)
        .resize(300, 425)
        .png()
        .toBuffer(),
      left: (index % 4) * 330 + 15,
      top: Math.floor(index / 4) * 470 + 15,
    })),
  );
  const labels = await Promise.all(
    templates.map(async (template, index) => ({
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
    })),
  );
  await sharp({
    create: { width: 1320, height: 2350, channels: 3, background: "#e9e9e3" },
  })
    .composite([...tiles, ...labels])
    .png()
    .toFile("docs/evidence/template-contact-sheet.png");
});
