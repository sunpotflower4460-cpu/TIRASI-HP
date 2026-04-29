import type { PerformerProfile } from "../../types/event";
import "../../styles/flyer-performer-profiles.css";

type FlyerPerformerProfilesProps = {
  performers: PerformerProfile[];
};

export function FlyerPerformerProfiles({ performers }: FlyerPerformerProfilesProps) {
  if (performers.length === 0) return null;

  return (
    <section className="flyer-performer-section">
      <h2 className="section-title">Artists</h2>
      <div className="flyer-performer-list">
        {performers.slice(0, 4).map((performer) => (
          <div className="flyer-performer-item" key={performer.id}>
            <strong>{performer.name}</strong>
            {performer.catchcopy ? <span>{performer.catchcopy}</span> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
