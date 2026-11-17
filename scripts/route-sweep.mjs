import { chromium } from "@playwright/test";

// Opens each route at several widths; reports horizontal overflow, console
// errors and failed requests. npm run dev (or vite preview) must be running.
const origin = process.argv[2] ?? "http://127.0.0.1:5173";
const routes = ["/", "/flyer", "/editor", "/studio", "/events", "/preview/missing"];
const widths = [320, 375, 768, 1024, 1440];
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
let problems = 0;
for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const notes = [];
  page.on("pageerror", (e) => notes.push("pageerror: " + e));
  page.on("console", (m) => m.type() === "error" && notes.push("console: " + m.text()));
  page.on("response", (r) => r.status() >= 400 && notes.push(`HTTP ${r.status()} ${r.url()}`));
  for (const route of routes) {
    notes.length = 0;
    await page.goto(origin + route);
    await page.waitForTimeout(900);
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      wide: [...document.querySelectorAll("body *")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > document.documentElement.clientWidth + 1 && getComputedStyle(el).position !== "fixed";
        })
        .slice(0, 3)
        .map((el) => el.tagName + "." + String(el.className).slice(0, 40)),
    }));
    const bad = overflow.scroll > overflow.client + 1;
    if (bad || notes.length) {
      problems++;
      console.log(`[${width}px ${route}]`, bad ? `overflow ${overflow.scroll}>${overflow.client} ${overflow.wide.join(" ")}` : "", [...new Set(notes)].join(" | "));
    }
  }
  await context.close();
}
console.log(problems ? `${problems} route/width combinations with problems` : "no problems");
await browser.close();
