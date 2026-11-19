import { describe, expect, it } from "vitest";
import { initialWorkspace } from "../../src/domain/workspace";
import {
  createDocument,
  changeTemplate,
  defaultPlacement,
  parseDocument,
  mapBlocks,
} from "../../src/studio/document";
import { templates, palettes, sizes } from "../../src/studio/registry";
import { composeScene, responsiveRecipe } from "../../src/studio/scene";
import { imageHeader } from "../../src/studio/assets";
import { seededRandom } from "../../src/studio/treatment";
const event = initialWorkspace().events[0];
function luminance(hex: string) {
  const values = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
const contrast = (a: string, b: string) =>
  (Math.max(luminance(a), luminance(b)) + 0.05) /
  (Math.min(luminance(a), luminance(b)) + 0.05);
describe("studio contracts", () => {
  it("has 20 unique composition recipes with 4 supported sizes and reflow for Story", () => {
    expect(templates).toHaveLength(20);
    expect(new Set(templates.map((t) => t.compositionSignature)).size).toBe(20);
    expect(
      new Set(
        templates.map((t) => JSON.stringify(responsiveRecipe(t.id, "a4"))),
      ).size,
    ).toBe(20);
    for (const t of templates) {
      expect(t.supportedSizes).toHaveLength(4);
      expect(responsiveRecipe(t.id, "story")).not.toEqual(
        responsiveRecipe(t.id, "a4"),
      );
    }
    expect(Object.keys(sizes)).toHaveLength(4);
  });
  it("has 12 palettes meeting AA for body and accent text pairs", () => {
    expect(palettes).toHaveLength(12);
    for (const p of palettes) {
      expect(contrast(p.paper, p.ink), p.id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.soft, p.ink), p.id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.paper, p.accent), p.id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.accent, p.onAccent), p.id).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("keeps blocks, overrides, hidden sections, image refs and all size placements through 20 switches and round trips", () => {
    let doc = createDocument("event-flyer", event);
    doc = {
      ...doc,
      assetRefs: ["asset-test"],
      design: {
        ...doc.design,
        placements: {
          a4: { ...defaultPlacement, titleX: 9 },
          story: { ...defaultPlacement, imageX: 34 },
        },
        visibility: { ...doc.design.visibility, performers: false },
      },
    };
    if (doc.kind !== "event-flyer") throw new Error();
    doc.content.titleOverride = "この紙面だけ";
    doc.content.blocks = [
      { id: "b", text: "独自の本文", type: "text", visible: false },
    ];
    const original = structuredClone(doc);
    for (const t of templates) doc = changeTemplate(doc, t.id);
    expect(doc.assetRefs).toEqual(original.assetRefs);
    expect(doc.design.placements).toEqual(original.design.placements);
    expect(doc.design.visibility).toEqual(original.design.visibility);
    expect(doc.content).toEqual(original.content);
    expect(parseDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
    expect(event.eventData.title).toBe("生音");
  });
  it("free mode does not require event fields and treatment stores the original reference and recipe", () => {
    const free = createDocument("free-flyer");
    expect(parseDocument(free)).toEqual(free);
    expect(
      composeScene(free, []).nodes.some(
        (n) => n.kind === "text" && n.text.includes("Open Mic"),
      ),
    ).toBe(false);
    const treatment = createDocument("image-treatment");
    expect(parseDocument(treatment)).toEqual(treatment);
    expect(mapBlocks(free, (b) => [...b].reverse()).kind).toBe("free-flyer");
  });
  it("rejects unknown kinds, unsafe prototypes, bad placement values and malformed blocks", () => {
    const doc = createDocument("free-flyer");
    expect(() => parseDocument({ ...doc, kind: "free" })).toThrow();
    expect(() =>
      parseDocument({
        ...doc,
        design: { ...doc.design, sizeId: "constructor" },
      }),
    ).toThrow();
    expect(() =>
      parseDocument({
        ...doc,
        design: {
          ...doc.design,
          placements: { a4: { ...defaultPlacement, zoom: Infinity } },
        },
      }),
    ).toThrow();
    expect(() =>
      parseDocument({ ...doc, content: { blocks: [null] } }),
    ).toThrow();
  });
  it("distinguishes linked content, snapshots, and explicit overrides", () => {
    const linked = createDocument("event-flyer", event);
    linked.design.templateId = "citypop";
    if (linked.kind !== "event-flyer") throw new Error();
    const updatedEvent = {
      ...event,
      eventData: { ...event.eventData, title: "Changed event" },
    };
    const title = (doc: typeof linked) =>
      composeScene(doc, [updatedEvent]).nodes.find(
        (n) => n.kind === "text" && n.id === "title",
      );
    expect(title(linked)).toMatchObject({ text: "Changed event" });
    expect(title({ ...linked, contentBinding: "snapshot" })).toMatchObject({
      text: "生音",
    });
    expect(
      title({
        ...linked,
        content: { ...linked.content, titleOverride: "Override" },
      }),
    ).toMatchObject({ text: "Override" });
  });
  it("rejects non-images before decoding and reads PNG dimensions before allocating pixels", () => {
    expect(() =>
      imageHeader(
        new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        ),
      ),
    ).toThrow();
    const bytes = new Uint8Array(24);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 0x89504e47);
    view.setUint32(4, 0x0d0a1a0a);
    view.setUint32(16, 99999);
    view.setUint32(20, 99999);
    expect(imageHeader(bytes)).toMatchObject({ width: 99999, height: 99999 });
  });
  it("uses reproducible texture seeds", () => {
    const a = seededRandom(1985),
      b = seededRandom(1985),
      c = seededRandom(1986);
    const first = Array.from({ length: 30 }, a);
    expect(first).toEqual(Array.from({ length: 30 }, b));
    expect(first).not.toEqual(Array.from({ length: 30 }, c));
  });
});
describe("snapshot normalization", () => {
  it("fills optional legacy snapshot fields without mutating the import object", () => {
    const doc = createDocument("event-flyer", event);
    if (doc.kind !== "event-flyer") throw new Error();
    const imported = JSON.parse(JSON.stringify(doc));
    delete imported.snapshot.performers;
    const parsed = parseDocument(imported);
    expect(imported.snapshot.performers).toBeUndefined();
    if (parsed.kind !== "event-flyer") throw new Error();
    expect(parsed.snapshot.performers).toEqual([]);
  });
});

describe("event date typesetting", () => {
  const texts = (doc: ReturnType<typeof createDocument>, events = [event]) =>
    Object.fromEntries(
      composeScene(doc, events)
        .nodes.filter((node) => node.kind === "text")
        .map((node) => [
          (node as { id: string }).id,
          (node as { text: string }).text,
        ]),
    );
  it("turns a parseable date into a display numeral with year, weekday, start and price", () => {
    for (const template of templates.filter(
      (t) => !["swiss", "information"].includes(t.id),
    )) {
      const doc = createDocument("event-flyer", event);
      doc.design.templateId = template.id;
      const t = texts(doc);
      expect(t["facts-date"], template.id).toBe("5/9");
      expect(`${t["facts-year"] ?? ""} ${t["facts-weekday"]}`).toContain(
        "2026",
      );
      expect(t["facts-weekday"]).toContain("SAT (土)");
      expect(t["facts-detail"]).toContain("開始 14:30");
      expect(t["facts-detail"]).toContain("観覧無料");
      expect(t.facts).toBeUndefined();
    }
  });
  it("keeps the writer's separator and falls back to the original line for free-form dates", () => {
    const dotted = {
      ...event,
      eventData: { ...event.eventData, date: "2026.12.24" },
    };
    const doc = createDocument("event-flyer", dotted);
    doc.design.templateId = "citypop";
    expect(texts(doc, [dotted])["facts-date"]).toBe("12.24");
    const loose = {
      ...event,
      eventData: {
        ...event.eventData,
        date: "5月上旬",
        dayOverride: true,
        day: "未定",
      },
    };
    const free = createDocument("event-flyer", loose);
    free.design.templateId = "citypop";
    const t = texts(free, [loose]);
    expect(t["facts-date"]).toBeUndefined();
    expect(t.facts).toContain("5月上旬");
  });
});

describe("boundary text handling", () => {
  const withEvent = (patch: Record<string, unknown>) => ({
    ...event,
    eventData: { ...event.eventData, ...patch },
  });
  const flowTexts = (
    doc: ReturnType<typeof createDocument>,
    events: unknown[],
  ) =>
    composeScene(doc, events as never)
      .nodes.flatMap((node) => (node.kind === "flow" ? node.blocks : []))
      .map((block) => block.text);
  it("moves a long price from the date strip into the details column", () => {
    const longPrice = "前売 2,500円 / 当日 3,000円（1ドリンク別）";
    const record = withEvent({ price: longPrice });
    const doc = createDocument("event-flyer", record);
    doc.design.templateId = "acoustic";
    const scene = composeScene(doc, [record]);
    const text = (id: string) =>
      scene.nodes.find((node) => node.kind === "text" && node.id === id) as
        | { text: string }
        | undefined;
    expect(text("facts-detail")?.text).toBe("開始 14:30");
    expect(flowTexts(doc, [record])).toContain(longPrice);
    // A short price stays where readers expect it.
    const short = createDocument("event-flyer", event);
    short.design.templateId = "acoustic";
    expect(flowTexts(short, [event])).not.toContain("観覧無料");
  });
  it("gives washi a wide headline slot when the title cannot be set vertically", () => {
    const widthOf = (title: string) => {
      const record = withEvent({ title });
      const doc = createDocument("event-flyer", record);
      doc.design.templateId = "washi";
      const node = composeScene(doc, [record]).nodes.find(
        (n) => n.kind === "text" && n.id === "title",
      ) as { w: number; vertical?: boolean };
      return node;
    };
    const short = widthOf("生音");
    const long = widthOf("館林みつで通り春のおおきな音楽祭スペシャル");
    expect(short.vertical).toBe(true);
    expect(long.vertical).toBeFalsy();
    expect(long.w).toBeGreaterThan(short.w * 2);
  });
});

describe("free-flyer typography", () => {
  it("keeps the author's heading, body and details in their own typographic roles", () => {
    const doc = createDocument("free-flyer");
    if (doc.kind !== "free-flyer") throw new Error();
    doc.content.blocks = [
      { id: "h", type: "heading", text: "今月の展示", visible: true },
      { id: "p", type: "text", text: "小さな陶器が並びます。", visible: true },
      { id: "d", type: "details", text: "入場無料", visible: true },
      { id: "x", type: "heading", text: "下書き", visible: false },
    ];
    const scene = composeScene(doc, []);
    const runs = scene.nodes.flatMap((n) =>
      n.kind === "flow" ? n.blocks : [],
    );
    expect(runs.map((n) => n.text)).toEqual([
      "今月の展示",
      "小さな陶器が並びます。",
      "入場無料",
    ]);
    expect(runs[0].size).toBeGreaterThan(runs[1].size);
    expect(runs[0].family).not.toBe(runs[1].family);
  });
});
