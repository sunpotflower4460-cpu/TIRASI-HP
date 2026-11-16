// Kept as a compatible local-editor entry for integrations. It is not authentication.
export function EditorGate({ onUnlock, onBackHome }: { onUnlock: () => void; onBackHome: () => void }) {
  return <main className="empty-state"><h1>このブラウザで編集</h1><p>下書きは端末内だけに保存されます。公開HPは変更されません。この画面は認証機能ではありません。</p><button onClick={onUnlock}>編集を始める</button><button onClick={onBackHome}>公開HPへ戻る</button></main>;
}
