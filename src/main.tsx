import "@fontsource/zen-maru-gothic/700.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/noto-serif-jp/700.css";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/700.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/editor-quality.css";
import "./styles/a4-print.css";
import "./styles/editor-mobile-fix.css";
import "./styles/ui-ux-polish.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// The installed app opens without a network connection once the shell is
// cached. Registration is limited to production builds: in development the
// dev server and the test suite must always see the current sources.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // A failed registration only costs offline support; the app still runs.
    });
  });
}
