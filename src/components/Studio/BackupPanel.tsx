import { isStore } from "../../edition";
import { useRef, useState } from "react";
import type { Workspace } from "../../domain/workspace";
import { createBackup, readBackup } from "../../studio/backup";
import { downloadJson, downloadJsonOrAlert, exportNotice } from "../../export/files";
import {
  errorMessage,
  object,
  parseJson,
  readJsonFile,
  MAX_JSON_BYTES,
} from "../../domain/validation";
import { parseWorkspace } from "../../domain/workspace";
import { readRecovery } from "../../storage/database";
import { tr } from "../../i18n";
export function BackupPanel({
  workspace,
  restore,
}: {
  workspace: Workspace;
  restore: (
    value: Workspace,
    assets?: { id: string; blob: Blob }[],
  ) => Promise<void>;
}) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    workspace: Workspace;
    assets: { id: string; blob: Blob }[];
  }>();
  const selected =
    workspace.documents.find((doc) => doc.id === workspace.activeDocumentId) ??
    workspace.documents[0];
  const input = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="studio-backup print-hidden">
      <h2>{tr("保存・バックアップ")}</h2>
      <p>{tr("{0}内の保存は、端末のデータ削除や容量制限の影響を受けます。大切な制作物は画像入りバックアップをお持ちください。", isStore ? tr("アプリ") : tr("ブラウザ"))}</p>
      <div className="action-row">
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const backup = await createBackup(workspace);
              const outcome = await downloadJson(backup, "tirasi-complete-backup.json");
              setNotice(
                exportNotice(
                  outcome,
                  tr("原画像入りバックアップを書き出しました。端末に保存されたことを確認してください。画像の撮影位置などのEXIF情報も原本に含まれる場合があります。"),
                ),
              );
            })
          }
        >{tr("画像入り完全バックアップ")}</button>
        {selected && (
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const eventId =
                  selected.kind === "event-flyer"
                    ? selected.eventId
                    : workspace.activeEventId;
                const event =
                  workspace.events.find((event) => event.id === eventId) ??
                  workspace.events[0];
                const backup = await createBackup({
                  ...workspace,
                  events: [event],
                  activeEventId: event.id,
                  documents: [selected],
                  activeDocumentId: selected.id,
                });
                const outcome = await downloadJson(
                  backup,
                  `tirasi-${selected.name}-complete-backup.json`,
                );
                setNotice(
                  exportNotice(
                    outcome,
                    tr("この制作物と参照イベント・元画像の完全バックアップを出力しました。端末に保存されたことを確認してください。"),
                  ),
                );
              })
            }
          >{tr("この制作物だけ完全バックアップ")}</button>
        )}
        <button disabled={busy} onClick={() => input.current?.click()}>{tr("完全バックアップを復元")}</button>
        <button
          disabled={busy}
          onClick={() => void run(async () => {
            const payload = {
              schemaVersion: 2,
              kind: "workspace-json",
              workspace,
            };
            if (
              new Blob([JSON.stringify(payload, null, 2)]).size > MAX_JSON_BYTES
            ) {
              setNotice(
                tr("JSONのみ保存は4MB以内です。完全バックアップ、または制作物ごとの完全バックアップを使ってください。"),
              );
              return;
            }
            const outcome = await downloadJson(payload, "tirasi-workspace-no-images.json");
            setNotice(
              exportNotice(
                outcome,
                tr("JSONを出力しました。画像の実体は含みません。別の端末への移動は完全バックアップを使ってください。"),
              ),
            );
          })}
        >{tr("JSONのみ保存（画像なし）")}</button>
        <button disabled={busy} onClick={() => jsonInput.current?.click()}>{tr("JSONのみ復元")}</button>
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const recovery = await readRecovery();
              if (!recovery) throw new Error(tr("直前の保存はまだありません。"));
              setPending({ workspace: recovery, assets: [] });
              setNotice(tr("直前の保存内容を確認してください。"));
            })
          }
        >{tr("直前の保存を確認")}</button>
        {!isStore && workspace.legacyBackup && (
          <button
            onClick={() =>
              downloadJsonOrAlert(
                workspace.legacyBackup,
                "tirasi-v1-original-keys.json",
              )
            }
          >{tr("移行前の原JSONを退避")}</button>
        )}
      </div>
      <input
        hidden
        type="file"
        ref={input}
        accept="application/json,.json"
        aria-label={tr("完全バックアップファイル")}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file)
            void run(async () => {
              const imported = await readBackup(file);
              setPending(imported);
              setNotice(
                tr("本文と画像の整合性を検査しました。内容を確認してから復元してください。"),
              );
            });
        }}
      />
      <input
        hidden
        type="file"
        ref={jsonInput}
        accept="application/json,.json"
        aria-label={tr("ワークスペースJSONファイル")}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file)
            void run(async () => {
              const input = object(parseJson(await readJsonFile(file)));
              const value =
                input.kind === "workspace-json" ? input.workspace : input;
              const imported = parseWorkspace(value);
              setPending({ workspace: imported, assets: [] });
              setNotice(
                tr("画像実体を含まないJSONです。画像を使う場合は{0}内に素材が必要です。", isStore ? tr("同じ端末") : tr("同じブラウザ")),
              );
            });
        }}
      />
      {pending && (
        <div className="studio-alert">
          <h3>{tr("復元内容の確認")}</h3>
          <p>{tr("現在: イベント{0}件・制作物{1}件 → 復元: イベント{2}件・制作物{3}件 / 同梱画像{4}件", workspace.events.length, workspace.documents.length, pending.workspace.events.length, pending.workspace.documents.length, pending.assets.length)}</p>
          <ul>
            {pending.workspace.documents.map((doc) => (
              <li key={doc.id}>{doc.name}</li>
            ))}
          </ul>
          <p>{tr("現在の一覧を置き換えます。先に現在の完全バックアップを保存できます。")}</p>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await restore(pending.workspace, pending.assets);
                setPending(undefined);
                setNotice(
                  isStore
                    ? tr("復元し、この端末に保存しました。")
                    : tr("復元し、このブラウザに保存しました。公開HPは変更されません。"),
                );
              })
            }
          >{tr("確認した内容で復元する")}</button>
          <button disabled={busy} onClick={() => setPending(undefined)}>{tr("キャンセル")}</button>
        </div>
      )}
      <p role="status" aria-live="polite">
        {busy ? tr("処理中… ") : ""}
        {notice || tr("端末へのバックアップはまだ確認していません。")}
      </p>
    </section>
  );
}
