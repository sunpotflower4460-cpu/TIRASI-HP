import type { Dispatch, SetStateAction } from "react";
import type { EventData, PerformerProfile } from "../../types/event";

type PerformerEditorProps = {
  eventData: EventData;
  setEventData: Dispatch<SetStateAction<EventData>>;
};

function createPerformer(): PerformerProfile {
  return {
    id: `performer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "新しい出演者",
    catchcopy: "",
    bio: "",
    imageUrl: "",
    linkUrl: ""
  };
}

export function PerformerEditor({ eventData, setEventData }: PerformerEditorProps) {
  const updatePerformer = (id: string, patch: Partial<PerformerProfile>) => {
    setEventData((current) => ({
      ...current,
      performers: current.performers.map((performer) =>
        performer.id === id ? { ...performer, ...patch } : performer
      )
    }));
  };

  const addPerformer = () => {
    setEventData((current) => ({
      ...current,
      performers: [...current.performers, createPerformer()]
    }));
  };

  const removePerformer = (id: string) => {
    const shouldRemove = window.confirm("この出演者プロフィールを削除しますか？");
    if (!shouldRemove) return;

    setEventData((current) => ({
      ...current,
      performers: current.performers.filter((performer) => performer.id !== id)
    }));
  };

  return (
    <section className="editor-card performer-editor-card">
      <div className="card-heading">
        <div>
          <h2>出演者プロフィール</h2>
          <p className="performer-editor-note">HP用の出演者紹介です。画像はURL入力で表示できます。</p>
        </div>
        <button type="button" onClick={addPerformer}>出演者を追加</button>
      </div>

      {eventData.performers.length === 0 ? (
        <p className="performer-empty">まだプロフィールはありません。必要な出演者だけ追加できます。</p>
      ) : null}

      <div className="performer-editor-list">
        {eventData.performers.map((performer) => (
          <article className="performer-editor-item" key={performer.id}>
            <div className="performer-editor-head">
              <strong>{performer.name || "出演者"}</strong>
              <button type="button" className="danger" onClick={() => removePerformer(performer.id)}>削除</button>
            </div>

            <label className="editor-field">
              <span>名前</span>
              <input value={performer.name} onChange={(event) => updatePerformer(performer.id, { name: event.target.value })} />
            </label>
            <label className="editor-field">
              <span>一言紹介</span>
              <input value={performer.catchcopy} onChange={(event) => updatePerformer(performer.id, { catchcopy: event.target.value })} />
            </label>
            <label className="editor-field">
              <span>プロフィール文</span>
              <textarea value={performer.bio} rows={3} onChange={(event) => updatePerformer(performer.id, { bio: event.target.value })} />
            </label>
            <label className="editor-field">
              <span>画像URL</span>
              <input value={performer.imageUrl} onChange={(event) => updatePerformer(performer.id, { imageUrl: event.target.value })} placeholder="https://..." />
            </label>
            <label className="editor-field">
              <span>リンクURL</span>
              <input value={performer.linkUrl} onChange={(event) => updatePerformer(performer.id, { linkUrl: event.target.value })} placeholder="https://..." />
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}
