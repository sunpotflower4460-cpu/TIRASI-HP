// App Store screenshots (6.9-inch, 1320x2868) of the store edition, with made-up content.
//   npm run dev:store -- --port 5199 --strictPort      (in another terminal)
//   node scripts/store-screenshots.mjs [http://127.0.0.1:5199] [en]
// Writes docs/appstore/screenshots/ (captioned) and docs/appstore/review/ (purchase screens);
// with "en", the English set goes to docs/appstore/screenshots-en/.
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const origin = process.argv[2] ?? "http://127.0.0.1:5199";
const english = process.argv[3] === "en";
const shots = join(root, english ? "docs/appstore/screenshots-en" : "docs/appstore/screenshots");
const review = join(root, "docs/appstore/review");
for (const directory of english ? [shots] : [shots, review]) mkdirSync(directory, { recursive: true });
// Button and field names, made-up content and captions in each language.
const words = english
  ? {
      start: "Get started", live: "Make a gig flyer", title: "Live title", flyerTitle: "Late Night Music",
      names: ["Luna Hart", "The Lullaby Orchestra", "Paper Moon Duo", "Morning Calm Trio"],
      venueSection: "Venue, organizer and notes", venue: "Venue name", venueName: "LIVE HOUSE HINATA",
      organizer: "Organizer", organizerName: "Presented by Night Owl Club", top: "Venue line at the top", topText: "AT LIVE HOUSE HINATA",
      finish: "Preview", edit: "Edit", design: /Design/, acoustic: "Design: Acoustic", home: "Home", workshop: "Workshop",
      plan: "Plan (Free)", buy: /Buy\s*¥600/,
      captions: [["Just type, and your", "gig flyer is ready"], ["Add the date", "and the artists"], ["Save to Photos", "and share it"], ["Choose from", "20 designs"], ["One tap for", "a whole new look"], ["Not just", "for gigs"]],
    }
  : {
      start: "はじめる", live: "ライブのチラシを作る", title: "ライブタイトル", flyerTitle: "夜ふかし音楽会",
      names: ["月野あかり", "こもりうた楽団", "Paper Moon Duo", "朝凪トリオ"],
      venueSection: "会場・主催・注意書き", venue: "会場名", venueName: "LIVE HOUSE HINATA",
      organizer: "主催・企画", organizerName: "企画: 夜ふかし企画室", top: "上部の会場表記", topText: "AT LIVE HOUSE HINATA",
      finish: "仕上がり・保存", edit: "編集", design: /デザイン/, acoustic: "デザイン: アコースティック", home: "ホーム", workshop: "ワークショップ",
      plan: "プラン（無料）", buy: /購入する\s*¥600/,
      captions: [["入力するだけで", "ライブのチラシが完成"], ["日時と出演者を", "入れるだけ"], ["写真に保存して", "そのまま告知"], ["20種類のデザインから", "選べる"], ["タップで", "雰囲気を着せ替え"], ["ライブ以外の", "お知らせにも"]],
    };

const WIDTH = 1320;
const HEIGHT = 2868;
// Date and time fields as the iPhone shows them in that language.
const browser = await chromium.launch(
  english
    ? { args: ["--lang=en-US"] }
    : { args: ["--lang=ja-JP"], env: { ...process.env, LANG: "ja_JP.UTF-8", LANGUAGE: "ja" } },
);
const context = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, locale: english ? "en-US" : "ja-JP", timezoneId: "Asia/Tokyo" });
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
const home = () => button(words.home).click();
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
await button(words.start).click();

// Made-up content, typed through the real form.
await button(words.live).click();
await page.getByLabel(words.title, { exact: true }).fill(words.flyerTitle);
const artists = page.locator("input.live-artist-name");
const count = await artists.count();
if (count < words.names.length) throw new Error("The artist fields were not found; update the selector.");
for (let i = 0; i < words.names.length; i += 1) await artists.nth(i).fill(words.names[i]);
await page.getByText(words.venueSection).click();
await page.getByLabel(words.venue, { exact: true }).fill(words.venueName);
await page.getByLabel(words.organizer, { exact: false }).first().fill(words.organizerName);
await page.getByLabel(words.top).fill(words.topText);
await page.getByText(words.venueSection).click();

await toTop();
await settle();
// The headless browser draws Japanese date and time fields in US style; a Japanese
// iPhone shows 2027/04/03 and 18:30, so the capture does too.
if (!english)
  await page.evaluate(() => {
    for (const input of document.querySelectorAll('input[type="date"], input[type="time"]')) {
      const value = input.value.replaceAll("-", "/");
      input.type = "text";
      input.value = value;
    }
  });
const form = await page.screenshot();
await button(words.finish, english).click();
await toTop();
const preview = await capture();
await button(words.edit).click();
await page.getByRole("tab", { name: words.design }).click();
await toTop();
const designs = await capture();
await button(words.acoustic).click();
await button(words.finish, english).click();
await toTop();
const acoustic = await capture();
await home();
await toTop();
const start = await capture();
await button(words.workshop).click();
await button(words.finish, english).click();
await toTop();
const other = await capture();

const files = ["01-start.png", "02-input.png", "03-save.png", "04-designs.png", "05-restyle.png", "06-more.png"];
const screens = [start, form, preview, designs, acoustic, other];
for (let i = 0; i < files.length; i += 1) await framed(screens[i], files[i], words.captions[i]);

// Screens App Review asks for with each in-app purchase.
if (!english) {
  await home();
  await button(words.plan).click();
  await settle();
  await page.screenshot({ path: join(review, "iap-standard-and-full.png") });
  await page.getByRole("dialog").getByRole("button", { name: words.buy }).click();
  await settle();
  await page.getByRole("dialog").evaluate((node) => node.scrollTo(0, node.scrollHeight));
  await page.screenshot({ path: join(review, "iap-upgrade.png") });
  console.log("review screenshots written");
}

await browser.close();
