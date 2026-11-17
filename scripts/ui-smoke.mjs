import { chromium } from "@playwright/test";
import sharp from "sharp";

// Drives the main Studio flows and reports console errors, page errors and
// failed requests. npm run dev must be running.
const origin = process.argv[2] ?? "http://127.0.0.1:5173";
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {},
);
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
});
const page = await context.newPage();
const issues = [];
page.on("pageerror", (e) => issues.push("pageerror: " + e.message));
page.on(
  "console",
  (m) =>
    ["error", "warning"].includes(m.type()) &&
    issues.push(`${m.type()}: ${m.text()}`),
);
page.on(
  "response",
  (r) => r.status() >= 400 && issues.push(`HTTP ${r.status()} ${r.url()}`),
);
const step = async (name, fn) => {
  const before = issues.length;
  try {
    await fn();
  } catch (e) {
    issues.push(`STEP FAILED ${name}: ${String(e).split("\n")[0]}`);
  }
  if (issues.length > before)
    console.log(`[${name}]`, issues.slice(before).join(" | "));
};
const photo = await sharp({
  create: { width: 1200, height: 900, channels: 3, background: "#4a7fa0" },
})
  .composite([
    {
      input: Buffer.from(
        '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><circle cx="200" cy="200" r="180" fill="#f2c14e"/></svg>',
      ),
      left: 400,
      top: 250,
    },
  ])
  .png()
  .toBuffer();

await page.goto(origin + "/studio");
await step("create live", async () => {
  await page.getByText("ライブのチラシを作る").first().click();
  await page.waitForTimeout(1500);
});
await step("edit title+date", async () => {
  await page.getByLabel("ライブタイトル").fill("春のうたごえ");
  await page.getByLabel(/開催日/).fill("2026-04-18");
  await page.waitForTimeout(600);
});
await step("add + reorder performer", async () => {
  await page.getByRole("button", { name: "＋ 出演者" }).click();
  await page.getByLabel(/出演者8の名前/).fill("新しい出演者");
  await page.getByRole("button", { name: /項目8を上へ/ }).click();
  await page.waitForTimeout(400);
});
await step("undo/redo", async () => {
  await page.getByRole("button", { name: "取り消す" }).click();
  await page.getByRole("button", { name: "やり直す" }).click();
});
for (const tab of ["デザイン", "画像・配置", "本文", "ライブ情報"])
  await step("tab " + tab, async () => {
    await page.getByRole("tab", { name: tab }).click();
    await page.waitForTimeout(500);
  });
await step("every layout", async () => {
  await page.getByRole("tab", { name: "デザイン" }).click();
  await page.getByLabel("デザインを絞り込む").selectOption("すべて");
  const cards = page.locator(".template-card");
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    await cards.nth(i).click();
    await page.waitForTimeout(250);
  }
});
await step("palettes + sizes", async () => {
  for (const id of ["a4", "square", "story", "portrait"]) {
    await page.locator("details.design-more, .design-section").first();
    await page
      .getByLabel("出力サイズ", { exact: true })
      .selectOption(id)
      .catch(() => {});
    await page.waitForTimeout(300);
  }
});
await step("upload photo", async () => {
  await page.getByRole("tab", { name: "画像・配置" }).click();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name: "p.png", mimeType: "image/png", buffer: photo });
  await page.waitForTimeout(1500);
});
await step("png save", async () => {
  const d = page.waitForEvent("download", { timeout: 20000 });
  await page.getByRole("button", { name: "PNGを保存", exact: true }).click();
  await d;
});
await step("next live dialog", async () => {
  await page.getByRole("button", { name: "次回分を作る" }).click();
  await page.waitForTimeout(500);
  await page.keyboard.press("Escape");
});
await step("free flyer", async () => {
  await page.getByText("自由なチラシを作る").first().click();
  await page.waitForTimeout(1200);
});
await step("treatment", async () => {
  await page.getByText("手持ちの画像を加工する").first().click();
  await page.waitForTimeout(1200);
});
await step("reload persists", async () => {
  await page.reload();
  await page.waitForTimeout(1500);
});
for (const r of ["/", "/flyer", "/editor"])
  await step("route " + r, async () => {
    await page.goto(origin + r);
    await page.waitForTimeout(1200);
  });
console.log(issues.length ? `${issues.length} issue(s)` : "no issues");
await browser.close();
