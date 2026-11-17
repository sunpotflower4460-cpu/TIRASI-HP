import { test, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { createHash } from "node:crypto";
async function fixtureImage() {
  return sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="700"><rect width="500" height="700" fill="#f6edda"/><rect x="30" y="30" width="440" height="640" fill="#e1d4b8" stroke="#173f54" stroke-width="6"/><circle cx="250" cy="270" r="145" fill="#bf466b"/><rect x="100" y="330" width="300" height="200" fill="#1c5268"/><text x="250" y="110" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="bold">KEEP ORIGINAL</text><text x="250" y="600" text-anchor="middle" font-family="sans-serif" font-size="25">1985 / LOCAL IMAGE</text></svg>',
    ),
  )
    .png()
    .toBuffer();
}
async function savedWorkspace(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const modulePath = "/src/storage/database.ts";
    const { readWorkspace } = await import(modulePath);
    return readWorkspace();
  });
}
test("free creation, all gallery choices, undo and per-size settings preserve content across reload", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /02 \/ FREE/ }).click();
  await page.getByRole("tab", { name: "本文", exact: true }).click();
  await page
    .getByLabel("チラシのタイトル", { exact: true })
    .fill("わたしの展示");
  await page
    .getByLabel("ブロック1の本文", { exact: true })
    .fill("独自の本文です。");
  await page.getByRole("button", { name: "＋ 本文ブロックを追加" }).click();
  await page
    .getByLabel("ブロック2の本文", { exact: true })
    .fill("お問い合わせはこちら。");
  await page.getByLabel("ブロック2の配置先").selectOption("details");
  await page.getByRole("tab", { name: "デザイン", exact: true }).click();
  await expect(page.getByRole("button", { name: /^デザイン:/ })).toHaveCount(
    20,
  );
  const labels = [
    "1985 ライブハウス",
    "シティポップ",
    "ネオンステージ",
    "リソグラフ",
    "アコースティック",
    "インディーギグ",
    "フェス・ラインナップ",
    "ボタニカル",
    "フォレストフォーク",
    "水彩の便り",
  ];
  for (const label of labels)
    await page
      .getByRole("button", { name: `デザイン: ${label}`, exact: true })
      .click();
  await page.getByLabel("出力サイズ", { exact: true }).selectOption("story");
  await page.getByRole("button", { name: "取り消す", exact: true }).click();
  await expect(page.getByLabel("出力サイズ", { exact: true })).toHaveValue(
    "a4",
  );
  await page.getByRole("button", { name: "やり直す", exact: true }).click();
  await expect(page.getByLabel("出力サイズ", { exact: true })).toHaveValue(
    "story",
  );
  await expect
    .poll(async () => (await savedWorkspace(page)).documents[0]?.design.sizeId)
    .toBe("story");
  await page.reload();
  await page.getByRole("tab", { name: "本文", exact: true }).click();
  await expect(
    page.getByLabel("チラシのタイトル", { exact: true }),
  ).toHaveValue("わたしの展示");
  await expect(page.getByLabel("ブロック1の本文", { exact: true })).toHaveValue(
    "独自の本文です。",
  );
  await expect(page.getByLabel("ブロック2の本文", { exact: true })).toHaveValue(
    "お問い合わせはこちら。",
  );
  await page
    .getByRole("button", { name: "下書きプレビュー", exact: true })
    .click();
  await expect(page).toHaveURL(/\/preview\/document\/[a-zA-Z0-9_-]+$/);
  await page.reload();
  await expect(page.getByTestId("document-canvas")).toHaveAttribute(
    "data-errors",
    "0",
  );
  await expect(page.getByTestId("document-canvas")).toHaveAttribute(
    "data-measurements",
    /わたしの展示/,
  );
});
test("legacy A4 is selectable beside the 20 new layouts and produces the original layout", async ({
  page,
}) => {
  await page.goto("/editor");
  await page
    .getByRole("combobox", { name: "テーマ", exact: true })
    .selectOption("night");
  await expect
    .poll(async () => (await savedWorkspace(page)).events[0].eventData.themeId)
    .toBe("night");
  await page
    .getByRole("button", { name: "チラシスタジオを開く", exact: true })
    .click();
  await page.getByRole("button", { name: /01 \/ EVENT/ }).click();
  await expect(
    page.getByRole("tab", { name: "ライブ情報", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "デザイン", exact: true }).click();
  await expect(page.getByRole("button", { name: /^デザイン:/ })).toHaveCount(8);
  await page
    .getByLabel("デザインを絞り込む", { exact: true })
    .selectOption("すべて");
  await expect(page.getByRole("button", { name: /^デザイン:/ })).toHaveCount(
    21,
  );
  await page
    .getByRole("button", { name: "デザイン: 旧版 / 生音 A4", exact: true })
    .click();
  await expect(
    page.locator(".studio-preview-panel .one-page-title-row h1"),
  ).toHaveText("生音");
  await expect(page.getByLabel("出力サイズ", { exact: true })).toHaveValue(
    "a4",
  );
  const legacyDownload = page.waitForEvent("download");
  await page
    .locator(".studio-preview-panel")
    .getByRole("button", { name: "PNGを保存", exact: true })
    .click();
  await legacyDownload;
  await page.screenshot({
    path: "docs/evidence/legacy-selected.png",
    fullPage: true,
  });
  await page
    .getByLabel("配色（構図と独立して変更）", { exact: true })
    .selectOption("spring");
  expect(
    await page
      .locator(".studio-preview-panel .one-page-note")
      .evaluate((element) => getComputedStyle(element).color),
  ).toBe("rgb(109, 96, 98)");
  for (const palette of ["spring", "summer", "autumn", "night"]) {
    await page
      .getByLabel("配色（構図と独立して変更）", { exact: true })
      .selectOption(palette);
    const pending = page.waitForEvent("download");
    await page
      .locator(".studio-preview-panel")
      .getByRole("button", { name: "PNGを保存", exact: true })
      .click();
    await (await pending).saveAs(`test-results/legacy-${palette}.png`);
    expect(
      await sharp(`test-results/legacy-${palette}.png`).metadata(),
    ).toMatchObject({ width: 2480, height: 3508 });
  }
  const legacyTiles = await Promise.all(
    ["spring", "summer", "autumn", "night"].map(async (palette, index) => ({
      input: await sharp(`test-results/legacy-${palette}.png`)
        .resize(250, 354)
        .png()
        .toBuffer(),
      left: index * 270 + 10,
      top: 10,
    })),
  );
  await sharp({
    create: { width: 1080, height: 374, channels: 3, background: "#e7e8e0" },
  })
    .composite(legacyTiles)
    .png()
    .toFile("docs/evidence/legacy-palette-contact-sheet.png");
  await page
    .getByLabel("配色（構図と独立して変更）", { exact: true })
    .selectOption("summer");
  await page
    .getByRole("button", { name: "デザイン: シティポップ", exact: true })
    .click();
  await expect(page.getByTestId("document-canvas")).toHaveAttribute(
    "data-errors",
    "0",
  );
});
test("image placement survives size switching and a template change protects the old document", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.evaluate(() => {
    const calls: { width: number | null; height: number | null }[] = [];
    Object.defineProperty(window, "__tirasiDecodeCalls", { get: () => calls });
    window.createImageBitmap = new Proxy(window.createImageBitmap, {
      apply(target, thisArg, args) {
        calls.push({
          width: args[1]?.resizeWidth ?? null,
          height: args[1]?.resizeHeight ?? null,
        });
        return Reflect.apply(target, thisArg, args);
      },
    });
  });
  await page.getByRole("button", { name: /02 \/ FREE/ }).click();
  await page.getByRole("tab", { name: "画像・配置", exact: true }).click();
  await page.getByLabel("チラシの画像ファイル").setInputFiles({
    name: "poster.png",
    mimeType: "image/png",
    buffer: await sharp(await fixtureImage())
      .resize(4000, 4000)
      .png()
      .toBuffer(),
  });
  await expect(
    page.getByText("「poster.png」をこのブラウザに保存しました", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByText("画像・タイトルの配置を調整", { exact: true }).click();
  await page.getByRole("slider", { name: /画像の左右位置/ }).focus();
  for (let i = 0; i < 15; i++)
    await page
      .getByRole("slider", { name: /画像の左右位置/ })
      .press("ArrowLeft");
  await page.getByRole("tab", { name: "デザイン", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Reflect.get(window, "__tirasiDecodeCalls").filter(
            (call: { width: number; height: number }) =>
              call.width === 256 && call.height === 256,
          ).length,
      ),
    )
    .toBe(1);
  const decodes = await page.evaluate(
    () =>
      Reflect.get(window, "__tirasiDecodeCalls") as {
        width: number | null;
        height: number | null;
      }[],
  );
  expect(
    decodes.filter((call) => call.width === 1000 && call.height === 1000),
  ).toHaveLength(1);
  expect(decodes.filter((call) => call.width === null)).toHaveLength(1);
  await page.getByLabel("出力サイズ", { exact: true }).selectOption("story");
  await page.getByLabel("出力サイズ", { exact: true }).selectOption("a4");
  await page
    .getByRole("button", { name: "デザイン: ボタニカル", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "配置変更の確認" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "新しいコピーに構図を適用", exact: true })
    .click();
  await expect
    .poll(async () => (await savedWorkspace(page)).documents.length)
    .toBe(2);
  const workspace = await savedWorkspace(page);
  expect(workspace.documents[0].design.placements.a4.imageX).toBe(35);
  expect(workspace.documents[1].content).toEqual(
    workspace.documents[0].content,
  );
  expect(workspace.documents[1].assetRefs).toEqual(
    workspace.documents[0].assetRefs,
  );
  expect(workspace.documents[0].design.templateId).toBe("gallery");
});
test("original image plus treatment recipe can be backed up and restored in a fresh browser context", async ({
  page,
  browser,
}) => {
  await mkdir("test-results", { recursive: true });
  const original = await fixtureImage();
  await page.goto("/studio");
  await page.getByRole("button", { name: /03 \/ RETOUCH/ }).click();
  await page.getByLabel("チラシの画像ファイル").setInputFiles({
    name: "original.png",
    mimeType: "image/png",
    buffer: original,
  });
  await expect(page.getByTestId("document-canvas")).toHaveAttribute(
    "data-errors",
    "0",
  );
  await page.getByRole("button", { name: /リソグラフ2色刷り/ }).click();
  await page
    .getByRole("checkbox", { name: "元画像と比較する", exact: true })
    .check();
  await page.getByText("印刷・フィルムの細かな調整", { exact: true }).click();
  await page
    .getByLabel("日付スタンプ（任意の演出・空欄は非表示）")
    .fill("1985.11.16");
  await expect
    .poll(
      async () =>
        (await savedWorkspace(page)).documents[0]?.content?.recipe?.stamp,
    )
    .toBe("1985.11.16");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "画像入り完全バックアップ", exact: true })
    .click();
  await (await download).saveAs("test-results/complete-backup.json");
  const backed = JSON.parse(
    await readFile("test-results/complete-backup.json", "utf8"),
  );
  expect(backed.assets).toHaveLength(1);
  expect(Buffer.from(backed.assets[0].data, "base64")).toEqual(original);
  const context = await browser.newContext();
  const restored = await context.newPage();
  await restored.goto("/studio");
  await restored
    .getByLabel("完全バックアップファイル")
    .setInputFiles("test-results/complete-backup.json");
  await expect(
    restored.getByRole("button", {
      name: "確認した内容で復元する",
      exact: true,
    }),
  ).toBeVisible();
  await restored
    .getByRole("button", { name: "確認した内容で復元する", exact: true })
    .click();
  await expect(restored.getByTestId("document-canvas")).toHaveAttribute(
    "data-errors",
    "0",
  );
  const state = await savedWorkspace(restored);
  expect(state.documents[0].content.recipe.preset).toBe("risograph");
  expect(state.documents[0]?.content?.recipe?.stamp).toBe("1985.11.16");
  const hash = await restored.evaluate(async (id) => {
    const a = "/src/studio/assets.ts";
    const { getAssetBlob, sha256 } = await import(a);
    return sha256(await getAssetBlob(id));
  }, state.documents[0].assetRefs[0]);
  expect(hash).toBe(createHash("sha256").update(original).digest("hex"));
  await restored.reload();
  await expect(restored.getByTestId("document-canvas")).toHaveAttribute(
    "data-errors",
    "0",
  );
  await restored.getByRole("tab", { name: "画像・加工", exact: true }).click();
  await restored.screenshot({
    path: "docs/evidence/treatment-restored.png",
    fullPage: true,
  });
  // Restoring the exact same source hash refreshes a previously missing preview without a page reload.
  await restored.evaluate(async (id) => {
    const modulePath = "/src/storage/database.ts";
    const { openDatabase, completed } = await import(modulePath);
    const db = await openDatabase();
    const tx = db.transaction("assets", "readwrite");
    const done = completed(tx);
    tx.objectStore("assets").delete(id);
    await done;
  }, state.documents[0].assetRefs[0]);
  await restored.reload();
  await expect(
    restored.getByText("元画像が見つかりません", { exact: false }).first(),
  ).toBeVisible();
  await restored.getByRole("tab", { name: "画像・加工", exact: true }).click();
  await restored.getByLabel("チラシの画像ファイル").setInputFiles({
    name: "original.png",
    mimeType: "image/png",
    buffer: original,
  });
  await expect(restored.getByTestId("document-canvas")).toHaveAttribute(
    "data-errors",
    "0",
  );
  // A broken package must be rejected before replacing the workspace.
  backed.assets[0].hash = "0".repeat(64);
  await restored.getByLabel("完全バックアップファイル").setInputFiles({
    name: "tampered.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backed)),
  });
  await expect(
    restored.getByText("素材の整合性チェックに失敗しました。", {
      exact: false,
    }),
  ).toBeVisible();
  expect((await savedWorkspace(restored)).documents[0].id).toBe(
    state.documents[0].id,
  );
  await context.close();
});
test("mobile studio fits the viewport and exports a custom free flyer as A4 PNG and one page PDF", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio");
  await page.getByRole("button", { name: /02 \/ FREE/ }).click();
  await page.getByRole("tab", { name: "本文", exact: true }).click();
  await page
    .getByLabel("チラシのタイトル", { exact: true })
    .fill("小さな作品展");
  await expect(page.getByTestId("document-canvas")).toHaveAttribute(
    "data-errors",
    "0",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNGを保存", exact: true }).click();
  await (await download).saveAs("test-results/free-a4.png");
  expect(await sharp("test-results/free-a4.png").metadata()).toMatchObject({
    width: 2480,
    height: 3508,
  });
  await page.screenshot({
    path: "docs/evidence/studio-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "印刷 / PDFとして保存", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByTestId("document-canvas")
        .evaluate((canvas: HTMLCanvasElement) => canvas.width),
    )
    .toBe(2480);
  const printRaster = await page
    .getByTestId("document-canvas")
    .evaluate(
      (canvas: HTMLCanvasElement) =>
        canvas.toDataURL("image/png").split(",")[1],
    );
  const exportedPixels = await sharp("test-results/free-a4.png")
    .raw()
    .toBuffer();
  const printedPixels = await sharp(Buffer.from(printRaster, "base64"))
    .raw()
    .toBuffer();
  expect(printedPixels.equals(exportedPixels)).toBe(true);
  const pdf = await page.pdf({
    preferCSSPageSize: true,
    printBackground: true,
  });
  await writeFile("test-results/studio-a4.pdf", pdf);
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
});
test("frozen event content stays consistent between the editor and rendered flyer after its source changes", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /01 \/ EVENT/ }).click();
  await page.getByRole("tab", { name: "デザイン", exact: true }).click();
  await page
    .getByRole("button", { name: "デザイン: シティポップ", exact: true })
    .click();
  await page.getByRole("tab", { name: "本文", exact: true }).click();
  await page
    .getByLabel("イベントとの反映方法", { exact: true })
    .selectOption("snapshot");
  await page
    .getByRole("button", { name: "イベント自体を編集", exact: true })
    .click();
  await page.getByLabel("イベント名", { exact: true }).fill("変更後のイベント");
  await page
    .getByRole("button", { name: "チラシスタジオを開く", exact: true })
    .click();
  await page.getByRole("tab", { name: "本文", exact: true }).click();
  await expect(
    page.getByLabel("このチラシだけのタイトル", { exact: true }),
  ).toHaveValue("生音");
  await expect(page.getByTestId("document-canvas")).toHaveAttribute(
    "data-measurements",
    /生音/,
  );
  await page
    .getByLabel("このチラシだけのタイトル", { exact: true })
    .fill("紙面だけの名前");
  await page.getByRole("button", { name: "取り消す", exact: true }).click();
  await expect(
    page.getByLabel("このチラシだけのタイトル", { exact: true }),
  ).toHaveValue("生音");
  await expect
    .poll(async () => (await savedWorkspace(page)).events[0].eventData.title)
    .toBe("変更後のイベント");
});
test("restoring a deleted document clears deletion undo and remains saveable", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /02 \/ FREE/ }).click();
  await expect
    .poll(async () => (await savedWorkspace(page)).documents.length)
    .toBe(1);
  const first = (await savedWorkspace(page)).documents[0];
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "画像入り完全バックアップ", exact: true })
    .click();
  await (await pending).saveAs("test-results/deleted-document-backup.json");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "削除を取り消す", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("完全バックアップファイル")
    .setInputFiles("test-results/deleted-document-backup.json");
  await page
    .getByRole("button", { name: "確認した内容で復元する", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "削除を取り消す", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(async () => (await savedWorkspace(page)).documents.length)
    .toBe(1);
  expect((await savedWorkspace(page)).documents[0].id).toBe(first.id);
  await page.getByRole("tab", { name: "本文", exact: true }).click();
  await page
    .getByLabel("チラシのタイトル", { exact: true })
    .fill("復元後も保存できます");
  await expect
    .poll(async () => (await savedWorkspace(page)).documents[0].content.title)
    .toBe("復元後も保存できます");
});
