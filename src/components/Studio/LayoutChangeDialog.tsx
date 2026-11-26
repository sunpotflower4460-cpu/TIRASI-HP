import { useEffect, useId, useRef } from "react";
import { tr } from "../../i18n";
export function LayoutChangeDialog({
  onKeep,
  onCopy,
  onCancel,
}: {
  onKeep: () => void;
  onCopy: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="studio-alert layout-dialog"
      aria-label={tr("配置変更の確認")}
      aria-describedby={title}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={title}>{tr("調整済みの配置をどうしますか？")}</h2>
      <p>{tr("本文・上書き・非表示設定・元画像は保持します。現在の配置を残すか、新しいコピーに別の構図を適用できます。")}</p>
      <button onClick={onKeep}>{tr("現配置を保持し、おすすめ配色だけ使う")}</button>
      <button onClick={onCopy}>{tr("新しいコピーに構図を適用")}</button>
      <button onClick={onCancel} autoFocus>{tr("キャンセル")}</button>
    </dialog>
  );
}
