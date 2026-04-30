import type { EventData, ScheduleItem } from "../../types/event";
import { getExternalUrlLabel, getSafeExternalUrl } from "../../utils/safeExternalUrl";
import "../../styles/a4-compact-event.css";

type FlyerViewProps = {
  eventData: EventData;
  variant?: "web" | "a4";
  onEdit?: () => void;
  onPrint?: () => void;
  showEditButton?: boolean;
};

function nl2br(text: string) {
  const lines = text.split("\n");
  return lines.map((line, index) => (
    <span key={`${line}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

function TimetableItem({ item }: { item: ScheduleItem }) {
  if (item.type === "break") {
    return <div className="break-item">☕ {item.label}</div>;
  }

  if (item.type === "end") {
    return <div className="end-marker">{item.label}</div>;
  }

  return (
    <div className="act-item">
      <span className="act-time">{item.time}</span>
      <span className="act-name">{item.name}</span>
    </div>
  );
}

export function FlyerView({ eventData, variant = "web", onEdit, onPrint, showEditButton = true }: FlyerViewProps) {
  const flyerClassName = variant === "a4" ? "flyer-container a4-sheet compact-event-flyer" : "flyer-container";
  const venueUrl = getSafeExternalUrl(eventData.venue.url);

  return (
    <main className={variant === "a4" ? "flyer-page flyer-page-a4" : "flyer-page"}>
      <div className="toolbar print-hidden">
        <button type="button" onClick={onPrint}>印刷 / PDF保存</button>
        {showEditButton ? <button type="button" onClick={onEdit}>内容を編集</button> : null}
      </div>

      <article className={flyerClassName}>
        <div className="content-wrapper">
          <header className="flyer-header">
            <p className="subtitle">{eventData.venueSubtitle}</p>
            <h1>
              {eventData.title}
              <span className="title-subline">
                {eventData.subtitle} <span className="vol-badge">{eventData.volume}</span>
              </span>
            </h1>

            <div className="date-box">
              {eventData.date} <span>({eventData.day})</span>
            </div>

            <p className="venue-info">{eventData.organizer}</p>

            <div className="price-tag">{eventData.price}</div>
          </header>

          <section className="status-box">
            <p className="start-time">🕒 Start {eventData.startTime}</p>
            <p className="status-note">{nl2br(eventData.statusNote)}</p>
          </section>

          <section className="timetable">
            <h2 className="section-title">♫ Time Schedule</h2>
            {eventData.schedule.map((item, index) => (
              <TimetableItem item={item} key={`${item.type}-${index}`} />
            ))}
          </section>

          <section className="open-mic-card">
            <h3>🎤 {eventData.openMic.title}</h3>
            <div className="open-mic-time">{eventData.openMic.time}</div>
            <div className="order-info">{eventData.openMic.lastOrder}</div>
            <div className="open-mic-footer">
              <p className="open-mic-headline">{eventData.openMic.headline}</p>
              <p>
                {eventData.openMic.note}
                <br />
                {eventData.openMic.closeNote}
              </p>
            </div>
          </section>

          <footer className="flyer-footer">
            <div className="access-box">
              <p className="location-name">📍 {eventData.venue.name}</p>
              <p className="address">{eventData.venue.address}</p>
              {venueUrl ? (
                <a href={venueUrl} target="_blank" rel="noopener noreferrer" className="web-link">
                  {getExternalUrlLabel(venueUrl)}
                </a>
              ) : eventData.venue.url.trim() ? (
                <p className="web-link">{eventData.venue.url.trim()}</p>
              ) : null}
            </div>

            <div className="social-links">
              {eventData.socials.map((social, index) => {
                const socialUrl = getSafeExternalUrl(social.url);
                const key = `${social.label}-${index}`;

                if (!social.label.trim()) return null;

                return socialUrl ? (
                  <a href={socialUrl} target="_blank" rel="noopener noreferrer" className="social-btn" key={key}>
                    ◎ {social.label}
                  </a>
                ) : (
                  <span className="social-btn" key={key}>◎ {social.label}</span>
                );
              })}
            </div>
          </footer>
        </div>
      </article>
    </main>
  );
}
