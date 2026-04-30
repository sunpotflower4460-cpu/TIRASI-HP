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
  </React.StrictMode>
);
