import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { A11yProvider } from "./lib/A11yContext";
import { LearningProvider } from "./lib/LearningContext";
import { NameProvider } from "./lib/NameContext";
import { TutorialProvider } from "./lib/TutorialContext";
import { startDeviceWatch } from "./lib/device";
import "./index.css";

startDeviceWatch();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* installability helper only — play still works */
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <A11yProvider>
      <NameProvider>
        <LearningProvider>
          <TutorialProvider>
            <App />
          </TutorialProvider>
        </LearningProvider>
      </NameProvider>
    </A11yProvider>
  </StrictMode>,
);
