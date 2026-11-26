// Geometry and legibility sweep over every layout x size of the store edition.
// Looks for what the renderer's own diagnostics cannot see: ink touching ink,
// rules and panel edges running through type, type that fades into the artwork,
// and awkward line breaks.
//   npm run dev:store -- --port 5199 --strictPort      (in another terminal)
//   [BROWSER=webkit] [UI_LOCALE=en-US] node scripts/layout-audit.mjs [outDir] [origin] [fixture,...]
// UI_LOCALE=en-US draws the store app in English with English content.
// Writes <outDir>/report.json and one PNG per render.
import { chromium, webkit } from "@playwright/test";
import { writeFile, mkdir, rm } from "node:fs/promises";

const out = process.argv[2] ?? "test-results/layout-audit";
const origin = process.argv[3] ?? "http://127.0.0.1:5199";
const only = process.argv[4]?.split(",");
await rm(out, { recursive: true, force: true });
await mkdir(`${out}/png`, { recursive: true });
// BROWSER=webkit draws with the engine the iPhone app uses.
const browser =
  process.env.BROWSER === "webkit"
    ? await webkit.launch(
        process.env.WEBKIT_PATH ? { executablePath: process.env.WEBKIT_PATH } : {},
      )
    : await chromium.launch(
        process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
      );
const locale = process.env.UI_LOCALE ?? "ja-JP";
const page = await browser.newPage({ locale });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error)));
await page.exposeFunction("savePng", (name, data) =>
  writeFile(`${out}/png/${name}.png`, Buffer.from(data, "base64")),
);

try {
  await page.goto(origin);
  const rows = await page.evaluate(async (only) => {
    const root = "/src";
    const { defaultEvent } = await import(`${root}/data/defaultEvent.store.ts`);
    const { createDocument, starters } = await import(`${root}/studio/document.ts`);
    const { composeScene } = await import(`${root}/studio/scene.ts`);
    const { renderScene, measureText, layoutFlow } = await import(`${root}/studio/render.ts`);
    const { templates, sizes, palettes } = await import(`${root}/studio/registry.ts`);

    const act = (name, time = "19:00-19:25") => ({ type: "act", time, name });
    const slot = (i) => {
      const minutes = 13 * 60 + i * 30;
      const f = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      return `${f(minutes)}-${f(minutes + 25)}`;
    };
    const many = (n) => Array.from({ length: n }, (_, i) => act(`出演者${i + 1}`, slot(i)));
    const noOpenMic = { title: "", time: "", lastOrder: "", headline: "", note: "", closeNote: "" };

    // Event content a person could plausibly type into the store app.
    const events = {
      sample: {},
      typical: {
        title: "夜ふかし音楽会",
        venueSubtitle: "AT LIVE HOUSE HINATA",
        organizer: "企画: 夜ふかし企画室",
        schedule: [act("月野あかり", "18:30-18:55"), act("こもりうた楽団", "19:05-19:30"), act("Paper Moon Duo", "19:40-20:05"), act("朝凪トリオ", "20:15-20:45")],
        venue: { name: "LIVE HOUSE HINATA", address: "東京都世田谷区北沢 2-1-1 B1F", url: "https://example.com" },
      },
      long: {
        title: "真夏の夜のアコースティック大感謝祭",
        subtitle: "Summer Night Acoustic Thanksgiving",
        volume: "vol.12",
        venueSubtitle: "AT LIVE & CAFE SPACE HINATABOKKO",
        price: "前売 ¥2,500 / 当日 ¥3,000（1ドリンク別）",
        organizer: "企画: ひなたぼっこ音楽企画 × 夜ふかし企画室",
        statusNote: "開場 18:00（整理番号順の入場）\n未就学児は入場できません。",
        schedule: [act("月野あかりとゆかいな仲間たち"), act("The Midnight Lantern Orchestra", "19:30-19:55"), act("こもりうた楽団（アコースティック編成）", "20:00-20:25"), { type: "break", label: "休憩(15分)" }, act("朝凪トリオ feat. 渚", "20:40-21:05"), act("ユニット・シーサイドブリーズ", "21:10-21:35"), { type: "end", label: "- 終演 -" }],
        venue: { name: "LIVE & CAFE SPACE ひなたぼっこ 下北沢店", address: "東京都世田谷区北沢 2-34-5 サンプルビルディング地下1階", url: "https://example.com/live/schedule" },
      },
      many: { schedule: [...many(10), { type: "end", label: "- 終演 -" }] },
      one: { title: "音", subtitle: "", volume: "", schedule: [act("月野あかり")] },
      two: { title: "二人会", schedule: [act("月野あかり", "19:00-19:45"), act("朝凪トリオ", "20:00-20:45")] },
      minimal: {
        venueSubtitle: "", subtitle: "", volume: "", organizer: "", statusNote: "",
        openMic: noOpenMic, venue: { name: "SAMPLE LIVE HOUSE", address: "", url: "" },
      },
      english: { title: "ACOUSTIC NIGHT", subtitle: "Live at the Public House", volume: "Vol.3" },
      newline: { title: "夜ふかし\n音楽会" },
      noschedule: { schedule: [] },
      bios: {
        flyerOptions: { showPerformerProfiles: true },
        performers: [
          { id: "a", name: "月野あかり", catchcopy: "夜に寄りそう弾き語り", bio: "ギター一本で全国をまわる歌い手。", imageUrl: "", linkUrl: "" },
          { id: "b", name: "朝凪トリオ", catchcopy: "三人の静かなグルーヴ", bio: "鍵盤・ベース・打楽器の三人組。", imageUrl: "", linkUrl: "" },
        ],
      },
      freedate: { date: "2027年春ごろ", day: "未定", dayOverride: true, startTime: "未定", price: "投げ銭" },
    };
    const { language } = await import(`${root}/i18n/index.ts`);
    if (language === "en") {
      Object.assign(events, {
        typical: {
          title: "Late Night Music", venueSubtitle: "AT LIVE HOUSE HINATA", organizer: "Presented by Night Owl Club",
          schedule: [act("Luna Hart", "18:30-18:55"), act("The Lullaby Orchestra", "19:05-19:30"), act("Paper Moon Duo", "19:40-20:05"), act("Morning Calm Trio", "20:15-20:45")],
          venue: { name: "LIVE HOUSE HINATA", address: "2-1-1 Kitazawa, Setagaya, Tokyo B1F", url: "https://example.com" },
        },
        long: {
          title: "The Midsummer Night Acoustic Thanksgiving", subtitle: "Songs under the open sky", volume: "vol.12",
          venueSubtitle: "AT HINATABOKKO LIVE AND CAFE SPACE", price: "Advance $25 / At the door $30 (+1 drink)",
          organizer: "Presented by Sunny Spot Music Project and Night Owl Club",
          statusNote: "Doors 18:00 (entry by ticket number)\nNo preschool children, please.",
          schedule: [act("Luna Hart and Her Merry Companions"), act("The Midnight Lantern Orchestra", "19:30-19:55"), act("The Lullaby Orchestra (acoustic set)", "20:00-20:25"), { type: "break", label: "Break (15 min)" }, act("Morning Calm Trio feat. Nagisa", "20:40-21:05"), act("Seaside Breeze Unit", "21:10-21:35"), { type: "end", label: "- End -" }],
          venue: { name: "Hinatabokko Live & Cafe Space Shimokitazawa", address: "Sample Building B1, 2-34-5 Kitazawa, Setagaya, Tokyo", url: "https://example.com/live/schedule" },
        },
        many: { schedule: [...Array.from({ length: 10 }, (_, i) => act(`Performer ${i + 1}`, slot(i))), { type: "end", label: "- End -" }] },
        one: { title: "Echo", subtitle: "", volume: "", schedule: [act("Luna Hart")] },
        two: { title: "Two of Us", schedule: [act("Luna Hart", "19:00-19:45"), act("Morning Calm Trio", "20:00-20:45")] },
        newline: { title: "Late Night\nMusic" },
        bios: {
          flyerOptions: { showPerformerProfiles: true },
          performers: [
            { id: "a", name: "Luna Hart", catchcopy: "Songs for the late hours", bio: "A singer touring with one guitar.", imageUrl: "", linkUrl: "" },
            { id: "b", name: "Morning Calm Trio", catchcopy: "A quiet groove in three", bio: "Keys, bass and percussion.", imageUrl: "", linkUrl: "" },
          ],
        },
        freedate: { date: "Spring 2027", day: "TBA", dayOverride: true, startTime: "TBA", price: "Pay what you like" },
      });
      Object.assign(events.minimal, { venue: { name: "SAMPLE LIVE HOUSE", address: "", url: "" } });
    }
    const eventVariants = { notimes: { times: false } };

    const fixtures = [];
    for (const [name, patch] of Object.entries(events))
      fixtures.push({ name: `live-${name}`, kind: "event-flyer", patch });
    for (const [name, visibility] of Object.entries(eventVariants))
      fixtures.push({ name: `live-${name}`, kind: "event-flyer", patch: events.typical, visibility });
    fixtures.push({ name: "live-photo", kind: "event-flyer", patch: events.typical, photo: true });
    fixtures.push({ name: "free-new", kind: "free-flyer" });
    for (const starter of starters)
      fixtures.push({ name: `free-${starter.id}`, kind: "free-flyer", starter });
    fixtures.push({
      name: "free-facts", kind: "free-flyer",
      free: language === "en"
        ? { title: "Spring Art Show", subtitle: "SPRING EXHIBITION", facts: "2027.4/3 11:00-18:00 Free entry" }
        : { title: "春の作品展", subtitle: "SPRING EXHIBITION", facts: "2027.4/3 11:00-18:00 入場無料" },
    });
    fixtures.push({
      name: "free-long", kind: "free-flyer",
      free: language === "en" ? {
        title: "The Neighborhood Spring Handmade Market",
        subtitle: "SPRING HANDMADE MARKET 2027",
        facts: "Saturday, April 3, 2027 10:00-16:00\nFree entry, rain or shine",
        text: "A small market of handmade goods, baked treats and vegetables from our neighbors.\nWorkshops and live music too.\n\nThirty stalls. Families are very welcome.",
        details: "Venue: Sakura Park, Central Plaza\n1-2-3 Sample Street\nContact: info@example.com",
      } : {
        title: "地域のみんなで楽しむ春の手づくり市",
        subtitle: "SPRING HANDMADE MARKET 2027",
        facts: "2027年4月3日（土）10:00-16:00\n参加無料・雨天決行",
        text: "手づくりの雑貨、焼き菓子、野菜などを持ち寄る小さな市です。\nワークショップや生演奏もあります。\n\n出店者は30組。お子さま連れも歓迎します。",
        details: "会場: さくら公園 中央広場\n東京都〇〇区〇〇 1-2-3\nお問い合わせ: info@example.com",
      },
    });
    fixtures.push({ name: "free-photo", kind: "free-flyer", photo: true });

    const photo = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200; canvas.height = 900;
      const c = canvas.getContext("2d");
      const g = c.createLinearGradient(0, 0, 1200, 900);
      g.addColorStop(0, "#244a7a"); g.addColorStop(1, "#d9825b");
      c.fillStyle = g; c.fillRect(0, 0, 1200, 900);
      c.fillStyle = "#f3e7c9"; c.beginPath(); c.arc(600, 450, 230, 0, 7); c.fill();
      return createImageBitmap(canvas);
    };
    const bitmap = await photo();

    const rgb = (hex) => {
      const v = hex.replace("#", "");
      const f = v.length === 3 ? [...v].map((x) => x + x).join("") : v;
      return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
    };
    const luminance = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contrast = (a, b) => {
      const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const font = (n, size) => `${n.italic ? "italic " : ""}${n.weight ?? 400} ${size}px ${n.family}`;

    async function inspect(scene, images) {
      const rendered = await renderScene(scene, images);
      const background = await renderScene(
        { ...scene, nodes: scene.nodes.filter((n) => n.kind !== "text" && n.kind !== "flow") },
        images,
      );
      const bg = background.canvas.getContext("2d", { willReadFrequently: true });
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.textBaseline = "top";
      const mask = document.createElement("canvas");
      const mctx = mask.getContext("2d", { willReadFrequently: true });
      const texts = [];
      const shapes = [];
      let order = 0;
      for (const node of scene.nodes) {
        const resolved = node.kind === "flow" ? layoutFlow(ctx, node).nodes : [node];
        for (const n of resolved) {
          if (n.kind === "rect" || n.kind === "ellipse") shapes.push({ ...n, order: order++ });
          if (n.kind !== "text") continue;
          const m = measureText(ctx, n);
          ctx.font = font(n, m.size);
          ctx.textBaseline = "top";
          ctx.textAlign = n.align ?? "left";
          const x = n.align === "center" ? n.x + n.w / 2 : n.align === "right" ? n.x + n.w : n.x;
          const lh = m.size * (n.lineHeight ?? 1.42);
          const top = n.valign === "center" ? n.y + Math.max(0, (n.h - m.lines.length * lh) / 2) : n.y;
          const lines = m.lines.map((line, i) => {
            const t = ctx.measureText(line);
            const y = top + i * lh;
            return {
              line, x, y,
              box: line.trim()
                ? { x0: x - t.actualBoundingBoxLeft, x1: x + t.actualBoundingBoxRight, y0: y - t.actualBoundingBoxAscent, y1: y + t.actualBoundingBoxDescent }
                : null,
            };
          });
          texts.push({ node: n, id: n.id, size: m.size, lines, order: order++ });
        }
      }
      const issues = rendered.errors.map((message) => ({ type: "error", message }));
      const overlap = (a, b) => [Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)];

      // Ink against ink, including neighbouring lines of one block.
      const inks = texts.flatMap((t) => t.lines.filter((l) => l.box).map((l, i) => ({ t, i, ...l })));
      for (let a = 0; a < inks.length; a++)
        for (let b = a + 1; b < inks.length; b++) {
          const A = inks[a], B = inks[b];
          const [w, h] = overlap(A.box, B.box);
          const same = A.t === B.t;
          if (w > 1 && h > (same ? 2 : 0.5))
            issues.push({ type: same ? "lines-collide" : "ink-overlap", ids: [A.t.id, B.t.id], px: Math.round(h * 10) / 10, text: [A.line, B.line] });
          else if (!same && w > 4 && h > -3 && h <= 0.5)
            issues.push({ type: "ink-touch", ids: [A.t.id, B.t.id], px: Math.round(-h * 10) / 10, text: [A.line, B.line] });
        }

      // Rules and panel edges that run through, or crowd, type.
      for (const ink of inks)
        for (const shape of shapes) {
          const s = { x0: shape.x, x1: shape.x + shape.w, y0: shape.y, y1: shape.y + shape.h };
          const [w, h] = overlap(ink.box, s);
          if (w <= 1 || h <= 0.5) continue;
          const contains = s.x0 <= ink.box.x0 + 0.5 && s.x1 >= ink.box.x1 - 0.5 && s.y0 <= ink.box.y0 + 0.5 && s.y1 >= ink.box.y1 - 0.5;
          if (!contains)
            issues.push({ type: "edge-through-text", ids: [ink.t.id], px: Math.round(Math.min(w, h) * 10) / 10, text: [ink.line], shape: [Math.round(shape.x), Math.round(shape.y), Math.round(shape.w), Math.round(shape.h)] });
        }

      for (const ink of inks) {
        const limit = { x0: 24, x1: scene.width - 24, y0: 20, y1: scene.height - 20 };
        if (ink.box.x0 < limit.x0 || ink.box.x1 > limit.x1 || ink.box.y0 < limit.y0 || ink.box.y1 > limit.y1)
          issues.push({ type: "near-trim", ids: [ink.t.id], text: [ink.line] });
      }

      // Type that fades into what is behind it.
      for (const t of texts) {
        const boxes = t.lines.filter((l) => l.box);
        if (!boxes.length) continue;
        const x0 = Math.max(0, Math.floor(Math.min(...boxes.map((l) => l.box.x0))) - 1);
        const y0 = Math.max(0, Math.floor(Math.min(...boxes.map((l) => l.box.y0))) - 1);
        const x1 = Math.min(scene.width, Math.ceil(Math.max(...boxes.map((l) => l.box.x1))) + 1);
        const y1 = Math.min(Math.round(scene.height), Math.ceil(Math.max(...boxes.map((l) => l.box.y1))) + 1);
        if (x1 <= x0 || y1 <= y0) continue;
        mask.width = x1 - x0; mask.height = y1 - y0;
        mctx.font = font(t.node, t.size);
        mctx.textBaseline = "top";
        mctx.textAlign = t.node.align ?? "left";
        mctx.fillStyle = "#000";
        for (const l of boxes) mctx.fillText(l.line, l.x - x0, l.y - y0);
        const alpha = mctx.getImageData(0, 0, mask.width, mask.height).data;
        const under = bg.getImageData(x0, y0, mask.width, mask.height).data;
        const ink = rgb(t.node.color);
        let total = 0, weak = 0;
        const values = [];
        for (let i = 0; i < alpha.length; i += 4) {
          if (alpha[i + 3] < 180) continue;
          const value = contrast(ink, [under[i], under[i + 1], under[i + 2]]);
          total++;
          if (value < 2.4) weak++;
          values.push(value);
        }
        if (!total) continue;
        values.sort((a, b) => a - b);
        const median = values[Math.floor(values.length / 2)];
        const share = weak / total;
        if (share > 0.04 || median < (t.size >= 30 ? 3 : 4))
          issues.push({ type: "low-contrast", ids: [t.id], weak: Math.round(share * 1000) / 10, median: Math.round(median * 10) / 10, size: t.size, text: [boxes[0].line] });
      }

      // Breaks that read as mistakes.
      for (const t of texts) {
        const paragraphs = t.node.text.split("\n").map((p) => p.trim());
        t.lines.forEach((l, i) => {
          const line = l.line.trim();
          if (!line || t.node.vertical || paragraphs.includes(line)) return;
          const length = Array.from(line).length;
          if (length === 1 || (length === 2 && i === t.lines.length - 1))
            issues.push({ type: "orphan", ids: [t.id], text: t.lines.map((x) => x.line) });
          const next = t.lines[i + 1]?.line.trim();
          if (next && (/[0-9¥￥][,.:]?$/.test(line) && /^[,.:]?[0-9]/.test(next) || /[0-9]{1,2}:[0-9]{2}\s*[-〜~]$/.test(line) || /[A-Za-z]$/.test(line) && /^[A-Za-z]/.test(next) && t.node.text.includes(line.split(" ").pop() + next.split(" ")[0])))
            issues.push({ type: "split-word", ids: [t.id], text: [line, next] });
        });
      }
      if (language === "en")
        for (const t of texts)
          if (/[\u3040-\u30ff\u4e00-\u9fff]/u.test(t.node.text))
            issues.push({ type: "japanese-text", ids: [t.id], text: [t.node.text] });
      const sizesUsed = texts.map((t) => t.size);
      return { issues, canvas: rendered.canvas, smallest: Math.min(...sizesUsed), shrunk: texts.filter((t) => t.size < t.node.size * 0.55).map((t) => `${t.id}:${t.size}/${t.node.size}`) };
    }

    const rows = [];
    const thumb = document.createElement("canvas");
    const keep = async (name, canvas) => {
      thumb.width = 500;
      thumb.height = Math.round((canvas.height / canvas.width) * 500);
      const c = thumb.getContext("2d");
      c.imageSmoothingQuality = "high";
      c.drawImage(canvas, 0, 0, thumb.width, thumb.height);
      await window.savePng(name, thumb.toDataURL("image/png").split(",")[1]);
    };
    const chosen = fixtures.filter((f) => !only || only.some((o) => f.name === o));
    const run = async (fixture, template, sizeId, paletteId, label) => {
      const record = { id: "audit", name: "audit", eventData: { ...defaultEvent, ...(fixture.patch ?? {}) }, updatedAt: "" };
      let doc = createDocument(fixture.kind, record);
      doc.design.templateId = template.id;
      doc.design.paletteId = paletteId;
      doc.design.sizeId = sizeId;
      if (fixture.patch?.flyerOptions) doc.design.visibility.performers = true;
      Object.assign(doc.design.visibility, fixture.visibility ?? {});
      if (fixture.starter || fixture.free) {
        const s = fixture.starter, f = fixture.free;
        doc.content = {
          ...doc.content,
          title: (s ?? f).title,
          subtitle: (s ?? f).subtitle,
          facts: f?.facts ?? "",
          blocks: [
            { id: "b1", type: "text", visible: true, text: s?.text ?? f.text ?? (language === "en" ? "Introduce your event here." : "内容の紹介をここに書きます。") },
            ...(f?.details ? [{ id: "b2", type: "details", visible: true, text: f.details }] : []),
          ],
        };
      }
      const images = new Map();
      if (fixture.photo) { doc.assetRefs = ["photo"]; images.set("photo", bitmap); }
      try {
        const result = await inspect(composeScene(doc, [record]), images);
        const name = `${label}__${template.id}__${sizeId}`;
        await keep(name, result.canvas);
        rows.push({ fixture: label, template: template.id, size: sizeId, issues: result.issues, smallest: result.smallest, shrunk: result.shrunk });
      } catch (error) {
        rows.push({ fixture: label, template: template.id, size: sizeId, issues: [{ type: "exception", message: String(error?.stack ?? error) }] });
      }
    };
    for (const fixture of chosen)
      for (const template of templates)
        for (const sizeId of Object.keys(sizes))
          await run(fixture, template, sizeId, template.palette, fixture.name);
    if (!only || only.includes("colours"))
      for (const palette of palettes)
        for (const template of templates)
          await run({ name: "colours", kind: "event-flyer", patch: events.typical }, template, "a4", palette.id, `colour-${palette.id}`);
    return rows;
  }, only);

  await writeFile(`${out}/report.json`, JSON.stringify(rows, null, 1));
  const counts = {};
  for (const row of rows)
    for (const issue of row.issues) counts[issue.type] = (counts[issue.type] ?? 0) + 1;
  console.log("renders:", rows.length);
  console.log("issues by type:", counts);
  console.log("page errors:", pageErrors.slice(0, 5));
} finally {
  await browser.close();
}
