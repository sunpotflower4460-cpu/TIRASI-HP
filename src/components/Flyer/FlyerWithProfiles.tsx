import type { EventData } from "../../types/event";
import { FlyerPerformerProfiles } from "./FlyerPerformerProfiles";
import { FlyerView } from "./FlyerView";

export function FlyerWithProfiles(props: { eventData: EventData; onEdit: () => void; onPrint: () => void }) {
  const showProfiles = props.eventData.flyerOptions.showPerformerProfiles && props.eventData.performers.length > 0;

  return (
    <>
      <FlyerView
        eventData={props.eventData}
        variant="a4"
        onEdit={props.onEdit}
        onPrint={props.onPrint}
        showEditButton={false}
      />
      {showProfiles ? <FlyerPerformerProfiles performers={props.eventData.performers} /> : null}
    </>
  );
}
