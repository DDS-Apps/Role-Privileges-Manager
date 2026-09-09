/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AZURE_AD_CLIENT_ID?: string;
  readonly VITE_AZURE_AD_TENANT_ID?: string;
  readonly VITE_AZURE_AD_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
