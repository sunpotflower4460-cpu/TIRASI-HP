import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acquireImages, loadImages } from "../../src/studio/assets";
import { completed, openDatabase } from "../../src/storage/database";
const createBitmap = vi.fn(
  async (_source: Blob | ImageBitmap, options?: ImageBitmapOptions) => ({
    width: options?.resizeWidth ?? 4000,
    height: options?.resizeHeight ?? 4000,
    close: vi.fn(),
  }),
);
async function storeFixture(id: string) {
  const bytes = new Uint8Array(24);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x89504e47);
  view.setUint32(4, 0x0d0a1a0a);
  view.setUint32(16, 4000);
  view.setUint32(20, 4000);
  const db = await openDatabase();
  const tx = db.transaction("assets", "readwrite");
  const done = completed(tx);
  tx.objectStore("assets").put(new Blob([bytes], { type: "image/png" }), id);
  tx.objectStore("assets").put(
    {
      id,
      name: "fixture",
      mime: "image/png",
      width: 4000,
      height: 4000,
      bytes: 24,
      hash: "fixture",
    },
    `meta:${id}`,
  );
  await done;
}
beforeEach(() => {
  createBitmap.mockClear();
  vi.stubGlobal("createImageBitmap", createBitmap);
});
afterEach(() => vi.unstubAllGlobals());
describe("bounded shared preview images", () => {
  it("shares one 256px decode among 20 thumbnails, retains it until the last release, and exports full resolution separately", async () => {
    const id = "cache-shared";
    await storeFixture(id);
    const leases = await Promise.all(
      Array.from({ length: 20 }, () => acquireImages([id], 256)),
    );
    expect(createBitmap).toHaveBeenCalledTimes(1);
    const bitmap = leases[0].images.get(id)!;
    expect(bitmap.width).toBe(256);
    expect(leases.every((lease) => lease.images.get(id) === bitmap)).toBe(true);
    expect(leases[0].sourcePixels).toBe(16_000_000);
    const originals = await loadImages([id]);
    expect(createBitmap).toHaveBeenCalledTimes(2);
    expect(originals.get(id)?.width).toBe(4000);
    originals.forEach((image) => image.close());
    leases.slice(0, -1).forEach((lease) => lease.release());
    expect(bitmap.close).not.toHaveBeenCalled();
    leases[19].release();
    expect(bitmap.close).toHaveBeenCalledTimes(1);
    leases[19].release();
    expect(bitmap.close).toHaveBeenCalledTimes(1);
    const next = await acquireImages([id], 256);
    expect(createBitmap).toHaveBeenCalledTimes(3);
    next.release();
  });
  it("does not retain failed promises and can retry after the source is restored", async () => {
    const id = "cache-restored";
    await expect(acquireImages([id], 256)).rejects.toThrow("元画像");
    await storeFixture(id);
    const lease = await acquireImages([id], 256);
    expect(lease.images.get(id)?.width).toBe(256);
    lease.release();
  });
});
