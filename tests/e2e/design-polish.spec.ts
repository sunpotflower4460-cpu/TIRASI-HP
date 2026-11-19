import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("recommended colors are explicit, optional, and reversible without changing content", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /02 \/ FREE/ }).click();
  await page
    .getByRole("button", { name: "デザイン: ネオンステージ", exact: true })
    .click();
  await expect(
    page.getByLabel("配色（構図と独立して変更）", { exact: true }),
  ).toHaveValue("neon");
  await expect(page.getByTestId("document-canvas").last()).toHaveAttribute(
    "data-errors",
    "0",
  );
  await page
    .getByLabel("配色（構図と独立して変更）", { exact: true })
    .selectOption("citrus");
  await page
    .getByLabel("選ぶとおすすめの配色も適用", { exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "デザイン: ボタニカル", exact: true })
    .click();
  await expect(
    page.getByLabel("配色（構図と独立して変更）", { exact: true }),
  ).toHaveValue("citrus");
  await page.getByLabel("選ぶとおすすめの配色も適用", { exact: true }).check();
  await page
    .getByRole("button", { name: "デザイン: アールデコ・ナイト", exact: true })
    .click();
  await expect(
    page.getByLabel("配色（構図と独立して変更）", { exact: true }),
  ).toHaveValue("night");
  await page.getByRole("button", { name: "取り消す", exact: true }).click();
  await expect(
    page.getByLabel("配色（構図と独立して変更）", { exact: true }),
  ).toHaveValue("citrus");
  await page.getByRole("tab", { name: "本文", exact: true }).click();
  await expect(
    page.getByLabel("チラシのタイトル", { exact: true }),
  ).toHaveValue("新しいチラシ");
});

test("all layouts keep photographs apart from event and free-flyer text in every size", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/studio");
  const report = await page.evaluate(async () => {
    const root = "/src";
    const { defaultEvent } = await import(`${root}/data/defaultEvent.ts`);
    const { createDocument } = await import(`${root}/studio/document.ts`);
    const { templates, sizes } = await import(`${root}/studio/registry.ts`);
    const { composeScene } = await import(`${root}/studio/scene.ts`);
    const { renderScene, scenePng, measureText } = await import(
      `${root}/studio/render.ts`
    );
    const source = document.createElement("canvas");
    source.width = 640;
    source.height = 960;
    const ctx = source.getContext("2d")!;
    ctx.fillStyle = "#ddd7cb";
    ctx.fillRect(0, 0, 640, 960);
    ctx.fillStyle = "#344b44";
    ctx.beginPath();
    ctx.arc(320, 450, 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c57e61";
    ctx.fillRect(180, 550, 280, 410);
    const image = await createImageBitmap(source);
    const event = {
      id: "photo-proof",
      name: "photo proof",
      updatedAt: "",
      eventData: defaultEvent,
    };
    const rows = [];
    let movedTitleBlocked = false;
    let semanticHeadline: string[] = [];
    try {
      for (const kind of ["event-flyer", "free-flyer"])
        for (const template of templates)
          for (const [sizeId, dimensions] of Object.entries(sizes) as [
            string,
            { width: number; height: number },
          ][]) {
            const doc = createDocument(kind, event);
            if (kind === "free-flyer")
              doc.content = {
                title: "まちの音楽会",
                subtitle: "Music, people & good days.",
                facts: "2026.5.9 / 14:30 / 観覧無料",
                blocks: [
                  {
                    id: "body",
                    type: "text",
                    text: "音楽のある、週末。\n\nお気に入りの一曲と、\n気軽なひとときを。",
                    visible: true,
                  },
                  {
                    id: "details",
                    type: "details",
                    text: "まちのアトリエ\n群馬県館林市\n\nお問い合わせは主催者まで",
                    visible: true,
                  },
                ],
              };
            doc.design.templateId = template.id;
            doc.design.paletteId = template.palette;
            doc.design.sizeId = sizeId;
            doc.assetRefs = ["photo-proof"];
            const scene = composeScene(doc, [event]);
            const rendered = await renderScene(
              scene,
              new Map([["photo-proof", image]]),
              dimensions.width,
              dimensions.height,
            );
            const photo = scene.nodes.find(
              (node: { kind: string }) => node.kind === "image",
            );
            const crossings = rendered.measurements.filter(
              (measurement: {
                usedBounds: { x: number; y: number; w: number; h: number };
              }) => {
                if (!photo) return false;
                const a = measurement.usedBounds;
                return (
                  Math.min(a.x + a.w, photo.x + photo.w) -
                    Math.max(a.x, photo.x) >
                    2 &&
                  Math.min(a.y + a.h, photo.y + photo.h) -
                    Math.max(a.y, photo.y) >
                    2
                );
              },
            );
            let decodedSize: number[] = [];
            if (!rendered.errors.length && !crossings.length) {
              const png = await scenePng(rendered);
              const bitmap = await createImageBitmap(png);
              decodedSize = [bitmap.width, bitmap.height];
              bitmap.close();
            }
            rows.push({
              kind,
              template: template.id,
              size: sizeId,
              expected: [dimensions.width, dimensions.height],
              decoded: decodedSize,
              errors: rendered.errors,
              crossings: crossings.map(
                (measurement: { id: string }) => measurement.id,
              ),
              imagePresent: !!photo,
            });
            rendered.canvas.width = 1;
            rendered.canvas.height = 1;
          }
      const moved = createDocument("event-flyer", event);
      moved.design.templateId = "citypop";
      moved.content.titleOverride = "生音の夜";
      moved.design.placements = {
        a4: {
          imageX: 50,
          imageY: 50,
          zoom: 1,
          opacity: 1,
          fit: "cover",
          titleX: 100,
          titleY: 0,
        },
      };
      moved.assetRefs = ["photo-proof"];
      const conflict = await renderScene(
        composeScene(moved, [event]),
        new Map([["photo-proof", image]]),
      );
      movedTitleBlocked = conflict.errors.some((error: string) =>
        error.includes("画像と文字が重なっています"),
      );
      const heading = createDocument("free-flyer");
      heading.design.templateId = "forest";
      heading.content.title = "週末の、よりみち。";
      const headingScene = composeScene(heading, []);
      const headingRender = await renderScene(headingScene, new Map());
      semanticHeadline = measureText(
        headingRender.canvas.getContext("2d"),
        headingScene.nodes.find((node: { id: string }) => node.id === "title"),
      ).lines;
    } finally {
      image.close();
    }
    return { rows, movedTitleBlocked, semanticHeadline };
  });
  await mkdir("test-results/design-polish", { recursive: true });
  await writeFile(
    "test-results/design-polish/photo-layout-report.json",
    JSON.stringify(report, null, 2),
  );
  expect(report.rows).toHaveLength(160);
  expect(
    report.rows.filter(
      (row) =>
        row.errors.length ||
        row.crossings.length ||
        !row.imagePresent ||
        JSON.stringify(row.decoded) !== JSON.stringify(row.expected),
    ),
  ).toEqual([]);
  expect(report.movedTitleBlocked).toBe(true);
  expect(report.semanticHeadline).toEqual(["週末の、", "よりみち。"]);
});

test("a print plate loads on demand, retries after a failure and takes a second ink palette", async ({
  page,
}) => {
  let fail = true;
  let requests = 0;
  await page.route(/\/posters\/citypop\.webp(?:\?|$)/, async (route) => {
    if (route.request().resourceType() !== "image") return route.continue();
    requests++;
    if (fail) return route.abort();
    return route.continue();
  });
  await page.goto("/studio");
  const render = (mode: "plain" | "photo" | "color" | "ink") =>
    page.evaluate(async (mode) => {
      const root = "/src/studio";
      const { createDocument } = await import(`${root}/document.ts`);
      const { composeScene } = await import(`${root}/scene.ts`);
      const { renderScene } = await import(`${root}/render.ts`);
      const doc = createDocument("free-flyer");
      doc.design.templateId = "citypop";
      doc.design.paletteId = mode === "ink" ? "night" : "city";
      doc.design.decorations = mode !== "plain";
      const images = new Map();
      if (mode === "photo") {
        doc.assetRefs = ["my-photo"];
        const upload = document.createElement("canvas");
        upload.getContext("2d")!.fillRect(0, 0, 300, 150);
        images.set("my-photo", upload);
      }
      try {
        const scene = composeScene(doc, []);
        const { canvas, errors } = await renderScene(scene, images, 320, 453);
        if (errors.length) return errors.join("\n");
        // This point lies in the illustration, outside the title and body.
        const pixel = canvas.getContext("2d").getImageData(268, 64, 1, 1).data;
        return Array.from(pixel);
      } catch (error) {
        return String(error);
      }
    }, mode);
  await render("plain");
  expect(await render("photo")).toEqual([0, 0, 0, 255]);
  expect(requests).toBe(0);
  expect(await render("color")).toContain("図版を読み込めません");
  fail = false;
  const color = await render("color");
  const ink = await render("ink");
  expect(color).toHaveLength(4);
  expect(ink).toHaveLength(4);
  expect(ink).not.toEqual(color);
  expect(requests).toBe(2);
});
