import { useEffect, useState } from "react";
import { EditorPage } from "./components/Editor/EditorPage";
import { FlyerView } from "./components/Flyer/FlyerView";
import { useEventData } from "./hooks/useEventData";

type Route = "/" | "/editor" | "/flyer";

function getRoute(): Route {
  const path = window.location.pathname;
  if (path === "/editor") return "/editor";
  if (path === "/flyer") return "/flyer";
  return "/";
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute);
  const { eventData, setEventData, resetEventData, hasCustomData } = useEventData();

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

  return (
    <div className="app-shell">
      <nav className="app-nav print-hidden" aria-label="ページ切り替え">
        <button className={route === "/" ? "active" : ""} onClick={() => navigate("/")}>
          HP
        </button>
        <button className={route === "/editor" ? "active" : ""} onClick={() => navigate("/editor")}>
          編集
        </button>
        <button className={route === "/flyer" ? "active" : ""} onClick={() => navigate("/flyer")}>
          A4
        </button>
      </nav>

      {route === "/editor" ? (
        <EditorPage
          eventData={eventData}
          setEventData={setEventData}
          resetEventData={resetEventData}
          hasCustomData={hasCustomData}
          onOpenFlyer={() => navigate("/flyer")}
        />
      ) : (
        <FlyerView
          eventData={eventData}
          variant={route === "/flyer" ? "a4" : "web"}
          onEdit={() => navigate("/editor")}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
}
