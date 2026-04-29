import type { EventData } from "../../types/event";
import { OnePageFlyer } from "./OnePageFlyer";

export function FlyerWithProfiles(props: { eventData: EventData; onEdit: () => void; onPrint: () => void }) {
  return <OnePageFlyer eventData={props.eventData} onPrint={props.onPrint} />;
}
