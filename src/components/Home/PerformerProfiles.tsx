import type { EventData } from "../../types/event";

export function PerformerProfiles({ eventData }: { eventData: EventData }) {
  if (eventData.performers.length === 0) return null;

  return (
    <section className="home-section performer-section">
      <div className="home-section-heading">
        <p className="home-section-label">Artists</p>
        <h2>出演者紹介</h2>
      </div>
      <div className="performer-card-list">
        {eventData.performers.map((performer) => (
          <article className="performer-card" key={performer.id}>
            <div className="performer-card-body">
              <h3>{performer.name}</h3>
              {performer.catchcopy ? <p className="performer-catchcopy">{performer.catchcopy}</p> : null}
              {performer.bio ? <p className="performer-bio">{performer.bio}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
