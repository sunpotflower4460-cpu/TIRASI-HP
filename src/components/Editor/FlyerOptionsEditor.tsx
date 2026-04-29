import type { Dispatch, SetStateAction } from "react";
import type { EventData } from "../../types/event";
import { getA4FitWarnings } from "../../utils/a4Fit";

type FlyerOptionsEditorProps = {
  eventData: EventData;
  setEventData: Dispatch<SetStateAction<EventData>>;
};

export function FlyerOptionsEditor({ eventData, setEventData }: FlyerOptionsEditorProps) {
  const a4FitWarnings = getA4FitWarnings(eventData);

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
      {a4FitWarnings.length > 0 ? (
        <div className="a4-fit-warning-box">
          <strong>A4収まり注意</strong>
          <ul>
            {a4FitWarnings.map((warning) => (
              <li key={warning.id}>{warning.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="a4-fit-ok">現在の内容はA4に収まりやすい構成です。</p>
      )}
    </section>
  );
}
