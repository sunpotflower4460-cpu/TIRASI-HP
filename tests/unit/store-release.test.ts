import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import metadata from "../../docs/appstore/metadata.json";
import licenses from "../../src/store/licenses.json";
import legal from "../../src/store/legal.json";
import { planCounts, productIds } from "../../src/plan/entitlements";

describe("App Store release material", () => {
  it("keeps every listing text inside the App Store limits and matches the product ids", () => {
    expect(execFileSync("node", ["scripts/store-release.mjs", "listing"], { encoding: "utf8" })).toContain("within the limits");
    expect(metadata.inAppPurchases.map((item) => item.productId).sort()).toEqual(Object.values(productIds).sort());
  });

  it("promises in the description exactly what the plans unlock", () => {
    const free = planCounts("free");
    const standard = planCounts("standard");
    const full = planCounts("full");
    expect(metadata.description).toContain(`無料：${free.designs}デザイン、${free.palettes}配色`);
    expect(metadata.description).toContain(`スタンダード：${standard.designs}デザイン、${standard.palettes}配色、全サイズ、画像加工${standard.effects}種類`);
    expect(metadata.description).toContain(`フル：全${full.designs}デザイン、全${full.palettes}配色、全サイズ、画像加工${full.effects}種類`);
  });

  it("ships a notice for every bundled component", () => {
    for (const name of ["react", "react-dom", "html2canvas", "@capacitor/core", "@capacitor-community/media", "SDWebImage", "NotoSansJP", "BudouX"])
      expect(licenses.find((item) => item.name === name)?.text.length ?? 0, name).toBeGreaterThan(200);
  });

  it("states in the policy that nothing is collected", () => {
    expect(legal.intro).toContain("収集しません");
    expect(legal.appName).toBe(metadata.app.name);
  });
});
