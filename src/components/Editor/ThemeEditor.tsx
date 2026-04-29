import type { Dispatch, SetStateAction } from "react";
import { themeOptions } from "../../data/themes";
import type { EventData } from "../../types/event";
import { EditorNotice } from "./EditorNotice";
import { FlyerOptionsEditor } from "./FlyerOptionsEditor";
import { PerformerEditor } from "./PerformerEditor";

type ThemeEditorProps = {
  eventData: EventData;
  setEventData: Dispatch<SetStateAction<EventData>>;
};

export function ThemeEditor({ eventData, setEventData }: ThemeEditorProps) {
  const selectedTheme = themeOptions.find((theme) => theme.id === eventData.themeId) ?? themeOptions[0];

  return (
    <>
      <EditorNotice />
      <section className="editor-card">
        <h2>色テーマ</h2>
        <label className="editor-field">
          <span>テーマ</span>
          <select
            value={selectedTheme.id}
            onChange={(event) => {
              const themeId = event.target.value;
              setEventData((current) => ({ ...current, themeId }));
            }}
          >
            {themeOptions.map((theme) => (
              <option value={theme.id} key={theme.id}>
                {theme.label}
              </option>
            ))}
          </select>
        </label>
        <p className="theme-description">{selectedTheme.description}</p>
      </section>
      <FlyerOptionsEditor eventData={eventData} setEventData={setEventData} />
      <PerformerEditor eventData={eventData} setEventData={setEventData} />
    </>
  );
}
