import "../../styles/admin-guide.css";

const guideSteps = [
  "次回イベントを作る時は、まずイベント管理から現在のイベントを複製します。",
  "基本情報・日付・開始時間・会場情報を確認します。",
  "タイムスケジュールと出演者プロフィールを編集します。",
  "A4チラシ表示で収まり注意を確認します。",
  "A4ページを開き、PDF/印刷前に見た目を確認します。",
  "最後にJSON保存、必要ならイベント一覧保存でバックアップします。"
];

const checklistItems = [
  "日付・曜日・開始時間は正しい",
  "出演者名と順番は正しい",
  "Open Mic時間とラストオーダーは正しい",
  "会場名・住所・URLは正しい",
  "SNSリンクは開ける",
  "スマホ表示を確認した",
  "A4/PDF表示を確認した",
  "JSON保存または一覧保存でバックアップした"
];

export function AdminGuide() {
  return (
    <section className="editor-card admin-guide-card">
      <div className="card-heading">
        <div>
          <h2>管理者ガイド</h2>
          <p className="admin-guide-note">次回イベントを作る時の流れと、公開前の確認リストです。</p>
        </div>
      </div>

      <div className="admin-guide-grid">
        <article>
          <h3>使い方の流れ</h3>
          <ol className="admin-guide-steps">
            {guideSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>

        <article>
          <h3>公開前チェック</h3>
          <ul className="admin-checklist">
            {checklistItems.map((item) => (
              <li key={item}>
                <span aria-hidden="true">□</span>
                {item}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
