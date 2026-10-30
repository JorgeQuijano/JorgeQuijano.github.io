import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./lib/theme";

const container = document.getElementById("root")!;

// The build writes the rendered index into #root for crawlers and no-JS
// visitors. Replace that static shell with the live app; the markup is
// intentionally not hydrated so browser-serialized text nodes cannot cause
// hydration mismatches.
createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
