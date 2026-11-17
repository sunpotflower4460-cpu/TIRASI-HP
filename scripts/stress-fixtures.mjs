import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";

// Boundary-fixture sweep: renders every layout x size for risky event data and
// reports blocking diagnostics. npm run dev must be running.
// node scripts/stress-fixtures.mjs [outDir] [origin] [fixtureName,...]
const out = process.argv[2] ?? "test-results/stress";
const origin = process.argv[3] ?? "http://127.0.0.1:5173/studio";
const only = process.argv[4]?.split(",");
await mkdir(out, { recursive: true });
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
try {
  await page.goto(origin);
  const results = await page.evaluate(async (only) => {
    const root = "/src";
    const { defaultEvent } = await import(`${root}/data/defaultEvent.ts`);
    const { createDocument } = await import(`${root}/studio/document.ts`);
    const { composeScene } = await import(`${root}/studio/scene.ts`);
    const { renderScene } = await import(`${root}/studio/render.ts`);
    const { templates, sizes } = await import(`${root}/studio/registry.ts`);
    const act = (name, time = "14:30-14:50") => ({ type: "act", time, name });
    const many = (n) =>
      Array.from({ length: n }, (_, i) =>
        act(`出演者${i + 1}`, `${String(12 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}-${String(12 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "55" : "25"}`),
      );
    const fixtures = {
      one: { schedule: [act("ひとり")] },
      zero: { schedule: [] },
      twelve: { schedule: [...many(12), { type: "end", label: "- 企画終了 -" }] },
      longnames: {
        schedule: [
          act("しののめむすびとゆかいななかまたち feat. 館林ストリングス"),
          act("The Quick Brown Fox Jumps Over The Lazy Dog Band"),
          act("ゆうきかずやとそのバンド（アコースティックセット）"),
          act("OK"),
        ],
      },
      longtitle: {
        title: "館林みつで通り春のおおきな音楽祭スペシャル",
        subtitle: "Spring Acoustic Music Festival in Tatebayashi",
        volume: "vol.12",
      },
      english: { title: "ACOUSTIC NIGHT", subtitle: "Live at the Public House", volume: "Vol.3" },
      shorttitle: { title: "音", subtitle: "", volume: "" },
      freedate: { date: "5月上旬", day: "未定", dayOverride: true },
      isodate: { date: "2027-01-02", day: "土" },
      longvenue: {
        venue: {
          name: "館林パブリックハウス ミツデ 2階 イベントスペース オーロラホール",
          address: "〒374-0029 群馬県館林市仲町1-10 館林ミツデ2F 奥のエレベーター横の階段を上がってすぐ右手",
          url: "https://tph.mitsude.com/events/long/path/to/the/page",
        },
      },
      longnote: {
        statusNote: "※雨天の場合は屋内に会場を変更して開催いたします。\n※駐車場には限りがございますので、公共交通機関でのご来場にご協力ください。\n※飲食物の持ち込みはご遠慮ください。",
        organizer: "企画・運営: 館林音楽まつり実行委員会 × しののめむすび × Flower pot studio × 館林市商工会",
      },
      mednote: {
        statusNote: "※雨天の場合は屋内で開催します。\n※駐車場には限りがございます。公共交通機関でのご来場にご協力ください。",
      },
      mednote2: {
        statusNote: "※雨天決行（荒天中止）。\n※飲食物の持ち込みはご遠慮ください。\n※会場内での撮影は出演者の指示に従ってください。",
        organizer: "企画: しののめむすび × Flower pot studio × 館林市商工会",
      },
      noopenmic: { openMic: { title: "", time: "", lastOrder: "", headline: "", note: "", closeNote: "" } },
      price: { price: "前売 2,500円 / 当日 3,000円（1ドリンク別）", startTime: "18:00" },
      midnight: { date: "2026.12.31", day: "木", startTime: "23:00", schedule: [act("カウントダウン", "23:00-00:30")] },
    };
    const names = only ?? Object.keys(fixtures);
    const rows = [];
    for (const name of names) {
      const eventData = { ...defaultEvent, ...fixtures[name] };
      const event = { id: "stress", name, eventData, updatedAt: "" };
      for (const template of templates)
        for (const sizeId of Object.keys(sizes)) {
          const doc = createDocument("event-flyer", event);
          doc.design.templateId = template.id;
          doc.design.paletteId = template.palette;
          doc.design.sizeId = sizeId;
          let row;
          try {
            const scene = composeScene(doc, [event]);
            const rendered = await renderScene(scene, new Map());
            row = {
              name,
              template: template.id,
              size: sizeId,
              errors: rendered.errors,
              smallest: Math.min(...rendered.measurements.map((m) => m.fontSize)),
              png: rendered.errors.length ? rendered.canvas.toDataURL("image/png").split(",")[1] : undefined,
            };
          } catch (e) {
            row = { name, template: template.id, size: sizeId, errors: ["EXCEPTION " + String(e)] };
          }
          rows.push(row);
        }
    }
    return rows;
  }, only);
  const failures = results.filter((r) => r.errors.length);
  for (const r of failures)
    if (r.png) await writeFile(`${out}/${r.name}-${r.template}-${r.size}.png`, Buffer.from(r.png, "base64"));
  const slim = results.map(({ png, ...rest }) => rest);
  await writeFile(`${out}/report.json`, JSON.stringify(slim, null, 1));
  const byFixture = {};
  for (const r of slim) {
    byFixture[r.name] ??= { total: 0, failed: 0 };
    byFixture[r.name].total++;
    if (r.errors.length) byFixture[r.name].failed++;
  }
  console.table(byFixture);
  const tiny = slim.filter((r) => r.smallest < 14);
  console.log("below 14px:", tiny.length);
  console.log("page errors:", consoleErrors.slice(0, 5));
} finally {
  await browser.close();
}
