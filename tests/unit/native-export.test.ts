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

// --- native bridge (the plugins are replaced with fakes) -----------------------------
import { afterEach, beforeEach, vi } from "vitest";

const calls: string[] = [];
const fakes = vi.hoisted(() => ({
  shareError: undefined as unknown,
  mediaError: undefined as unknown,
  written: [] as string[],
  shared: [] as unknown[],
  saved: [] as unknown[],
}));
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Cache: "CACHE" },
  Filesystem: {
    readdir: async () => {
      calls.push("readdir");
      // One export from long ago and one from just now.
      return { files: [{ name: "1000" }, { name: String(Date.now()) }] };
    },
    rmdir: async (options: { path: string }) => {
      calls.push(`rmdir:${options.path}`);
    },
    writeFile: async (options: { path: string; data: string }) => {
      calls.push("writeFile");
      fakes.written.push(options.path);
      return { uri: `file:///cache/${options.path}` };
    },
  },
}));
vi.mock("@capacitor/share", () => ({
  Share: {
    share: async (options: unknown) => {
      if (fakes.shareError) throw fakes.shareError;
      fakes.shared.push(options);
      return {};
    },
  },
}));
vi.mock("@capacitor-community/media", () => ({
  Media: {
    savePhoto: async (options: unknown) => {
      if (fakes.mediaError) throw fakes.mediaError;
      fakes.saved.push(options);
      return { identifier: "id" };
    },
  },
}));

describe("native bridge", () => {
  beforeEach(() => {
    calls.length = 0;
    fakes.shareError = undefined;
    fakes.mediaError = undefined;
    fakes.written.length = 0;
    fakes.shared.length = 0;
    fakes.saved.length = 0;
    // Node has no FileReader; the bridge only needs readAsDataURL.
    (globalThis as { FileReader?: unknown }).FileReader = class {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      error = null;
      readAsDataURL() {
        this.result = "data:image/png;base64,QUJD";
        queueMicrotask(() => this.onload?.());
      }
    };
  });
  afterEach(() => {
    delete (globalThis as { FileReader?: unknown }).FileReader;
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
  });

  it("detects the app through Capacitor.isNativePlatform", () => {
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    expect(isNativeApp()).toBe(true);
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => false };
    expect(isNativeApp()).toBe(false);
  });

  it("removes only old exports, then writes the file under its own name and shares it", async () => {
    const { shareFileNative } = await import("../../src/export/native");
    const outcome = await shareFileNative(new Blob(["x"]), "生音-vol.6.png", "生音");
    expect(outcome).toBe("shared");
    expect(calls).toEqual(["readdir", "rmdir:export/1000", "writeFile"]);
    expect(fakes.written[0]).toMatch(/^export\/\d+\/生音-vol\.6\.png$/);
    expect(fakes.shared[0]).toMatchObject({ title: "生音", files: [expect.stringContaining("生音-vol.6.png")] });
  });

  it("reports a dismissed share sheet as cancelled and rethrows real failures", async () => {
    const { shareFileNative } = await import("../../src/export/native");
    fakes.shareError = new Error("Share canceled");
    expect(await shareFileNative(new Blob(["x"]), "a.png")).toBe("cancelled");
    fakes.shareError = new Error("disk full");
    await expect(shareFileNative(new Blob(["x"]), "a.png")).rejects.toThrow("disk full");
  });

  it("saves to Photos and maps a refused permission to a readable error", async () => {
    const { savePhotoNative, PhotoAccessDeniedError } = await import("../../src/export/native");
    await savePhotoNative(new Blob(["x"]), "a.png");
    expect(fakes.saved[0]).toMatchObject({ path: expect.stringMatching(/^file:\/\/\/cache\/export\/\d+\/a\.png$/) });
    fakes.mediaError = Object.assign(new Error("Access to photos not allowed by user"), { code: "accessDenied" });
    await expect(savePhotoNative(new Blob(["x"]), "a.png")).rejects.toBeInstanceOf(PhotoAccessDeniedError);
    fakes.mediaError = new Error("Unable to save image to album");
    await expect(savePhotoNative(new Blob(["x"]), "a.png")).rejects.toThrow("Unable to save image to album");
  });

  it("reports JSON exports as shared, cancelled or failed instead of always done", async () => {
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    const { downloadJson, exportNotice } = await import("../../src/export/files");
    expect(await downloadJson({ a: 1 }, "backup.json")).toBe("shared");
    expect(fakes.written[0]).toMatch(/\/backup\.json$/);
    fakes.shareError = new Error("Share canceled");
    expect(await downloadJson({ a: 1 }, "backup.json")).toBe("cancelled");
    fakes.shareError = new Error("disk full");
    expect(await downloadJson({ a: 1 }, "backup.json")).toBe("failed");
    expect(exportNotice("shared", "done")).toBe("done");
    expect(exportNotice("downloaded", "done")).toBe("done");
    expect(exportNotice("cancelled", "done")).toContain("キャンセル");
    expect(exportNotice("failed", "done")).toContain("できませんでした");
  });
});
