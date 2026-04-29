import type { EventData } from "../../types/event";
import "../../styles/visitor-info.css";

export function VisitorInfo({ eventData }: { eventData: EventData }) {
  return (
    <section className="home-section visitor-info-section">
      <div className="home-section-heading">
        <p className="home-section-label">For Visitors</p>
        <h2>当日のご案内</h2>
      </div>

      <div className="visitor-info-grid">
        <article className="visitor-info-card">
          <h3>当日の流れ</h3>
          <ol>
            <li>11:00ごろから、しののめむすびがおむすび屋さんとして営業しています。</li>
            <li>15:30からライブ企画が始まります。</li>
            <li>企画終了後は、19:30までOpen Micを予定しています。</li>
          </ol>
        </article>

        <article className="visitor-info-card">
          <h3>よくある質問</h3>
          <dl>
            <dt>観覧料はかかりますか？</dt>
            <dd>{eventData.price}です。</dd>
            <dt>Open Micだけ参加できますか？</dt>
            <dd>参加できます。Open Micのみ参加の場合はワンオーダーをお願いします。</dd>
          </dl>
        </article>

        <article className="visitor-info-card visitor-info-wide">
          <h3>アクセス補足</h3>
          <p>{eventData.venue.name}</p>
          <p>{eventData.venue.address}</p>
          <p className="visitor-info-note">初めて来る方は、会場URLや地図アプリで場所を確認してからお越しください。</p>
        </article>
      </div>
    </section>
  );
}
