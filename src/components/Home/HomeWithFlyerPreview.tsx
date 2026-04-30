import type { EventData } from "../../types/event";
import { HomeFlyerPreview } from "./HomeFlyerPreview";
import { HomePage } from "./HomePage";
import { PerformerProfiles } from "./PerformerProfiles";
import { VisitorInfo } from "./VisitorInfo";
import "../../styles/home-flyer-preview.css";

type HomeWithFlyerPreviewProps = {
  eventData: EventData;
  onOpenFlyer: () => void;
};

export function HomeWithFlyerPreview({ eventData, onOpenFlyer }: HomeWithFlyerPreviewProps) {
  return (
    <>
      <HomePage eventData={eventData} onOpenFlyer={onOpenFlyer} />
      <div className="home-page home-flyer-preview-wrap">
        <PerformerProfiles eventData={eventData} />
        <VisitorInfo eventData={eventData} />
        <HomeFlyerPreview eventData={eventData} onOpenFlyer={onOpenFlyer} />
      </div>
    </>
  );
}
