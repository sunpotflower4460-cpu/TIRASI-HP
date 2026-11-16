import { completed, openDatabase, request } from "../storage/database";
import { withTimeout } from "../export/files";
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
  if (bytes.length < 24) throw new Error("画像ファイルが壊れています。");
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
    "PNG・JPEG・WebPに対応しています。SVG・HEICや形式を偽装したファイルは読み込めません。",
  );
}
export async function sha256(blob: Blob): Promise<string> {
  if (!crypto.subtle)
    throw new Error(
      "画像の検証と完全バックアップにはHTTPSまたはlocalhostで開いてください。",
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
  name = "画像",
): Promise<AssetMetadata> {
  if (!blob.size || blob.size > MAX_ASSET_BYTES)
    throw new Error("画像は8MB以内にしてください。");
  const header = imageHeader(new Uint8Array(await blob.arrayBuffer()));
  if (blob.type && blob.type !== header.mime)
    throw new Error(
      "ファイルの種類と中身が一致しません。PNG・JPEG・WebPで保存し直してください。",
    );
  if (
    header.width <= 0 ||
    header.height <= 0 ||
    header.width > 8192 ||
    header.height > 8192 ||
    header.width * header.height > MAX_ASSET_PIXELS
  )
    throw new Error("画像は1600万画素以内、長辺8192px以内にしてください。");
  if (Math.max(header.width / header.height, header.height / header.width) > 30)
    throw new Error(
      "縦横比が極端な画像です。30:1以内にトリミングして読み込んでください。",
    );
  const bitmap = await withTimeout(
    createImageBitmap(blob, { imageOrientation: "from-image" }),
    20000,
    (image) => image.close(),
  );
  if (!bitmap.width || !bitmap.height) {
    bitmap.close();
    throw new Error("画像を読み込めませんでした。");
  }
  const hash = await sha256(blob);
  const metadata = {
    id: `asset-${hash}`,
    name,
    mime: header.mime,
    width: bitmap.width,
    height: bitmap.height,
    bytes: blob.size,
    hash,
  };
  bitmap.close();
  return metadata;
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
  return metadata;
}
export async function getAssetBlob(id: string): Promise<Blob | undefined> {
  const db = await openDatabase();
  const value = await request(
    db.transaction("assets").objectStore("assets").get(id),
  );
  return value instanceof Blob ? value : undefined;
}
export async function loadImages(
  ids: string[],
): Promise<Map<string, ImageBitmap>> {
  const images = new Map<string, ImageBitmap>();
  try {
    for (const id of ids) {
      const blob = await getAssetBlob(id);
      if (!blob)
        throw new Error(
          `元画像が見つかりません（${id.slice(0, 18)}）。画像入りバックアップを復元してください。`,
        );
      images.set(
        id,
        await withTimeout(
          createImageBitmap(blob, { imageOrientation: "from-image" }),
          20000,
          (image) => image.close(),
        ),
      );
    }
    return images;
  } catch (error) {
    images.forEach((image) => image.close());
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
