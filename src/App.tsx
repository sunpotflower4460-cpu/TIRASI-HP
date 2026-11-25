import { useEffect, useState } from "react";
import { StudioPage } from "./components/Studio/StudioPage";
import { DocumentPreview } from "./components/Studio/DocumentPreview";
import { EditorPage } from "./components/Editor/EditorPage";
import { EventManager } from "./components/Editor/EventManager";
import { ThemeEditor } from "./components/Editor/ThemeEditor";
import { OnePageFlyer } from "./components/Flyer/OnePageFlyer";
import { HomeWithFlyerPreview } from "./components/Home/HomeWithFlyerPreview";
import { defaultEvent as publishedEvent } from "./data/defaultEvent";
import { getThemeClassName } from "./data/themes";
import { useEventData } from "./hooks/useEventData";
import { downloadJsonOrAlert } from "./export/files";
import "./styles/theme.css";
import "./styles/event-manager.css";
import "./styles/workspace.css";

function decodeId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}
function getRoute() {
  return window.location.pathname.replace(/\/$/, "") || "/";
}
export default function App() {
  const [route, setRoute] = useState(getRoute);
  const local = useEventData();
  const isLocal =
    route === "/editor" || route === "/studio" || route.startsWith("/preview/");
  const requestedPreviewId = route.startsWith("/preview/event/")
    ? decodeId(route.slice("/preview/event/".length))
    : route.startsWith("/preview/event-")
      ? decodeId(route.slice("/preview/event-".length))
      : "";
  const requestedPreview = local.eventRecords.find(
    (record) => record.id === requestedPreviewId,
  );
  const studioRoute =
    route === "/studio" || route.startsWith("/preview/document/");
  const theme = getThemeClassName(
    studioRoute
      ? "spring"
      : isLocal
        ? (requestedPreview?.eventData.themeId ?? local.eventData.themeId)
        : publishedEvent.themeId,
  );
  useEffect(() => {
    const pop = () => setRoute(getRoute());
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const navigate = (path: string) => {
    if (path !== route) window.history.pushState({}, "", path);
    setRoute(path);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const preview = () =>
    navigate(`/preview/event/${encodeURIComponent(local.activeEventId)}`);
  let content;
  if (route === "/studio") {
    content = !local.ready ? (
      <p role="status">制作物を読み込んでいます…</p>
    ) : (
      <>
        {local.storageError && (
          <div role="alert" className="workspace-banner error">
            <p>{local.storageError}</p>
            <button
              onClick={() =>
                downloadJsonOrAlert(local.workspace, "tirasi-unsaved-workspace.json")
              }
            >
              未保存の内容をJSON保存
            </button>
            <button onClick={local.retrySave} disabled={local.conflict}>
              保存を再試行
            </button>
            <button onClick={() => window.location.reload()}>
              保存済みを再読み込み
            </button>
          </div>
        )}
        <StudioPage
          workspace={local.workspace}
          setWorkspace={local.setWorkspace}
          saveStatus={local.saveStatus}
          restoring={local.restoring}
          restore={local.restoreWorkspace}
          navigate={navigate}
        />
      </>
    );
  } else if (route === "/editor") {
    content = !local.ready ? (
      <p role="status">下書きを読み込んでいます…</p>
    ) : (
      <>
        <div className="workspace-banner print-hidden">
          <strong>ローカル編集</strong>
          <p>
            このブラウザだけの下書きです。公開HPへの反映には、公開用データの書き出しとリポジトリ更新が必要です。編集画面にログイン認証はありません。
          </p>
          <button onClick={() => navigate("/studio")}>
            チラシスタジオを開く
          </button>
          <p role="status">
            {local.saveStatus} / 定期的にバックアップしてください。
          </p>
        </div>
        {local.storageError && (
          <div role="alert" className="workspace-banner error">
            <p>{local.storageError}</p>
            <button
              onClick={() =>
                downloadJsonOrAlert(local.workspace, "tirasi-unsaved-workspace.json")
              }
            >
              未保存の内容をJSON保存
            </button>
            <button onClick={local.retrySave} disabled={local.conflict}>
              保存を再試行
            </button>
            <button onClick={() => window.location.reload()}>
              保存済みを再読み込み
            </button>
          </div>
        )}
        <div className="editor-page theme-editor-wrap">
          <section className="editor-panel">
            <EventManager
              eventRecords={local.eventRecords}
              activeEventId={local.activeEventId}
              onSelectEvent={local.selectEvent}
              onCreateNewEvent={local.createNewEvent}
              onDuplicateActiveEvent={local.duplicateActiveEvent}
              onRenameActiveEvent={local.renameActiveEvent}
              onDeleteActiveEvent={local.deleteActiveEvent}
              onReplaceEventLibrary={local.replaceEventLibrary}
            />
            <ThemeEditor
              eventData={local.eventData}
              setEventData={local.setEventData}
            />
          </section>
        </div>
        <EditorPage
          eventData={local.eventData}
          setEventData={local.setEventData}
          resetEventData={local.resetEventData}
          hasCustomData={local.hasCustomData}
          saveStatus={local.saveStatus}
          onOpenFlyer={preview}
        />
      </>
    );
  } else if (route.startsWith("/preview/")) {
    const isEventPreview =
      route.startsWith("/preview/event/") ||
      route.startsWith("/preview/event-");
    const documentId = route.startsWith("/preview/document/")
      ? decodeId(route.slice("/preview/document/".length))
      : route.slice("/preview/".length);
    const document = isEventPreview
      ? undefined
      : local.workspace.documents.find((d) => d.id === documentId);
    const id = route.startsWith("/preview/event/")
      ? decodeId(route.slice("/preview/event/".length))
      : route.startsWith("/preview/event-")
        ? decodeId(route.slice("/preview/event-".length))
        : "";
    const record = local.eventRecords.find((e) => e.id === id);
    content = !local.ready ? (
      <p role="status">読み込み中…</p>
    ) : document ? (
      <>
        <div className="workspace-banner print-hidden">
          <strong>未公開の下書きプレビュー</strong>
          <p>同じブラウザだけで使う制作物です。共有URLではありません。</p>
          <button onClick={() => navigate("/studio")}>スタジオに戻る</button>
        </div>
        <main className="draft-studio-preview">
          <DocumentPreview document={document} events={local.eventRecords} />
        </main>
      </>
    ) : record ? (
      <>
        <div className="workspace-banner print-hidden">
          <strong>未公開の下書きプレビュー</strong>
          <p>
            同じブラウザでのみ開けます。URLを共有しても他の端末には表示されません。
          </p>
          <button onClick={() => navigate("/editor")}>編集に戻る</button>
        </div>
        <OnePageFlyer
          eventData={record.eventData}
          onPrint={() => window.print()}
        />
      </>
    ) : (
      <main className="empty-state">
        <h1>下書きが見つかりません</h1>
        <p>別のブラウザで作った下書きや削除済みのデータは開けません。</p>
        <button onClick={() => navigate("/editor")}>編集画面へ</button>
      </main>
    );
  } else if (route === "/flyer") {
    content = (
      <>
        <p className="public-label print-hidden">公開済みイベントのA4チラシ</p>
        <OnePageFlyer
          eventData={publishedEvent}
          onPrint={() => window.print()}
        />
      </>
    );
  } else if (route === "/") {
    content = (
      <HomeWithFlyerPreview
        eventData={publishedEvent}
        onOpenFlyer={() => navigate("/flyer")}
        onEdit={() => navigate("/editor")}
      />
    );
  } else {
    content = (
      <main className="empty-state">
        <h1>ページが見つかりません</h1>
        <button onClick={() => navigate("/")}>ホームに戻る</button>
      </main>
    );
  }
  return (
    <div
      className={`app-shell ${isLocal ? "local-view" : "public-view"}${studioRoute ? " studio-view" : ""} ${theme}`}
    >
      <a className="skip-link print-hidden" href="#page-content">
        本文へ移動
      </a>
      <nav className="app-nav print-hidden" aria-label="ページ切り替え">
        <button
          className={route === "/" ? "active" : ""}
          onClick={() => navigate("/")}
        >
          公開HP
        </button>
        <button
          className={route === "/flyer" ? "active" : ""}
          onClick={() => navigate("/flyer")}
        >
          公開A4チラシ
        </button>
        {isLocal && (
          <>
            <button
              className={route === "/editor" ? "active" : ""}
              onClick={() => navigate("/editor")}
            >
              イベント編集
            </button>
            <button onClick={() => navigate("/studio")}>チラシスタジオ</button>
            <button onClick={preview}>下書きA4</button>
          </>
        )}
      </nav>
      <div id="page-content" tabIndex={-1}>
        {content}
      </div>
    </div>
  );
}
