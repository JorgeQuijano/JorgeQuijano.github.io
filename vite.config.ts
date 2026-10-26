import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/",
  build: {
    // Keep generated assets namespaced so a project repo named "assets"
    // cannot shadow this site's files at the domain root.
    assetsDir: "_index",
  },
  plugins: [react(), tailwindcss()],
});
