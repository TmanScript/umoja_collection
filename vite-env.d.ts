/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_KEY: string;
  readonly VITE_UMOJA_API_BASE_URL: string;
  readonly VITE_UMOJA_DEFAULT_TOKEN: string;
  readonly VITE_UMOJA_SALES_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
