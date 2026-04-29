import type { EventData } from "../../types/event";
import { HomeFlyerPreview } from "./HomeFlyerPreview";
import { HomePage } from "./HomePage";
import "../../styles/home-flyer-preview.css";

type HomeWithFlyerPreviewProps = {
  eventData: EventData;
  onOpenFlyer: () => void;
  onEdit: () => void;
};

export function HomeWithFlyerPreview({ eventData, onOpenFlyer, onEdit }: HomeWithFlyerPreviewProps) {
  return (
    <>
      <HomePage eventData={eventData} onOpenFlyer={onOpenFlyer} onEdit={onEdit} />
      <div className="home-page home-flyer-preview-wrap">
        <HomeFlyerPreview eventData={eventData} onOpenFlyer={onOpenFlyer} />
      </div>
    </>
  );
}
