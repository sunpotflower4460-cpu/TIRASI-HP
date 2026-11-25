// What each paid plan unlocks in the store app. Pure data and functions so the
// rules can be tested without a device or the App Store.
//
//   free      5 designs · 4 colours · A4 and square · 2 image effects
//   standard  11 designs · 8 colours · all sizes · 4 image effects   (600 yen)
//   full      everything                                             (1,200 yen)
//
// A design's own recommended colour is always usable with that design, so a
// design never opens in a colour the person has not paid for.
import { allTemplates, palettes, sizes, templateById, paletteById } from "../studio/registry";
import type { SizeId, TemplateId } from "../studio/registry";
import { effects } from "../studio/document";
import type { CreativeDocument, EffectId } from "../studio/document";

export type Tier = "free" | "standard" | "full";
export const tierRank: Record<Tier, number> = { free: 0, standard: 1, full: 2 };
export const tierName: Record<Tier, string> = { free: "無料", standard: "スタンダード", full: "フル" };

export const productIds = {
  standard: "jp.tirasi.livechirashi.standard",
  full: "jp.tirasi.livechirashi.full",
  /** Standard owners pay only the difference; App Store non-consumables have no automatic upgrade price. */
  upgrade: "jp.tirasi.livechirashi.upgrade",
} as const;

export function tierFromPurchases(ids: readonly string[]): Tier {
  const owned = new Set(ids);
  if (owned.has(productIds.full)) return "full";
  if (owned.has(productIds.standard) && owned.has(productIds.upgrade)) return "full";
  // An upgrade without its standard purchase (for example after a refund) still
  // counts for what was paid: one step.
  if (owned.has(productIds.standard) || owned.has(productIds.upgrade)) return "standard";
  return "free";
}

const freeTemplates: TemplateId[] = ["livehouse", "acoustic", "botanical", "swiss", "information"];
const standardTemplates: TemplateId[] = ["citypop", "neon", "festival", "showa", "watercolor", "sticker"];
const freePalettes = ["mono", "autumn", "forest", "cobalt"];
const standardPalettes = ["city", "neon", "summer", "spring"];
const freeSizes: SizeId[] = ["a4", "square"];
const freeEffects: EffectId[] = ["fresh1985", "photocopy"];
const standardEffects: EffectId[] = ["aged1985", "film"];

export function templateTier(id: TemplateId): Tier {
  return freeTemplates.includes(id) ? "free" : standardTemplates.includes(id) ? "standard" : "full";
}
export function paletteTier(paletteId: string, templateId: TemplateId): Tier {
  if (templateById(templateId).palette === paletteId) return "free";
  return freePalettes.includes(paletteId) ? "free" : standardPalettes.includes(paletteId) ? "standard" : "full";
}
export function sizeTier(id: SizeId): Tier {
  return freeSizes.includes(id) ? "free" : "standard";
}
export function effectTier(id: EffectId): Tier {
  return freeEffects.includes(id) ? "free" : standardEffects.includes(id) ? "standard" : "full";
}

export type Requirement = { kind: "design" | "palette" | "size" | "effect"; label: string; tier: Tier };

const effectName = (id: EffectId) => effects.find((effect) => effect.id === id)?.label ?? id;

/** The parts of this document that need a higher plan than `owned`. Empty means it can be saved. */
export function lockedItems(doc: CreativeDocument, owned: Tier): Requirement[] {
  const needs: Requirement[] = [];
  const size = doc.design.sizeId;
  if (doc.kind === "image-treatment") {
    const effect = doc.content.recipe.preset;
    needs.push({ kind: "effect", label: `画像加工「${effectName(effect)}」`, tier: effectTier(effect) });
  } else {
    const template = doc.design.templateId;
    needs.push({ kind: "design", label: `デザイン「${templateById(template).label}」`, tier: templateTier(template) });
    needs.push({
      kind: "palette",
      label: `配色「${paletteById(doc.design.paletteId).label}」`,
      tier: paletteTier(doc.design.paletteId, template),
    });
  }
  needs.push({ kind: "size", label: `サイズ「${sizes[size].label}」`, tier: sizeTier(size) });
  return needs.filter((need) => tierRank[need.tier] > tierRank[owned]);
}

export const highestTier = (items: readonly Requirement[]): Tier =>
  items.reduce<Tier>((top, item) => (tierRank[item.tier] > tierRank[top] ? item.tier : top), "free");

/** Counts shown on the plan screen, derived from the same rules. */
export function planCounts(tier: Tier) {
  const allowed = (need: Tier) => tierRank[need] <= tierRank[tier];
  return {
    designs: allTemplates.filter((t) => t.id !== "legacy" && allowed(templateTier(t.id))).length,
    palettes: palettes.filter((p) => allowed(freePalettes.includes(p.id) ? "free" : standardPalettes.includes(p.id) ? "standard" : "full")).length,
    sizes: (Object.keys(sizes) as SizeId[]).filter((id) => allowed(sizeTier(id))).length,
    effects: effects.filter((effect) => allowed(effectTier(effect.id))).length,
  };
}
