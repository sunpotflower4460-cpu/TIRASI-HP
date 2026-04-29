import { useEffect, useState } from "react";
import { EditorPage } from "./components/Editor/EditorPage";
import { FlyerView } from "./components/Flyer/FlyerView";
import { HomeWithFlyerPreview } from "./components/Home/HomeWithFlyerPreview";
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

  if (route === "/editor") {
    return (
      <div className="app-shell">
        <nav className="app-nav print-hidden" aria-label="ページ切り替え">
          <button onClick={() => navigate("/")}>HP</button>
          <button className="active" onClick={() => navigate("/editor")}>編集</button>
          <button onClick={() => navigate("/flyer")}>A4</button>
        </nav>
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
      <div className="app-shell">
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
    <div className="app-shell">
      <nav className="app-nav print-hidden" aria-label="ページ切り替え">
        <button className="active" onClick={() => navigate("/")}>HP</button>
        <button onClick={() => navigate("/editor")}>編集</button>
        <button onClick={() => navigate("/flyer")}>A4</button>
      </nav>
      <HomeWithFlyerPreview eventData={eventData} onOpenFlyer={() => navigate("/flyer")} onEdit={() => navigate("/editor")} />
    </div>
  );
}
