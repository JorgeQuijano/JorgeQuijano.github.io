/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_TIME?: string;
  readonly VITE_SYNC_STATUS?: "success" | "failure" | string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
