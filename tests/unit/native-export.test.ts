import { describe, expect, it } from "vitest";
import { buildImagePdf } from "../../src/export/pdf";
import { isNativeApp } from "../../src/export/native";

const text = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

describe("native export helpers", () => {
  it("is false in a plain browser", () => {
    expect(isNativeApp()).toBe(false);
  });

  it("builds a valid one-page PDF with correct xref offsets", () => {
    const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
    const pdf = buildImagePdf(fakeJpeg, 2480, 3508);
    const source = text(pdf);
    expect(source.startsWith("%PDF-1.4")).toBe(true);
    expect(source.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(source).toContain("/Count 1");
    expect(source).toContain("/Filter /DCTDecode");
    expect(source).toContain("/Width 2480 /Height 3508");
    expect(source).toContain(`/Length ${fakeJpeg.length}`);
    // A4 width, aspect ratio preserved.
    const media = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(source)!;
    expect(Number(media[1])).toBeCloseTo(595.28, 2);
    expect(Number(media[2])).toBeCloseTo((595.28 * 3508) / 2480, 1);
    // Every xref entry must point at "N 0 obj".
    const xrefStart = Number(/startxref\n(\d+)/.exec(source)![1]);
    expect(source.slice(xrefStart, xrefStart + 4)).toBe("xref");
    const entries = [...source.slice(xrefStart).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    expect(entries).toHaveLength(5);
    entries.forEach((offset, index) => {
      expect(source.slice(offset, offset + 7)).toBe(`${index + 1} 0 obj`);
    });
  });

  it("rejects an empty image size", () => {
    expect(() => buildImagePdf(new Uint8Array([1]), 0, 10)).toThrow();
  });
});
