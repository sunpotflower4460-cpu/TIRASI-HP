import { useState } from "react";
import "../../styles/editor-gate.css";

const EDITOR_PASSCODE = "4460";

type EditorGateProps = {
  onUnlock: () => void;
  onBackHome: () => void;
};

export function EditorGate({ onUnlock, onBackHome }: EditorGateProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (passcode.trim() === EDITOR_PASSCODE) {
      setError("");
      onUnlock();
      return;
    }

    setError("合言葉が違います。");
  };

  return (
    <main className="editor-gate-page">
      <section className="editor-gate-card">
        <p className="eyebrow">Admin</p>
        <h1>管理者ログイン</h1>
        <p>
          編集画面は公開ページから隠しています。
          管理者用の合言葉を入力してください。
        </p>
        <label className="editor-gate-field">
          <span>合言葉</span>
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="合言葉を入力"
          />
        </label>
        {error ? <p className="editor-gate-error">{error}</p> : null}
        <div className="editor-gate-actions">
          <button type="button" onClick={submit}>開く</button>
          <button type="button" className="ghost" onClick={onBackHome}>HPへ戻る</button>
        </div>
        <p className="editor-gate-note">
          ※これは本格的な認証ではなく、公開ページで編集画面が見えすぎないようにする簡易ガードです。
        </p>
      </section>
    </main>
  );
}
