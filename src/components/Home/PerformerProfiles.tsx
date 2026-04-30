import type { EventData, PerformerProfile } from "../../types/event";
import { getSafeExternalUrl } from "../../utils/safeExternalUrl";
import "../../styles/performer-profiles.css";

function getInitial(name: string) {
  return name.trim().slice(0, 1) || "音";
}

function PerformerCard({ performer }: { performer: PerformerProfile }) {
  const imageUrl = getSafeExternalUrl(performer.imageUrl);
  const linkUrl = getSafeExternalUrl(performer.linkUrl);
  const body = (
    <>
      <div className="performer-image-box">
        {imageUrl ? <img src={imageUrl} alt={performer.name} loading="lazy" /> : <span>{getInitial(performer.name)}</span>}
      </div>
      <div className="performer-card-body">
        <h3>{performer.name}</h3>
        {performer.catchcopy ? <p className="performer-catchcopy">{performer.catchcopy}</p> : null}
        {performer.bio ? <p className="performer-bio">{performer.bio}</p> : null}
      </div>
    </>
  );

  if (linkUrl) {
    return (
      <a className="performer-card" href={linkUrl} target="_blank" rel="noopener noreferrer">
        {body}
      </a>
    );
  }

  return <article className="performer-card">{body}</article>;
}

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
          <PerformerCard performer={performer} key={performer.id} />
        ))}
      </div>
    </section>
  );
}
