import type { Workspace } from "../domain/workspace";
import { parseWorkspace } from "../domain/workspace";
import { array, object, string } from "../domain/validation";
import {
  getAssetBlob,
  getAssetMetadata,
  sha256,
  validateAsset,
} from "./assets";
import type { CreativeDocument } from "./document";
export const MAX_BACKUP_BYTES = 64 * 1024 * 1024;
export type BackupAsset = {
  id: string;
  name: string;
  mime: string;
  bytes: number;
  hash: string;
  data: string;
};
export type Backup = {
  schemaVersion: 2;
  kind: "tirasi-complete-backup";
  createdAt: string;
  workspace: Workspace;
  assets: BackupAsset[];
};
export function referencedAssets(workspace: Workspace): string[] {
  return [
    ...new Set(
      (workspace.documents as CreativeDocument[]).flatMap((d) => d.assetRefs),
    ),
  ];
}
function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  return btoa(binary);
}
export async function createBackup(workspace: Workspace): Promise<Backup> {
  const valid = parseWorkspace(workspace);
  const assets: BackupAsset[] = [];
  let total = 0;
  for (const id of referencedAssets(valid)) {
    const blob = await getAssetBlob(id);
    if (!blob)
      throw new Error(
        "元画像が欠損しています。完全バックアップを作成できません。画像を復元してください。",
      );
    const savedMeta = await getAssetMetadata(id);
    const meta = await validateAsset(blob, savedMeta?.name ?? id);
    total += (blob.size * 4) / 3;
    if (total > MAX_BACKUP_BYTES - 4 * 1024 * 1024)
      throw new Error(
        "バックアップ上限64MBを超えます。使う画像を軽量化してください。",
      );
    assets.push({
      id,
      name: meta.name,
      mime: meta.mime,
      bytes: blob.size,
      hash: meta.hash,
      data: base64(new Uint8Array(await blob.arrayBuffer())),
    });
  }
  const backup: Backup = {
    schemaVersion: 2,
    kind: "tirasi-complete-backup",
    createdAt: new Date().toISOString(),
    workspace: valid,
    assets,
  };
  if (new Blob([JSON.stringify(backup, null, 2)]).size > MAX_BACKUP_BYTES)
    throw new Error(
      "完全バックアップの上限64MBを超えます。制作物ごとの完全バックアップを保存してください。",
    );
  return backup;
}
export async function readBackup(file: File): Promise<{
  workspace: Workspace;
  assets: {
    id: string;
    blob: Blob;
    metadata?: import("./assets").AssetMetadata;
  }[];
}> {
  if (file.size > MAX_BACKUP_BYTES)
    throw new Error("完全バックアップは64MB以内にしてください。");
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new Error("バックアップのJSON形式が正しくありません。");
  }
  const input = object(json, "バックアップ");
  if (input.schemaVersion !== 2 || input.kind !== "tirasi-complete-backup")
    throw new Error("TIRASI完全バックアップを選択してください。");
  const workspace = parseWorkspace(input.workspace);
  const refs = new Set(referencedAssets(workspace));
  const ids = new Set<string>();
  const assets: {
    id: string;
    blob: Blob;
    metadata?: import("./assets").AssetMetadata;
  }[] = [];
  let total = 0;
  for (const v of array(input.assets, "素材", 100)) {
    const asset = object(v, "素材");
    const id = string(asset.id, "素材ID", 200);
    if (ids.has(id) || !refs.has(id))
      throw new Error("素材の参照が不正または重複しています。");
    ids.add(id);
    const encoded = string(asset.data, "素材データ", 12 * 1024 * 1024);
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))
      throw new Error("素材のエンコードが不正です。");
    let binary: string;
    try {
      binary = atob(encoded);
    } catch {
      throw new Error("素材を復号できません。");
    }
    total += binary.length;
    if (total > 45 * 1024 * 1024 || binary.length !== asset.bytes)
      throw new Error("素材の容量が不正です。");
    const mime = string(asset.mime, "素材形式", 100);
    const blob = new Blob([Uint8Array.from(binary, (c) => c.charCodeAt(0))], {
      type: mime,
    });
    const hash = await sha256(blob);
    if (hash !== asset.hash || id !== `asset-${hash}`)
      throw new Error(
        "素材の整合性チェックに失敗しました。元のバックアップを確認してください。",
      );
    const metadata = await validateAsset(
      blob,
      string(asset.name, "素材名", 500),
    );
    assets.push({ id, blob, metadata });
  }
  if ([...refs].some((id) => !ids.has(id)))
    throw new Error(
      "素材が欠けているため完全復元できません。現在の内容は変更していません。",
    );
  return { workspace, assets };
}
