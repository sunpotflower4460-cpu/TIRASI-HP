// App Store screenshots (6.9-inch, 1320x2868) of the store edition, with made-up content.
//   npm run dev:store -- --port 5199 --strictPort      (in another terminal)
//   node scripts/store-screenshots.mjs [http://127.0.0.1:5199]
// Writes docs/appstore/screenshots/ (captioned) and docs/appstore/review/ (purchase screens).
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const origin = process.argv[2] ?? "http://127.0.0.1:5199";
const shots = join(root, "docs/appstore/screenshots");
const review = join(root, "docs/appstore/review");
for (const directory of [shots, review]) mkdirSync(directory, { recursive: true });

const WIDTH = 1320;
const HEIGHT = 2868;
// Japanese date and time fields, as the iPhone shows them.
const browser = await chromium.launch({ args: ["--lang=ja-JP"], env: { ...process.env, LANG: "ja_JP.UTF-8", LANGUAGE: "ja" } });
const context = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, locale: "ja-JP", timezoneId: "Asia/Tokyo" });
await context.addInitScript(() => {
  // Look like the iOS app, with a stand-in for the App Store so prices show.
  window.Capacitor = { isNativePlatform: () => true };
  const bought = JSON.parse(sessionStorage.getItem("shots-owned") ?? "[]");
  window.__tirasiFakeStore = {
    products: async () => [
      { id: "jp.tirasi.livechirashi.standard", title: "", price: "¥600" },
      { id: "jp.tirasi.livechirashi.full", title: "", price: "¥1,200" },
      { id: "jp.tirasi.livechirashi.upgrade", title: "", price: "¥600" },
    ],
    owned: async () => [...bought],
    purchase: async (id) => { bought.push(id); sessionStorage.setItem("shots-owned", JSON.stringify(bought)); return "purchased"; },
    restore: async () => {},
    onChange: () => () => {},
  };
});
const page = await context.newPage();
const settle = () => page.waitForTimeout(1800);
const capture = async () => { await settle(); return page.screenshot(); };
const button = (name, exact = true) => page.getByRole("button", { name, exact });
const home = () => button("ホーム").click();
const toTop = () => page.evaluate(() => window.scrollTo(0, 0));

const escape = (text) => text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
/** A headline above the screen, on the app's night blue. */
async function framed(screen, file, lines) {
  const inner = { width: 1128, left: 96, top: 470 };
  const scaled = await sharp(screen).resize({ width: inner.width }).png().toBuffer();
  const height = Math.min((await sharp(scaled).metadata()).height, HEIGHT - inner.top - 40);
  const mask = Buffer.from(`<svg width="${inner.width}" height="${height}"><rect width="${inner.width}" height="${height}" rx="64" fill="#fff"/></svg>`);
  const rounded = await sharp(scaled).extract({ left: 0, top: 0, width: inner.width, height }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const text = lines.map((line, i) => `<text x="${WIDTH / 2}" y="${(lines.length === 1 ? 290 : 200) + i * 140}" text-anchor="middle" font-family="Hiragino Sans, Hiragino Kaku Gothic ProN, sans-serif" font-weight="800" font-size="92" fill="${i === lines.length - 1 && lines.length > 1 ? "#f2b544" : "#ffffff"}">${escape(line)}</text>`).join("");
  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#232a57"/><stop offset="0.65" stop-color="#353e78"/><stop offset="1" stop-color="#6a3a78"/></linearGradient></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>${text}</svg>`);
  await sharp(background).composite([{ input: rounded, left: inner.left, top: inner.top }]).flatten({ background: "#232a57" }).removeAlpha().png().toFile(join(shots, file));
  console.log(file);
}

await page.goto(origin);
await button("はじめる").click();

// Made-up content, typed through the real form.
await button("ライブのチラシを作る").click();
await page.getByLabel("ライブタイトル", { exact: true }).fill("夜ふかし音楽会");
const names = ["月野あかり", "こもりうた楽団", "Paper Moon Duo", "朝凪トリオ"];
const artists = page.locator("input.live-artist-name");
const count = await artists.count();
if (count < names.length) throw new Error("The artist fields were not found; update the selector.");
for (let i = 0; i < names.length; i += 1) await artists.nth(i).fill(names[i]);
await page.getByText("会場・主催・注意書き").click();
await page.getByLabel("会場名", { exact: true }).fill("LIVE HOUSE HINATA");
await page.getByLabel("主催・企画", { exact: false }).first().fill("企画: 夜ふかし企画室");
await page.getByLabel("上部の会場表記").fill("AT LIVE HOUSE HINATA");
await page.getByText("会場・主催・注意書き").click();

await toTop();
await settle();
// The headless browser draws date and time fields in US style; a Japanese iPhone
// shows 2027/04/03 and 18:30, so the capture does too.
await page.evaluate(() => {
  for (const input of document.querySelectorAll('input[type="date"], input[type="time"]')) {
    const value = input.value.replaceAll("-", "/");
    input.type = "text";
    input.value = value;
  }
});
const form = await page.screenshot();
await button("仕上がり・保存", false).click();
await toTop();
const preview = await capture();
await button("編集").click();
await page.getByRole("tab", { name: /デザイン/ }).click();
await toTop();
const designs = await capture();
await button("デザイン: アコースティック").click();
await button("仕上がり・保存", false).click();
await toTop();
const acoustic = await capture();
await home();
await toTop();
const start = await capture();
await button("ワークショップ").click();
await button("仕上がり・保存", false).click();
await toTop();
const other = await capture();

await framed(start, "01-start.png", ["入力するだけで", "ライブのチラシが完成"]);
await framed(form, "02-input.png", ["日時と出演者を", "入れるだけ"]);
await framed(preview, "03-save.png", ["写真に保存して", "そのまま告知"]);
await framed(designs, "04-designs.png", ["20種類のデザインから", "選べる"]);
await framed(acoustic, "05-restyle.png", ["タップで", "雰囲気を着せ替え"]);
await framed(other, "06-more.png", ["ライブ以外の", "お知らせにも"]);

// Screens App Review asks for with each in-app purchase.
await home();
await button("プラン（無料）").click();
await settle();
await page.screenshot({ path: join(review, "iap-standard-and-full.png") });
await page.getByRole("dialog").getByRole("button", { name: /購入する\s*¥600/ }).click();
await settle();
await page.getByRole("dialog").evaluate((node) => node.scrollTo(0, node.scrollHeight));
await page.screenshot({ path: join(review, "iap-upgrade.png") });
console.log("review screenshots written");
await browser.close();
