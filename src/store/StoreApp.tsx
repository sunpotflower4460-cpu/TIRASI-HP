// The store product's whole app: Flyer Studio, the plan screen and a short guide.
// vite.config.ts uses this instead of ../App in `--mode store`.
import { useCallback, useEffect, useState } from "react";
import { StudioPage } from "../components/Studio/StudioPage";
import { DocumentPreview } from "../components/Studio/DocumentPreview";
import { useEventData } from "../hooks/useEventData";
import { downloadJsonOrAlert } from "../export/files";
import { PlanProvider } from "../plan/PlanContext";
import { tierName } from "../plan/entitlements";
import { Guide } from "./Guide";
import { SettingsSheet } from "./SettingsSheet";
import { Icon } from "./Icon";
import { language, tr } from "../i18n";
import "../styles/theme.css";
import "../styles/workspace.css";
import "../styles/plan.css";
import "../styles/studio.css";
import "./store.css";

const GUIDE_KEY = "tirasi-livechirashi:guide-seen";

function guideSeen() {
  try {
    return window.localStorage.getItem(GUIDE_KEY) === "yes";
  } catch {
    return false;
  }
}

function decodeId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}
const getRoute = () => window.location.pathname.replace(/\/$/, "") || "/";

export default function StoreApp() {
  const [route, setRoute] = useState(getRoute);
  const [guide, setGuide] = useState(() => !guideSeen());
  const [home, setHome] = useState(true);
  const [settings, setSettings] = useState(false);
  const local = useEventData();

  useEffect(() => {
    document.documentElement.lang = language;
  }, []);

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
  const closeGuide = useCallback(() => {
    setGuide(false);
    try {
      window.localStorage.setItem(GUIDE_KEY, "yes");
    } catch {
      /* The guide is shown again next time; nothing else depends on this. */
    }
  }, []);

  const previewId = route.startsWith("/preview/document/")
    ? decodeId(route.slice("/preview/document/".length))
    : undefined;
  const preview = local.workspace.documents.find((d) => d.id === previewId);

  let content;
  if (!local.ready) content = <p role="status">{tr("制作物を読み込んでいます…")}</p>;
  else if (preview)
    content = (
      <>
        <div className="workspace-banner print-hidden">
          <strong>{tr("下書きプレビュー")}</strong>
          <button onClick={() => navigate("/studio")}>{tr("スタジオに戻る")}</button>
        </div>
        <main className="draft-studio-preview">
          <DocumentPreview document={preview} events={local.eventRecords} />
        </main>
      </>
    );
  else
    content = (
      <>
        {local.storageError && (
          <div role="alert" className="workspace-banner error">
            <p>{local.storageError}</p>
            <button onClick={() => downloadJsonOrAlert(local.workspace, "tirasi-unsaved-workspace.json")}>{tr("未保存の内容をJSON保存")}</button>
            <button onClick={local.retrySave} disabled={local.conflict}>{tr("保存を再試行")}</button>
            <button onClick={() => window.location.reload()}>{tr("保存済みを再読み込み")}</button>
          </div>
        )}
        <StudioPage
          workspace={local.workspace}
          setWorkspace={local.setWorkspace}
          saveStatus={local.saveStatus}
          restoring={local.restoring}
          restore={local.restoreWorkspace}
          navigate={navigate}
          home={home}
          onHomeChange={setHome}
        />
      </>
    );

  return (
    <PlanProvider>
      {(openPlans, tier) => (
        <div className="app-shell local-view studio-view store-app theme-spring">
          <a className="skip-link print-hidden" href="#page-content">{tr("本文へ移動")}</a>
          <nav className="app-nav store-nav print-hidden" aria-label={tr("ページ切り替え")}>
            <button
              type="button"
              className="store-brand"
              aria-label={tr("ホーム")}
              onClick={() => {
                setHome(true);
                navigate("/studio");
                window.scrollTo({ top: 0 });
              }}
            >
              <span className="store-logo" aria-hidden="true">♪</span>{tr("ライブチラシ")}</button>
            <button type="button" className="store-plan-pill" aria-label={tr("プラン（{0}）", tierName[tier])} onClick={openPlans}>
              <Icon name="crown" size={18} />
              {tier === "free" ? tr("無料プラン") : tr("{0}プラン", tierName[tier])}
            </button>
            <button type="button" className="store-settings" aria-label={tr("設定")} onClick={() => setSettings(true)}>
              <Icon name="sliders" size={22} />
            </button>
          </nav>
          <div id="page-content" tabIndex={-1}>
            {content}
          </div>
          {settings && (
            <SettingsSheet
              onClose={() => setSettings(false)}
              onGuide={() => {
                setSettings(false);
                setGuide(true);
              }}
            />
          )}
          {guide && <Guide onClose={closeGuide} />}
        </div>
      )}
    </PlanProvider>
  );
}
