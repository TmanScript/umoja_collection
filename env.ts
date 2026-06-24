// Centralized, validated access to environment variables.
//
// All values come from Vite's import.meta.env and must be prefixed with VITE_
// to be exposed to the client bundle. See .env.example for the full list.
//
// IMPORTANT: everything here ends up in the browser bundle. These are not
// secrets — see README.md ("Security") for why and what to do about it.

function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    // Fail fast with a clear message instead of sending malformed requests.
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Copy .env.example to .env and set it (see README.md).`,
    );
  }
  return value;
}

export const ENV = {
  SUPABASE_URL: required('VITE_SUPABASE_URL'),
  SUPABASE_KEY: required('VITE_SUPABASE_KEY'),
  UMOJA_API_BASE_URL: required('VITE_UMOJA_API_BASE_URL'),
  UMOJA_DEFAULT_TOKEN: required('VITE_UMOJA_DEFAULT_TOKEN'),
  UMOJA_SALES_TOKEN: required('VITE_UMOJA_SALES_TOKEN'),
} as const;
