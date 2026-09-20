/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DONATE_URL?: string;
  readonly VITE_DISCORD_VOICE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
