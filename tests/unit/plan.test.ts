import { describe, expect, it } from "vitest";
import { createDocument } from "../../src/studio/document";
import type { CreativeDocument } from "../../src/studio/document";
import { templates, templateById } from "../../src/studio/registry";
import {
  lockedItems,
  planCounts,
  productIds,
  templateTier,
  tierFromPurchases,
} from "../../src/plan/entitlements";

const { standard, full, upgrade } = productIds;

const flyer = (design: Partial<CreativeDocument["design"]>): CreativeDocument => {
  const doc = createDocument("free-flyer");
  return { ...doc, design: { ...doc.design, templateId: "livehouse", paletteId: "mono", sizeId: "a4", ...design } };
};

describe("plans", () => {
  it("unlocks exactly what was promised for each plan", () => {
    expect(planCounts("free")).toEqual({ designs: 5, palettes: 4, sizes: 2, effects: 2 });
    expect(planCounts("standard")).toEqual({ designs: 11, palettes: 8, sizes: 4, effects: 4 });
    expect(planCounts("full")).toEqual({ designs: 20, palettes: 12, sizes: 4, effects: 6 });
  });

  it("maps purchases to a plan, including the upgrade path and refunds", () => {
    expect(tierFromPurchases([])).toBe("free");
    expect(tierFromPurchases([standard])).toBe("standard");
    expect(tierFromPurchases([full])).toBe("full");
    expect(tierFromPurchases([standard, upgrade])).toBe("full");
    expect(tierFromPurchases([upgrade])).toBe("standard");
    expect(tierFromPurchases(["something.else"])).toBe("free");
  });

  it("never locks a design's own recommended colour behind a higher plan than the design", () => {
    for (const template of templates) {
      const doc = flyer({ templateId: template.id, paletteId: template.palette });
      expect(lockedItems(doc, templateTier(template.id)), template.id).toEqual([]);
    }
  });

  it("lists what blocks saving, and nothing once the plan is high enough", () => {
    const doc = flyer({ templateId: "washi", paletteId: "plum", sizeId: "story" });
    expect(lockedItems(doc, "free").map((item) => item.kind)).toEqual(["design", "palette", "size"]);
    expect(lockedItems(doc, "standard").map((item) => item.kind)).toEqual(["design", "palette"]);
    expect(lockedItems(doc, "full")).toEqual([]);
    expect(templateById("washi").palette).not.toBe("plum");
  });

  it("gates image treatments by effect and size only", () => {
    const doc = createDocument("image-treatment") as Extract<CreativeDocument, { kind: "image-treatment" }>;
    const withEffect = (preset: typeof doc.content.recipe.preset): CreativeDocument => ({
      ...doc,
      design: { ...doc.design, templateId: "washi", paletteId: "plum" },
      content: { ...doc.content, recipe: { ...doc.content.recipe, preset } },
    });
    expect(lockedItems(withEffect("photocopy"), "free")).toEqual([]);
    expect(lockedItems(withEffect("film"), "free").map((item) => item.tier)).toEqual(["standard"]);
    expect(lockedItems(withEffect("neon"), "standard").map((item) => item.tier)).toEqual(["full"]);
  });
});
