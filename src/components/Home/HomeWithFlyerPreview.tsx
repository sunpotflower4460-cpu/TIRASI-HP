import type { EventData } from "../../types/event";
import { AdminEntryLink } from "./AdminEntryLink";
import { HomeFlyerPreview } from "./HomeFlyerPreview";
import { HomePage } from "./HomePage";
import { PerformerProfiles } from "./PerformerProfiles";
import { VisitorInfo } from "./VisitorInfo";
import "../../styles/home-flyer-preview.css";

type HomeWithFlyerPreviewProps = {
  eventData: EventData;
  onOpenFlyer: () => void;
  onEdit?: () => void;
};

export function HomeWithFlyerPreview({ eventData, onOpenFlyer, onEdit }: HomeWithFlyerPreviewProps) {
  return (
    <>
      <HomePage eventData={eventData} onOpenFlyer={onOpenFlyer} />
      <div className="home-page home-flyer-preview-wrap">
        <PerformerProfiles eventData={eventData} />
        <VisitorInfo eventData={eventData} />
        <HomeFlyerPreview eventData={eventData} onOpenFlyer={onOpenFlyer} />
        <AdminEntryLink onEdit={onEdit} />
      </div>
    </>
  );
}
