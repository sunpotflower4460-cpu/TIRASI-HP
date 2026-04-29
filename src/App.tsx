import { useEffect, useState } from "react";
import { EditorPage } from "./components/Editor/EditorPage";
import { EventManager } from "./components/Editor/EventManager";
import { ThemeEditor } from "./components/Editor/ThemeEditor";
import { FlyerView } from "./components/Flyer/FlyerView";
import { HomeWithFlyerPreview } from "./components/Home/HomeWithFlyerPreview";
import { getThemeClassName } from "./data/themes";
import { useEventData } from "./hooks/useEventData";
import "./styles/theme.css";
import "./styles/event-manager.css";

type Route = "/" | "/editor" | "/flyer";

function getRoute(): Route {
  const path = window.location.pathname;
  if (path === "/editor") return "/editor";
  if (path === "/flyer") return "/flyer";
  return "/";
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute);
  const {
    eventData,
    setEventData,
    resetEventData,
    hasCustomData,
    eventRecords,
    activeEventId,
    selectEvent,
    createNewEvent,
    duplicateActiveEvent,
    renameActiveEvent,
    deleteActiveEvent,
    replaceEventLibrary
  } = useEventData();
  const themeClassName = getThemeClassName(eventData.themeId);

  useEffect(() => {
    const onPopState = () => setRoute(getRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (nextRoute: Route) => {
    window.history.pushState({}, "", nextRoute);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (route === "/editor") {
    return (
      <div className={`app-shell ${themeClassName}`}>
        <nav className="app-nav print-hidden" aria-label="ページ切り替え">
          <button onClick={() => navigate("/")}>HP</button>
          <button className="active" onClick={() => navigate("/editor")}>編集</button>
          <button onClick={() => navigate("/flyer")}>A4</button>
        </nav>
        <div className="editor-page theme-editor-wrap">
          <section className="editor-panel">
            <EventManager
              eventRecords={eventRecords}
              activeEventId={activeEventId}
              onSelectEvent={selectEvent}
              onCreateNewEvent={createNewEvent}
              onDuplicateActiveEvent={duplicateActiveEvent}
              onRenameActiveEvent={renameActiveEvent}
              onDeleteActiveEvent={deleteActiveEvent}
              onReplaceEventLibrary={replaceEventLibrary}
            />
            <ThemeEditor eventData={eventData} setEventData={setEventData} />
          </section>
        </div>
        <EditorPage
          eventData={eventData}
          setEventData={setEventData}
          resetEventData={resetEventData}
          hasCustomData={hasCustomData}
          onOpenFlyer={() => navigate("/flyer")}
        />
      </div>
    );
  }

  if (route === "/flyer") {
    return (
      <div className={`app-shell ${themeClassName}`}>
        <nav className="app-nav print-hidden" aria-label="ページ切り替え">
          <button onClick={() => navigate("/")}>HP</button>
          <button onClick={() => navigate("/editor")}>編集</button>
          <button className="active" onClick={() => navigate("/flyer")}>A4</button>
        </nav>
        <FlyerView eventData={eventData} variant="a4" onEdit={() => navigate("/editor")} onPrint={() => window.print()} />
      </div>
    );
  }

  return (
    <div className={`app-shell ${themeClassName}`}>
      <nav className="app-nav print-hidden" aria-label="ページ切り替え">
        <button className="active" onClick={() => navigate("/")}>HP</button>
        <button onClick={() => navigate("/editor")}>編集</button>
        <button onClick={() => navigate("/flyer")}>A4</button>
      </nav>
      <HomeWithFlyerPreview eventData={eventData} onOpenFlyer={() => navigate("/flyer")} onEdit={() => navigate("/editor")} />
    </div>
  );
}
