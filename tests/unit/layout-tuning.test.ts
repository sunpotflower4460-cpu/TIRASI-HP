import { describe, expect, it } from "vitest";
import { initialWorkspace, parseWorkspace } from "../../src/domain/workspace";
import {
  createDocument,
  defaultPlacement,
  parseDocument,
} from "../../src/studio/document";
import type { Placement } from "../../src/studio/document";
import { composeScene } from "../../src/studio/scene";
import type { Scene, SceneNode } from "../../src/studio/scene";
import { sizes, templates } from "../../src/studio/registry";
import type { SizeId, TemplateId } from "../../src/studio/registry";
import { balanceHeadline } from "../../src/studio/typography";

function compose(
  templateId: TemplateId,
  sizeId: SizeId,
  placement: Partial<Placement> = {},
) {
  const state = parseWorkspace(initialWorkspace());
  const doc = createDocument("event-flyer", state.events[0]);
  doc.design.templateId = templateId;
  doc.design.sizeId = sizeId;
  doc.design.placements = { [sizeId]: { ...defaultPlacement, ...placement } };
  return composeScene(doc, state.events);
}
const facts = (scene: Scene) =>
  scene.nodes.filter(
    (node): node is Extract<SceneNode, { kind: "text" }> =>
      node.kind === "text" && node.id.startsWith("facts"),
  );
const others = (scene: Scene) =>
  scene.nodes.filter(
    (node) => node.kind === "text" && !node.id.startsWith("facts"),
  );

describe("fine adjustment of a block", () => {
  it("moves only the date block, by the chosen distance", () => {
    const before = compose("livehouse", "a4");
    const after = compose("livehouse", "a4", { factsY: -12 });
    expect(facts(after).map((node) => node.y)).toEqual(
      facts(before).map((node) => node.y - 12),
    );
    expect(others(after)).toEqual(others(before));
  });

  it("keeps every moved text inside the printable area of every design", () => {
    for (const template of templates)
      for (const sizeId of Object.keys(sizes) as SizeId[])
        for (const value of [-100, 100]) {
          const scene = compose(template.id, sizeId, {
            factsX: value,
            factsY: value,
            programX: value,
            programY: value,
            infoX: value,
            infoY: value,
          });
          for (const node of scene.nodes) {
            if (node.kind !== "text" && node.kind !== "flow") continue;
            if (node.id === "title" || node.id === "subtitle") continue;
            const where = `${template.id}/${sizeId}/${node.id}/${value}`;
            expect(node.x, where).toBeGreaterThanOrEqual(34.9);
            expect(node.x + node.w, where).toBeLessThanOrEqual(965.1);
            expect(node.y, where).toBeGreaterThanOrEqual(34.9);
          }
        }
  });

  it("accepts saved offsets, older placements without them, and rejects bad ones", () => {
    const state = parseWorkspace(initialWorkspace());
    const doc = createDocument("event-flyer", state.events[0]);
    doc.design.templateId = "livehouse";
    doc.design.paletteId = "mono";
    doc.design.placements = { a4: { ...defaultPlacement } };
    expect(parseDocument(doc).design.placements.a4).toEqual(defaultPlacement);
    doc.design.placements = { a4: { ...defaultPlacement, factsY: -24 } };
    expect(parseDocument(doc).design.placements.a4?.factsY).toBe(-24);
    doc.design.placements = { a4: { ...defaultPlacement, infoX: 101 } };
    expect(() => parseDocument(doc)).toThrow();
  });
});

describe("phrase-aware line breaks", () => {
  const width = (value: string) => Array.from(value).length * 10;
  const balance = (text: string, max: number, lines: string[]) =>
    balanceHeadline(text, max, width, lines, true);

  it("keeps a price with its label and currency mark", () => {
    const text = "前売 ¥2,500 / 当日 ¥3,000（1ドリンク別）";
    const lines = balance(text, 200, ["前売 ¥2,500 / 当日", "¥3,000（1ドリンク別）"]);
    expect(lines.length).toBe(2);
    for (const line of lines) expect(line).not.toMatch(/(当日|前売|¥)$/);
  });

  it("still breaks text that ends with one of those words", () => {
    const lines = balance("チケットの受付開始", 60, ["チケットの受", "付開始"]);
    expect(lines.join("")).toBe("チケットの受付開始");
    expect(lines.length).toBe(2);
  });
});
