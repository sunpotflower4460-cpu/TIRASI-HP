import { notifyAssetsStored } from "../storage/assetEvents";
import { completed, openDatabase, request } from "../storage/database";
import { withTimeout } from "../export/files";
import { tr } from "../i18n";
export const MAX_ASSET_BYTES = 8 * 1024 * 1024;
export const MAX_ASSET_PIXELS = 16_000_000;
export type AssetMetadata = {
  id: string;
  name: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  hash: string;
};
export function imageHeader(bytes: Uint8Array): {
  mime: string;
  width: number;
  height: number;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 24) throw new Error(tr("画像ファイルが壊れています。"));
  if (view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a)
    return {
      mime: "image/png",
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      offset += 2;
      if (marker === 0xd9 || marker === 0xda) break;
      if (
        marker === 0xff ||
        marker === 0x01 ||
        (marker >= 0xd0 && marker <= 0xd7)
      )
        continue;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      )
        return {
          mime: "image/jpeg",
          height: view.getUint16(offset + 3),
          width: view.getUint16(offset + 5),
        };
      offset += length;
    }
  }
  if (
    new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP"
  ) {
    const type = new TextDecoder().decode(bytes.subarray(12, 16));
    if (type === "VP8X" && bytes.length >= 30)
      return {
        mime: "image/webp",
        width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
        height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
      };
    if (type === "VP8 " && bytes.length >= 30)
      return {
        mime: "image/webp",
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    if (type === "VP8L" && bytes.length >= 25) {
      const bits = view.getUint32(21, true);
      return {
        mime: "image/webp",
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
  }
  throw new Error(
    tr("PNG・JPEG・WebPに対応しています。SVG・HEICや形式を偽装したファイルは読み込めません。"),
  );
}
export async function sha256(blob: Blob): Promise<string> {
  if (!crypto.subtle)
    throw new Error(
      tr("画像の検証と完全バックアップにはHTTPSまたはlocalhostで開いてください。"),
    );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await blob.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function validateAsset(
  blob: Blob,
  name = tr("画像"),
): Promise<AssetMetadata> {
  if (!blob.size || blob.size > MAX_ASSET_BYTES)
    throw new Error(tr("画像は8MB以内にしてください。"));
  const header = imageHeader(new Uint8Array(await blob.arrayBuffer()));
  if (blob.type && blob.type !== header.mime)
    throw new Error(
      tr("ファイルの種類と中身が一致しません。PNG・JPEG・WebPで保存し直してください。"),
    );
  if (
    header.width <= 0 ||
    header.height <= 0 ||
    header.width > 8192 ||
    header.height > 8192 ||
    header.width * header.height > MAX_ASSET_PIXELS
  )
    throw new Error(tr("画像は1600万画素以内、長辺8192px以内にしてください。"));
  if (Math.max(header.width / header.height, header.height / header.width) > 30)
    throw new Error(
      tr("縦横比が極端な画像です。30:1以内にトリミングして読み込んでください。"),
    );
  const bitmap = await withTimeout(
    createImageBitmap(blob, { imageOrientation: "from-image" }),
    20000,
    (image) => image.close(),
  );
  if (!bitmap.width || !bitmap.height) {
    bitmap.close();
    throw new Error(tr("画像を読み込めませんでした。"));
  }
  try {
    const hash = await sha256(blob);
    return {
      id: `asset-${hash}`,
      name,
      mime: header.mime,
      width: bitmap.width,
      height: bitmap.height,
      bytes: blob.size,
      hash,
    };
  } finally {
    bitmap.close();
  }
}
export async function storeAsset(
  blob: Blob,
  name: string,
): Promise<AssetMetadata> {
  const metadata = await validateAsset(blob, name);
  const db = await openDatabase();
  const tx = db.transaction("assets", "readwrite");
  const done = completed(tx);
  tx.objectStore("assets").put(blob, metadata.id);
  tx.objectStore("assets").put(metadata, `meta:${metadata.id}`);
  await done;
  notifyAssetsStored([metadata.id]);
  return metadata;
}
export async function getAssetBlob(id: string): Promise<Blob | undefined> {
  const db = await openDatabase();
  const value = await request(
    db.transaction("assets").objectStore("assets").get(id),
  );
  return value instanceof Blob ? value : undefined;
}
type DecodedAsset = { image: ImageBitmap; sourcePixels: number };
async function decodeAsset(
  id: string,
  maxDimension?: number,
): Promise<DecodedAsset> {
  const blob = await getAssetBlob(id);
  if (!blob)
    throw new Error(
      tr("元画像が見つかりません（{0}）。画像入りバックアップを復元してください。", id.slice(0, 18)),
    );
  const header = imageHeader(new Uint8Array(await blob.arrayBuffer()));
  if (
    !header.width ||
    !header.height ||
    header.width > 8192 ||
    header.height > 8192 ||
    header.width * header.height > MAX_ASSET_PIXELS
  )
    throw new Error(tr("画像は1600万画素以内、長辺8192px以内にしてください。"));
  const metadata = await getAssetMetadata(id);
  const sourcePixels = header.width * header.height;
  const decode = (source: Blob | ImageBitmap, options: ImageBitmapOptions) =>
    withTimeout(createImageBitmap(source, options), 20000, (image) =>
      image.close(),
    );
  if (!maxDimension)
    return {
      image: await decode(blob, { imageOrientation: "from-image" }),
      sourcePixels,
    };
  if (
    metadata &&
    Number.isFinite(metadata.width) &&
    Number.isFinite(metadata.height) &&
    metadata.width > 0 &&
    metadata.height > 0 &&
    metadata.width * metadata.height === sourcePixels
  ) {
    const ratio = Math.min(
      1,
      maxDimension / Math.max(metadata.width, metadata.height),
    );
    return {
      image: await decode(blob, {
        imageOrientation: "from-image",
        resizeWidth: Math.max(1, Math.round(metadata.width * ratio)),
        resizeHeight: Math.max(1, Math.round(metadata.height * ratio)),
        resizeQuality: "high",
      }),
      sourcePixels,
    };
  }
  const original = await decode(blob, { imageOrientation: "from-image" });
  try {
    const ratio = Math.min(
      1,
      maxDimension / Math.max(original.width, original.height),
    );
    return {
      image: await decode(original, {
        resizeWidth: Math.max(1, Math.round(original.width * ratio)),
        resizeHeight: Math.max(1, Math.round(original.height * ratio)),
        resizeQuality: "high",
      }),
      sourcePixels,
    };
  } finally {
    original.close();
  }
}

// Full-resolution bitmaps belong to a single export and are closed by that caller.
export async function loadImages(
  ids: string[],
): Promise<Map<string, ImageBitmap>> {
  const images = new Map<string, ImageBitmap>();
  try {
    for (const id of ids) images.set(id, (await decodeAsset(id)).image);
    return images;
  } catch (error) {
    images.forEach((image) => image.close());
    throw error;
  }
}

type CacheEntry = {
  refs: number;
  promise: Promise<DecodedAsset>;
  decoded?: DecodedAsset;
};
const previewCache = new Map<string, CacheEntry>();
export type ImageLease = {
  images: Map<string, ImageBitmap>;
  sourcePixels: number;
  release: () => void;
};
export async function acquireImages(
  ids: string[],
  maxDimension: number,
): Promise<ImageLease> {
  const entries = [...new Set(ids)].map((id) => {
    const key = JSON.stringify([id, maxDimension]);
    let entry = previewCache.get(key);
    if (!entry) {
      const created: CacheEntry = {
        refs: 0,
        promise: decodeAsset(id, maxDimension),
      };
      created.promise = created.promise.then(
        (decoded) => {
          created.decoded = decoded;
          if (!created.refs) {
            decoded.image.close();
            if (previewCache.get(key) === created) previewCache.delete(key);
          }
          return decoded;
        },
        (error) => {
          if (previewCache.get(key) === created) previewCache.delete(key);
          throw error;
        },
      );
      previewCache.set(key, created);
      entry = created;
    }
    entry.refs++;
    return { id, key, entry };
  });
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    for (const { key, entry } of entries) {
      entry.refs--;
      if (!entry.refs && entry.decoded) {
        entry.decoded.image.close();
        if (previewCache.get(key) === entry) previewCache.delete(key);
      }
    }
  };
  try {
    const values = await Promise.all(entries.map(({ entry }) => entry.promise));
    return {
      images: new Map(
        entries.map(({ id }, index) => [id, values[index].image]),
      ),
      sourcePixels: values.reduce(
        (total, value) => total + value.sourcePixels,
        0,
      ),
      release,
    };
  } catch (error) {
    release();
    throw error;
  }
}

export async function getAssetMetadata(
  id: string,
): Promise<AssetMetadata | undefined> {
  const db = await openDatabase();
  return request(
    db.transaction("assets").objectStore("assets").get(`meta:${id}`),
  );
}
