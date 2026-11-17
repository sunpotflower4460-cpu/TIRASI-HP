import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

async function saved(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const path = "/src/storage/database.ts";
    return (await import(path)).readWorkspace();
  });
}
test("a live flyer starts ready to edit, copies the next edition independently and prints without reentering fixed information", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /01 \/ EVENT/ }).click();
  await expect(
    page.getByRole("tab", { name: "ライブ情報", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.locator(".studio-preview-panel .one-page-title-row h1"),
  ).toHaveText("生音");
  await expect(page.getByLabel("ライブタイトル", { exact: true })).toHaveValue(
    "生音",
  );
  await page.getByLabel("ライブタイトル", { exact: true }).fill("生音ライブ");
  await page.getByLabel("出演者1の名前", { exact: true }).fill("星のひと");
  await expect(
    page.locator(".studio-preview-panel .one-page-schedule-row strong").first(),
  ).toHaveText("星のひと");
  await page.getByLabel("出演時刻を表示", { exact: true }).uncheck();
  await expect(
    page.locator(".studio-preview-panel .one-page-time"),
  ).toHaveCount(0);
  await expect(
    page.locator(".studio-preview-panel .one-page-schedule-row"),
  ).toHaveCount(7);
  await page.getByRole("button", { name: "取り消す", exact: true }).click();
  await expect(
    page.getByLabel("出演時刻を表示", { exact: true }),
  ).toBeChecked();
  await page.getByText("出演時刻をまとめて設定する", { exact: true }).click();
  await page
    .getByRole("button", { name: "この時間で割り当てる", exact: true })
    .click();
  await expect(page.getByLabel("出演者3の時間", { exact: true })).toHaveValue(
    "15:30-15:50",
  );
  await page.getByRole("button", { name: "取り消す", exact: true }).click();
  await expect(page.getByLabel("出演者3の時間", { exact: true })).toHaveValue(
    "15:30-15:55",
  );
  await expect
    .poll(async () => (await saved(page)).events[0].eventData.title)
    .toBe("生音ライブ");
  const before = await saved(page);
  await page.getByRole("button", { name: "次回分を作る", exact: true }).click();
  await expect(
    page.getByLabel("次回の回数・vol.", { exact: true }),
  ).toHaveValue("vol.7");
  await expect(page.getByLabel("次回の開催日", { exact: true })).toHaveValue(
    "",
  );
  await page.getByLabel("次回の開催日", { exact: true }).fill("2026-06-13");
  await page
    .getByRole("button", { name: "引き継いで作成", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("回数・vol.", { exact: true })).toHaveValue(
    "vol.7",
  );
  await expect(page.getByLabel("出演者1の名前", { exact: true })).toHaveValue(
    "星のひと",
  );
  await page.getByLabel("出演者2の名前", { exact: true }).fill("月のひと");
  await expect.poll(async () => (await saved(page)).events.length).toBe(2);
  await expect
    .poll(async () => (await saved(page)).events[1].eventData.schedule[1].name)
    .toBe("月のひと");
  const next = await saved(page);
  expect(next.events[0]).toEqual(before.events[0]);
  expect(next.documents[0]).toEqual(before.documents[0]);
  expect(next.events[1].eventData.venue).toEqual(
    before.events[0].eventData.venue,
  );
  expect(next.events[1].eventData).toMatchObject({
    date: "2026.6/13",
    day: "土",
    volume: "vol.7",
  });
  expect(next.documents[1].design).toEqual(before.documents[0].design);
  await page.reload();
  await expect(page.getByLabel("出演者2の名前", { exact: true })).toHaveValue(
    "月のひと",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/evidence/live-editor-desktop.png",
    fullPage: true,
  });
  const pending = page.waitForEvent("download");
  await page
    .locator(".studio-preview-panel")
    .getByRole("button", { name: "PNGを保存", exact: true })
    .click();
  const image = await pending;
  await image.saveAs("test-results/next-live.png");
  expect(await sharp("test-results/next-live.png").metadata()).toMatchObject({
    width: 2480,
    height: 3508,
  });
  await page
    .getByRole("combobox", { name: "制作物を選ぶ", exact: true })
    .selectOption(before.documents[0].id);
  await expect(page.getByLabel("回数・vol.", { exact: true })).toHaveValue(
    "vol.6",
  );
  await expect(page.getByLabel("出演者2の名前", { exact: true })).toHaveValue(
    "しののめむすび",
  );
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("生音Acoustic Live vol.6");
});

test("pasted artists, saved name suggestions and names-only flyers remain easy to use at 390px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio");
  await page.getByRole("button", { name: /01 \/ EVENT/ }).click();
  await page.getByText("名前をまとめて追加する", { exact: true }).click();
  await page
    .getByLabel("まとめて追加する出演者名", { exact: true })
    .fill("新しいバンドA\n新しいバンドB");
  await page.getByRole("button", { name: "名前を追加", exact: true }).click();
  await expect(page.getByLabel("出演者8の名前", { exact: true })).toHaveValue(
    "新しいバンドA",
  );
  await expect(page.getByLabel("出演者9の名前", { exact: true })).toHaveValue(
    "新しいバンドB",
  );
  const list = await page
    .getByLabel("出演者1の名前", { exact: true })
    .getAttribute("list");
  expect(
    await page
      .locator("datalist")
      .evaluate(
        (element, id) =>
          element.id === id &&
          [...element.querySelectorAll("option")].some(
            (option) => option.value === "結城和也",
          ),
        list,
      ),
  ).toBe(true);
  await page.getByLabel("出演時刻を表示", { exact: true }).uncheck();
  await expect(
    page.locator(".studio-preview-panel .one-page-schedule-row"),
  ).toHaveCount(9);
  await expect(
    page.locator(".studio-preview-panel .one-page-time"),
  ).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await saved(page)).events[0].eventData.schedule.filter(
          (item: { type: string }) => item.type === "act",
        ).length,
    )
    .toBe(9);
  expect((await saved(page)).events[0].eventData.schedule[0].time).toBe(
    "14:30-14:50",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/evidence/live-editor-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByLabel("出演時刻を表示", { exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "次回分を作る", exact: true }).click();
  await page.screenshot({
    path: "docs/evidence/live-repeat-dialog.png",
    fullPage: false,
  });
});

test("shared event edits undo together, stale undo cannot overwrite another design, and fixed-copy edits stay separate", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /01 \/ EVENT/ }).click();
  const longName = "管".repeat(500);
  await page.getByText("管理名を変更", { exact: true }).click();
  await page.getByLabel("制作物の管理名", { exact: true }).fill(longName);
  await page
    .getByLabel("ライブタイトル", { exact: true })
    .fill("前回からの編集");
  await page.getByRole("button", { name: "取り消す", exact: true }).click();
  await expect(page.getByLabel("ライブタイトル", { exact: true })).toHaveValue(
    "生音",
  );
  await page.getByRole("button", { name: "やり直す", exact: true }).click();
  await expect(page.getByLabel("ライブタイトル", { exact: true })).toHaveValue(
    "前回からの編集",
  );
  await expect
    .poll(async () => (await saved(page)).events[0].eventData.title)
    .toBe("前回からの編集");
  const originalId = (await saved(page)).documents[0].id;
  await page
    .getByRole("button", { name: "デザイン違いを作る", exact: true })
    .click();
  await page
    .getByLabel("出演者1の名前", { exact: true })
    .fill("別デザインからの編集");
  await expect
    .poll(async () => (await saved(page)).events[0].eventData.schedule[0].name)
    .toBe("別デザインからの編集");
  const copyId = (await saved(page)).activeDocumentId;
  expect((await saved(page)).documents[0].name).toBe(longName);
  expect((await saved(page)).documents[1].name).toHaveLength(500);
  expect((await saved(page)).documents[1].name.endsWith(" コピー")).toBe(true);
  await page
    .getByRole("combobox", { name: "制作物を選ぶ", exact: true })
    .selectOption(originalId);
  await page.getByRole("button", { name: "取り消す", exact: true }).click();
  await expect(
    page.getByText(
      "他のチラシで内容が更新されています。最新の内容を確認して編集してください。",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByLabel("出演者1の名前", { exact: true })).toHaveValue(
    "別デザインからの編集",
  );
  await page
    .getByRole("combobox", { name: "制作物を選ぶ", exact: true })
    .selectOption(copyId);
  await page.getByRole("tab", { name: "本文", exact: true }).click();
  await page
    .getByLabel("イベントとの反映方法", { exact: true })
    .selectOption("snapshot");
  await page.getByRole("tab", { name: "ライブ情報", exact: true }).click();
  await page
    .getByLabel("ライブタイトル", { exact: true })
    .fill("固定コピーだけ");
  await expect(
    page.locator(".studio-preview-panel .one-page-title-row h1"),
  ).toHaveText("固定コピーだけ");
  expect((await saved(page)).events[0].eventData.title).toBe("前回からの編集");
  await page.getByRole("button", { name: "取り消す", exact: true }).click();
  await expect(page.getByLabel("ライブタイトル", { exact: true })).toHaveValue(
    "前回からの編集",
  );
  await expect
    .poll(async () => (await saved(page)).documents[1].snapshot.title)
    .toBe("前回からの編集");
  await page.reload();
  await expect(page.getByLabel("ライブタイトル", { exact: true })).toHaveValue(
    "前回からの編集",
  );
  expect((await saved(page)).documents[0].name).toBe(longName);
  expect((await saved(page)).documents[1].name).toHaveLength(500);
});

test("names-only mode retains every artist and the original times through all 20 designs and 4 output sizes", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/studio");
  const report = await page.evaluate(async () => {
    const root = "/src";
    const { createDocument } = await import(`${root}/studio/document.ts`);
    const { defaultEvent } = await import(`${root}/data/defaultEvent.ts`);
    const { templates, sizes } = await import(`${root}/studio/registry.ts`);
    const { composeScene } = await import(`${root}/studio/scene.ts`);
    const { renderScene, scenePng } = await import(`${root}/studio/render.ts`);
    const event = {
      id: "live-variant",
      name: "live",
      eventData: defaultEvent,
      updatedAt: "",
    };
    const rows = [];
    for (const template of templates)
      for (const [sizeId, size] of Object.entries(sizes) as [
        string,
        { width: number; height: number },
      ][]) {
        const doc = createDocument("event-flyer", event);
        doc.design.templateId = template.id;
        doc.design.paletteId = template.palette;
        doc.design.sizeId = sizeId;
        doc.design.visibility.times = false;
        const scene = composeScene(doc, [event]);
        const result = await renderScene(
          scene,
          new Map(),
          size.width,
          size.height,
        );
        const text = result.measurements
          .map((measurement: { text: string }) => measurement.text)
          .join("\n");
        let dimensions: number[] = [];
        if (!result.errors.length) {
          const png = await scenePng(result);
          const bitmap = await createImageBitmap(png);
          dimensions = [bitmap.width, bitmap.height];
          bitmap.close();
        }
        rows.push({
          template: template.id,
          size: sizeId,
          errors: result.errors,
          allArtists: defaultEvent.schedule
            .filter((item: { type: string }) => item.type === "act")
            .every((item: { name: string }) => text.includes(item.name)),
          timeNodes: result.measurements.filter((measurement: { id: string }) =>
            measurement.id.startsWith("time-"),
          ).length,
          timesRetained:
            JSON.stringify(doc.snapshot.schedule) ===
            JSON.stringify(defaultEvent.schedule),
          dimensions,
          expected: [size.width, size.height],
        });
        result.canvas.width = 1;
        result.canvas.height = 1;
      }
    return rows;
  });
  await mkdir("test-results/live-variants", { recursive: true });
  await writeFile(
    "test-results/live-variants/names-only.json",
    JSON.stringify(report, null, 2),
  );
  expect(report).toHaveLength(80);
  expect(
    report.filter(
      (row) =>
        row.errors.length ||
        !row.allArtists ||
        row.timeNodes ||
        !row.timesRetained ||
        JSON.stringify(row.dimensions) !== JSON.stringify(row.expected),
    ),
  ).toEqual([]);
});
