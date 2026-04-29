import type { EventData } from "../../types/event";

type HomeFlyerPreviewProps = {
  eventData: EventData;
  onOpenFlyer: () => void;
};

export function HomeFlyerPreview({ eventData, onOpenFlyer }: HomeFlyerPreviewProps) {
  const visibleActs = eventData.schedule.filter((item) => item.type === "act").slice(0, 4);

  return (
    <section className="home-section home-flyer-preview-section">
      <div className="home-flyer-preview-copy">
        <p className="home-section-label">Flyer</p>
        <h2>A4チラシもそのまま作れます</h2>
        <p>
          HPでイベントを伝えつつ、同じ内容から印刷用のA4チラシも確認できます。
          編集画面で直した内容は、このチラシにも反映されます。
        </p>
        <button type="button" onClick={onOpenFlyer}>A4プレビューを開く</button>
      </div>

      <button type="button" className="mini-flyer-card" onClick={onOpenFlyer} aria-label="A4チラシプレビューを開く">
        <span className="mini-flyer-kicker">{eventData.venueSubtitle}</span>
        <strong className="mini-flyer-title">{eventData.title}</strong>
        <span className="mini-flyer-subtitle">{eventData.subtitle} {eventData.volume}</span>
        <span className="mini-flyer-date">{eventData.date} ({eventData.day})</span>
        <span className="mini-flyer-price">{eventData.price}</span>
        <span className="mini-flyer-start">Start {eventData.startTime}</span>
        <span className="mini-flyer-line" />
        {visibleActs.map((item, index) => (
          <span className="mini-flyer-act" key={`${item.name}-${index}`}>
            <small>{item.time}</small>
            <b>{item.name}</b>
          </span>
        ))}
      </button>
    </section>
  );
}
