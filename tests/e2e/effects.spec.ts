import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { createRequire } from "node:module";
import { effects } from "../../src/studio/document";
test("six reproducible non-destructive effects preserve source bytes, reject invalid assets and keep all output dimensions", async ({
  page,
}) => {
  await page.goto("/studio");
  await mkdir("test-results/effects", { recursive: true });
  const image = await sharp("src/assets/posters/citypop.webp")
    .resize(500, 500)
    .png()
    .toBuffer();
  const caption = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="125"><rect width="500" height="125" fill="#fff1de"/><text x="22" y="68" font-family="serif" font-size="52" fill="#3d2545">Acoustic Live</text><text x="25" y="102" font-family="sans-serif" font-size="20" fill="#933252">2026.5/9</text></svg>',
  );
  const png = await sharp({
    create: { width: 500, height: 625, channels: 3, background: "#fff1de" },
  })
    .composite([
      { input: image, left: 0, top: 0 },
      { input: caption, left: 0, top: 500 },
    ])
    .png()
    .toBuffer();
  const output = await page.evaluate(async (base64) => {
    const base = "/src/studio";
    const { storeAsset, getAssetBlob, loadImages, sha256, validateAsset } =
      await import(`${base}/assets.ts`);
    const { createDocument, effects } = await import(`${base}/document.ts`);
    const { renderTreatment } = await import(`${base}/treatment.ts`);
    const { canvasBlob } = await import("/src/export/files.ts");
    const blob = new Blob(
      [Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))],
      { type: "image/png" },
    );
    const meta = await storeAsset(blob, "source.png");
    const images = await loadImages([meta.id]);
    const hashBefore = await sha256(await getAssetBlob(meta.id));
    const results = [];
    const encode = async (canvas: HTMLCanvasElement) => {
      const file = await canvasBlob(canvas);
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 32768)
        binary += String.fromCharCode(
          ...bytes.subarray(offset, offset + 32768),
        );
      return {
        base64: btoa(binary),
        hash: await sha256(file),
        width: canvas.width,
        height: canvas.height,
        bytes: file.size,
      };
    };
    for (const effect of effects) {
      const doc = createDocument("image-treatment");
      doc.design.sizeId = "portrait";
      doc.assetRefs = [meta.id];
      doc.content.sourceAssetId = meta.id;
      doc.content.recipe = {
        ...doc.content.recipe,
        preset: effect.id,
        intensity: 0.7,
        grain: 0.25,
        halftone: 0.4,
        registration: 0.5,
      };
      const rendered = renderTreatment(doc, images);
      const first = await encode(rendered.canvas);
      const repeat = await encode(renderTreatment(doc, images).canvas);
      results.push({
        id: effect.id,
        ...first,
        repeatedHash: repeat.hash,
        errors: rendered.errors,
      });
    }
    const doc = createDocument("image-treatment");
    doc.design.sizeId = "portrait";
    doc.assetRefs = [meta.id];
    doc.content.sourceAssetId = meta.id;
    doc.content.recipe.intensity = 0;
    const before = await encode(renderTreatment(doc, images, true).canvas);
    const disabled = await encode(renderTreatment(doc, images).canvas);
    const hashAfter = await sha256(await getAssetBlob(meta.id));
    const invalid = [];
    for (const bad of [
      new Blob(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], {
        type: "image/png",
      }),
      new Blob([new Uint8Array(8 * 1024 * 1024 + 1)], { type: "image/png" }),
    ]) {
      try {
        await validateAsset(bad);
        invalid.push(false);
      } catch {
        invalid.push(true);
      }
    }
    const header = new Uint8Array(24);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x89504e47);
    view.setUint32(4, 0x0d0a1a0a);
    view.setUint32(16, 99999);
    view.setUint32(20, 99999);
    try {
      await validateAsset(new Blob([header], { type: "image/png" }));
      invalid.push(false);
    } catch {
      invalid.push(true);
    }
    images.forEach((image: ImageBitmap) => image.close());
    return {
      results,
      hashBefore,
      hashAfter,
      before,
      disabledHash: disabled.hash,
      invalid,
    };
  }, png.toString("base64"));
  expect(output.hashBefore).toBe(output.hashAfter);
  expect(output.disabledHash).toBe(output.before.hash);
  expect(output.invalid).toEqual([true, true, true]);
  expect(new Set(output.results.map((r) => r.hash)).size).toBe(6);
  const images = [{ id: "original", ...output.before }, ...output.results];
  for (const result of output.results) {
    expect(result.hash).toBe(result.repeatedHash);
    expect(result.errors).toEqual([]);
    expect([result.width, result.height]).toEqual([1080, 1350]);
  }
  for (const result of images)
    await writeFile(
      `test-results/effects/${result.id}.png`,
      Buffer.from(result.base64, "base64"),
    );
  const tiles = await Promise.all(
    images.map(async (image, i) => ({
      input: await sharp(Buffer.from(image.base64, "base64"))
        .resize(230, 288)
        .png()
        .toBuffer(),
      left: (i % 4) * 250 + 10,
      top: Math.floor(i / 4) * 320 + 10,
    })),
  );
  const fontfile = createRequire(import.meta.url).resolve(
    "@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff2",
  );
  const labels = await Promise.all(
    images.map(async (image, i) => ({
      input: await sharp({
        text: {
          text:
            effects.find((effect) => effect.id === image.id)?.label ?? "元画像",
          font: "Noto Sans JP Thin Bold 13",
          fontfile,
          rgba: true,
        },
      })
        .png()
        .toBuffer(),
      left: (i % 4) * 250 + 12,
      top: Math.floor(i / 4) * 320 + 301,
    })),
  );
  await sharp({
    create: { width: 1000, height: 640, channels: 3, background: "#e7e8e0" },
  })
    .composite([...tiles, ...labels])
    .png()
    .toFile("docs/evidence/effect-contact-sheet.png");
});
test("long text and many biographies stay in the scene and block export; empty free documents need only a title", async ({
  page,
}) => {
  await page.goto("/studio");
  const diagnostics = await page.evaluate(async () => {
    const source = "/src";
    const { defaultEvent } = await import(`${source}/data/defaultEvent.ts`);
    const { createDocument } = await import(`${source}/studio/document.ts`);
    const { composeScene } = await import(`${source}/studio/scene.ts`);
    const { renderScene, scenePng } = await import(
      `${source}/studio/render.ts`
    );
    const event = {
      id: "boundary",
      name: "boundary",
      updatedAt: "",
      eventData: {
        ...defaultEvent,
        performers: Array.from({ length: 8 }, (_, i) => ({
          id: `p${i}`,
          name: `出演者${i}`,
          catchcopy: "紹介",
          bio: `PROFILE-${i} ` + "長文のプロフィールです。".repeat(80),
          imageUrl: "",
          linkUrl: "",
        })),
      },
    };
    const doc = createDocument("event-flyer", event);
    doc.design.templateId = "citypop";
    doc.design.visibility.performers = true;
    const scene = composeScene(doc, [event]);
    const rendered = await renderScene(scene, new Map());
    let refused = false;
    try {
      await scenePng(rendered);
    } catch {
      refused = true;
    }
    const free = createDocument("free-flyer");
    free.content = {
      title: "タイトルだけ",
      subtitle: "",
      facts: "",
      blocks: [],
    };
    const minimal = await renderScene(composeScene(free, []), new Map());
    const long = createDocument("free-flyer");
    long.content.title = "非常に長いタイトル".repeat(80);
    const overflow = await renderScene(composeScene(long, []), new Map());
    return {
      errors: rendered.errors,
      fullText: scene.nodes
        .filter((n: { kind: string }) => n.kind === "text")
        .map((n: { text: string }) => n.text)
        .join("\n"),
      refused,
      minimal: minimal.errors,
      long: overflow.errors,
    };
  });
  expect(diagnostics.errors.length).toBeGreaterThan(0);
  expect(diagnostics.fullText).toContain("PROFILE-7");
  expect(diagnostics.refused).toBe(true);
  expect(diagnostics.minimal).toEqual([]);
  expect(diagnostics.long.length).toBeGreaterThan(0);
});
