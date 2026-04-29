import type { EventData } from "../../types/event";
import { FlyerView } from "./FlyerView";

export function FlyerWithProfiles(props: { eventData: EventData; onEdit: () => void; onPrint: () => void }) {
  return <FlyerView eventData={props.eventData} variant="a4" onEdit={props.onEdit} onPrint={props.onPrint} />;
}
