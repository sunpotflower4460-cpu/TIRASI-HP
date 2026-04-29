import type { Dispatch, SetStateAction } from "react";
import type { EventData } from "../../types/event";

type FlyerOptionsEditorProps = {
  eventData: EventData;
  setEventData: Dispatch<SetStateAction<EventData>>;
};

export function FlyerOptionsEditor({ eventData, setEventData }: FlyerOptionsEditorProps) {
  const setShowPerformerProfiles = (showPerformerProfiles: boolean) => {
    setEventData((current) => ({
      ...current,
      flyerOptions: {
        ...current.flyerOptions,
        showPerformerProfiles
      }
    }));
  };

  return (
    <section className="editor-card flyer-options-card">
      <h2>A4チラシ表示</h2>
      <label className="flyer-option-toggle">
        <input
          type="checkbox"
          checked={eventData.flyerOptions.showPerformerProfiles}
          onChange={(event) => setShowPerformerProfiles(event.target.checked)}
        />
        <span>短い出演者紹介をA4チラシにも載せる</span>
      </label>
      <p className="flyer-option-note">出演者が多い場合はA4からはみ出す可能性があります。必要な時だけONにしてください。</p>
    </section>
  );
}
