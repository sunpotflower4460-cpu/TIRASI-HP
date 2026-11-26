import { readdirSync, readFileSync, statSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { en } from "../../src/i18n/en";
import { displayDay, language, resolveLanguage, tr } from "../../src/i18n";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(name) ? [path] : [];
  });

/** Every literal handed to tr() in the sources. */
function sourceKeys(): string[] {
  const keys = new Set<string>();
  for (const file of walk("src")) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.getText(source) === "tr") {
        const first = node.arguments[0];
        if (first && ts.isStringLiteralLike(first)) keys.add(first.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return [...keys];
}
const slots = (text: string) => [...new Set(text.match(/\{\d+\}/g) ?? [])].sort();

describe("the English text", () => {
  const keys = sourceKeys();

  it("covers every Japanese text, with the same values filled in", () => {
    expect(keys.length).toBeGreaterThan(700);
    expect(keys.filter((key) => en[key] === undefined)).toEqual([]);
    expect(keys.filter((key) => JSON.stringify(slots(key)) !== JSON.stringify(slots(en[key] ?? "")))).toEqual([]);
  });

  it("ships nothing of the venue edition's own names", () => {
    const table = Object.entries(en).flat().join("\n");
    expect(table).not.toMatch(/生音|Namaoto|しののめ|館林|ミツデ|mitsude|tatebayashi/i);
  });

  it("has no leftover entries and no Japanese left inside the English", () => {
    expect(Object.keys(en).filter((key) => !keys.includes(key))).toEqual([]);
    // The classic design keeps the venue's own name, which only the personal edition shows.
    const japanese = Object.values(en).filter((value) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(value));
    expect(japanese).toEqual([]);
  });
});

describe("choosing the language", () => {
  it("follows the device unless the person chose one", () => {
    expect(resolveLanguage("auto", ["ja-JP", "en-US"])).toBe("ja");
    expect(resolveLanguage("auto", ["en-GB"])).toBe("en");
    expect(resolveLanguage("auto", ["fr-FR"])).toBe("en");
    expect(resolveLanguage("ja", ["en-US"])).toBe("ja");
    expect(resolveLanguage("en", ["ja-JP"])).toBe("en");
  });

  it("stays Japanese outside the store app", () => {
    expect(language).toBe("ja");
    expect(tr("{0}件", 3)).toBe("3件");
    expect(displayDay("土")).toBe("土");
  });
});
