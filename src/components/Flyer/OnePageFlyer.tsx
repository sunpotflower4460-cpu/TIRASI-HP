import type { EventData, ScheduleItem } from "../../types/event";
import "../../styles/one-page-flyer.css";

function nl2br(text: string) {
  const lines = text.split("\n");
  return lines.map((line, index) => (
    <span key={`${line}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  if (item.type === "break") {
    return <div className="one-page-break">☕ {item.label}</div>;
  }

  if (item.type === "end") {
    return <div className="one-page-end">{item.label}</div>;
  }

  return (
    <div className="one-page-schedule-row">
      <span className="one-page-time">{item.time}</span>
      <strong>{item.name}</strong>
    </div>
  );
}

export function OnePageFlyer({ eventData, onPrint }: { eventData: EventData; onPrint: () => void }) {
  return (
    <main className="one-page-flyer-page">
      <div className="one-page-toolbar print-hidden">
        <button type="button" onClick={onPrint}>PDF / 印刷</button>
      </div>

      <article className="one-page-sheet">
        <header className="one-page-header">
          <p className="one-page-kicker">{eventData.venueSubtitle}</p>
          <div className="one-page-title-row">
            <div>
              <h1>{eventData.title}</h1>
              <p className="one-page-subtitle">{eventData.subtitle} <span>{eventData.volume}</span></p>
            </div>
            <div className="one-page-date">
              <strong>{eventData.date}</strong>
              <span>({eventData.day})</span>
            </div>
          </div>
          <p className="one-page-organizer">{eventData.organizer}</p>
          <div className="one-page-badges">
            <span>{eventData.price}</span>
            <span>Start {eventData.startTime}</span>
          </div>
          <p className="one-page-note">{nl2br(eventData.statusNote)}</p>
        </header>

        <section className="one-page-main-grid">
          <section className="one-page-schedule">
            <h2>Time Schedule</h2>
            <div className="one-page-schedule-list">
              {eventData.schedule.map((item, index) => (
                <ScheduleRow item={item} key={`${item.type}-${index}`} />
              ))}
            </div>
          </section>

          <aside className="one-page-side">
            <section className="one-page-open-mic">
              <h2>{eventData.openMic.title}</h2>
              <strong>{eventData.openMic.time}</strong>
              <p>{eventData.openMic.lastOrder}</p>
              <p className="one-page-open-headline">{eventData.openMic.headline}</p>
              <small>{eventData.openMic.note} / {eventData.openMic.closeNote}</small>
            </section>

            <section className="one-page-access">
              <h2>{eventData.venue.name}</h2>
              <p>{eventData.venue.address}</p>
              <p>{eventData.venue.url.replace("https://", "")}</p>
            </section>
          </aside>
        </section>

        <footer className="one-page-footer">
          {eventData.socials.map((social) => (
            <span key={social.label}>◎ {social.label}</span>
          ))}
        </footer>
      </article>
    </main>
  );
}
