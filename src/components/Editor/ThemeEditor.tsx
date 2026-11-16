import type { Dispatch, SetStateAction } from "react";
import { themeOptions } from "../../data/themes";
import type { EventData } from "../../types/event";
import { AdminGuide } from "./AdminGuide";
import { EditorNotice } from "./EditorNotice";

type ThemeEditorProps = {
  eventData: EventData;
  setEventData: Dispatch<SetStateAction<EventData>>;
};

export function ThemeEditor({ eventData, setEventData }: ThemeEditorProps) {
  const selectedTheme = themeOptions.find((theme) => theme.id === eventData.themeId) ?? themeOptions[0];

  return (
    <>
      <EditorNotice />
      <details className="editor-card"><summary>編集ガイドを開く</summary><AdminGuide /></details>
      <section className="editor-card">
        <h2>色テーマ</h2>
        <label className="editor-field">
          <span>テーマ</span>
          <select
            aria-label="テーマ"
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
    </>
  );
}
