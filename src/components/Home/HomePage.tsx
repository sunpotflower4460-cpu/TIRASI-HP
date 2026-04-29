import type { EventData } from "../../types/event";
import "../../styles/home.css";
import "../../styles/home-extra.css";
import "../../styles/home-responsive.css";

type HomePageProps = {
  eventData: EventData;
  onOpenFlyer: () => void;
  onEdit: () => void;
};

export function HomePage({ eventData, onOpenFlyer, onEdit }: HomePageProps) {
  const acts = eventData.schedule.filter((item) => item.type === "act");

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-kicker">{eventData.venueSubtitle}</p>
          <h1>
            {eventData.title}
            <span>{eventData.subtitle} {eventData.volume}</span>
          </h1>
          <p className="home-lead">
            館林でひらく小さなアコースティックライブ。音、おむすび、人の気配がふわっと重なる春のイベントです。
          </p>
          <div className="home-cta-row">
            <button type="button" onClick={onOpenFlyer}>A4チラシを見る</button>
            <button type="button" className="secondary" onClick={onEdit}>内容を編集</button>
          </div>
        </div>

        <aside className="home-event-card">
          <p className="card-label">Event</p>
          <div className="home-date">{eventData.date} <span>({eventData.day})</span></div>
          <p className="home-start">Start {eventData.startTime}</p>
          <p className="home-price">{eventData.price}</p>
          <p className="home-place">{eventData.venue.name}</p>
        </aside>
      </section>

      <section className="home-section home-summary-grid">
        <article>
          <p className="home-section-label">About</p>
          <h2>イベント概要</h2>
          <p>{eventData.organizer}</p>
          <p className="soft-text">しののめむすびは11:00より営業中。ライブ開始まで、会場の空気ごとゆっくり楽しめます。</p>
        </article>
        <article>
          <p className="home-section-label">Open Mic</p>
          <h2>{eventData.openMic.title}</h2>
          <p>{eventData.openMic.time}</p>
          <p className="soft-text">{eventData.openMic.headline}</p>
        </article>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <p className="home-section-label">Schedule</p>
          <h2>Time Schedule</h2>
        </div>
        <div className="home-schedule-list">
          {eventData.schedule.map((item, index) => {
            if (item.type === "act") {
              return (
                <div className="home-schedule-row" key={`${item.type}-${index}`}>
                  <span>{item.time}</span>
                  <strong>{item.name}</strong>
                </div>
              );
            }

            return (
              <div className={`home-schedule-row ${item.type}`} key={`${item.type}-${index}`}>
                <span>{item.type === "break" ? "Break" : "End"}</span>
                <strong>{item.label}</strong>
              </div>
            );
          })}
        </div>
        <p className="home-act-count">出演予定: {acts.length}組</p>
      </section>

      <section className="home-section home-openmic-section">
        <div>
          <p className="home-section-label">After Event</p>
          <h2>{eventData.openMic.title}</h2>
          <p className="home-openmic-time">{eventData.openMic.time}</p>
          <p>{eventData.openMic.note}</p>
          <p>{eventData.openMic.closeNote}</p>
        </div>
        <div className="home-order-badge">{eventData.openMic.lastOrder}</div>
      </section>

      <section className="home-section home-access-section">
        <div>
          <p className="home-section-label">Access</p>
          <h2>{eventData.venue.name}</h2>
          <p>{eventData.venue.address}</p>
          <a href={eventData.venue.url} target="_blank" rel="noreferrer">
            {eventData.venue.url.replace("https://", "")}
          </a>
        </div>
        <div className="home-socials">
          {eventData.socials.map((social) => (
            <a href={social.url} target="_blank" rel="noreferrer" key={social.label}>
              ◎ {social.label}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
