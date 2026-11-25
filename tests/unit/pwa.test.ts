import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (path: string) => readFile(join(root, path), "utf8");

describe("installable app assets", () => {
  it("ships an icon that iOS can composite without transparent corners", async () => {
    // iOS draws transparent pixels as black, so an opaque icon is a
    // requirement for the home screen, not a preference.
    const png = await sharp(join(root, "public/apple-touch-icon.png")).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    expect(png.info.width).toBe(180);
    expect(png.info.height).toBe(180);
    for (let i = 3; i < png.data.length; i += 4) {
      expect(png.data[i]).toBe(255);
    }
  });

  it("declares a standalone display and icons that exist on disk", async () => {
    const manifest = JSON.parse(await read("public/manifest.webmanifest"));
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.theme_color).toBe("#226454");
    expect(manifest.icons.map((icon: { purpose: string }) => icon.purpose)).toContain("maskable");
    for (const icon of manifest.icons) {
      const path = join(root, "public", icon.src.replace(/^\//, ""));
      const meta = await sharp(path).metadata();
      expect(`${meta.width}x${meta.height}`).toBe(icon.sizes);
    }
  });

  it("links the manifest and the touch icon from the document", async () => {
    const html = await read("index.html");
    expect(html).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="生音" />');
  });

  it("caches only same-origin GET requests and never serves a stale document over the network", async () => {
    const worker = await read("public/sw.js");
    // A navigation must reach the network first so a deployed update is used.
    expect(worker).toContain('request.mode === "navigate"');
    expect(worker).toContain('if (request.method !== "GET") return;');
    expect(worker).toContain('url.origin === self.location.origin');
  });
});
