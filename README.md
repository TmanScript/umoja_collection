# Umoja Inventory Swap

A React + TypeScript single-page admin app for managing device inventory: swapping
devices between customers and stock, collecting returned devices, and viewing
collection/sales statistics. It talks to **Supabase** (admin auth + history tables)
and the **Umoja Portal API** (customers and inventory).

Built with Vite, React 18, React Router, and Recharts.

---

## Prerequisites

- Node.js 18+ and npm
- A Supabase project (URL + key)
- Umoja Portal API Basic-auth token(s)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create your local environment file from the template
cp .env.example .env
#    then edit .env and fill in real values

# 3. Run the dev server (http://localhost:3000)
npm run dev
```

## Available scripts

| Script            | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server on port 3000               |
| `npm run build`   | Type-check-free production build into `dist/`        |
| `npm run preview` | Serve the production build locally                   |
| `npm run deploy`  | Build and publish `dist/` to GitHub Pages            |

## Environment variables

All configuration and credentials live in `.env` (gitignored). See
[`.env.example`](.env.example) for the template. Variables **must** be prefixed
with `VITE_` to be available to the app.

| Variable                   | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `VITE_SUPABASE_URL`        | Supabase project URL                                     |
| `VITE_SUPABASE_KEY`        | Supabase key (should be the **anon** key — see Security) |
| `VITE_UMOJA_API_BASE_URL`  | Umoja Portal API base URL                                |
| `VITE_UMOJA_DEFAULT_TOKEN` | Umoja Basic-auth token for inventory/customer calls      |
| `VITE_UMOJA_SALES_TOKEN`   | Umoja Basic-auth token for the sales statistics report   |

Variables are read and validated in one place ([`env.ts`](env.ts)); a missing
variable throws a clear error at startup instead of failing later with a
malformed request.

---

## Security

> [!WARNING]
> This is a **client-side** app. Every `VITE_*` value is compiled into the
> JavaScript bundle that ships to the browser, so **anything in `.env` is
> visible to anyone who opens the app** (View Source / DevTools). Moving the
> credentials into `.env` removes them from source control and lets you rotate
> them without a code change, but it does **not** make them secret.

The following issues were identified and should be addressed before a real
production launch:

1. **Supabase `service_role` key exposed (critical).** The app currently ships a
   `service_role` key, which bypasses Row Level Security and grants full
   read/write/delete on the entire database to anyone who loads the page.
   - **Rotate this key immediately** in the Supabase dashboard — it has been
     committed to git history and must be treated as compromised.
   - Replace it with the public **anon** key and enable **Row Level Security**
     with policies on every table (`Admin`, `Swap_History`, `Collection_History`).
   - Move privileged operations behind a backend (e.g. Supabase Edge Functions
     or a small API) so the service_role key never reaches the browser.

2. **Plaintext password authentication.** `verifyAdminLogin` compares the
   submitted password against a plaintext `password` column in the `Admin`
   table. Use Supabase Auth (or at minimum hashed passwords, e.g. bcrypt,
   verified server-side) instead.

3. **Hardcoded `admin` / `admin` login.** A built-in read-only account bypasses
   the database entirely. Remove it or gate it behind real credentials.

4. **Umoja API tokens in the bundle.** Same exposure caveat as above — proxy
   Umoja API calls through a backend so the tokens stay server-side.

**Recommended target architecture:** a thin backend (Supabase Edge Functions,
Cloudflare Workers, or a Node service) that holds the real secrets, enforces
auth, and proxies Supabase/Umoja calls. The SPA then only needs the public
Supabase anon key.

> Because the secrets above were committed to git history, rotating them is the
> only way to truly invalidate them. Removing them from the working tree (done)
> is necessary but not sufficient.

---

## Project structure

```
.
├── App.tsx                 # Root component, routing, auth/session state
├── index.tsx               # React entry point
├── index.html              # HTML shell (Tailwind CDN + import map)
├── env.ts                  # Validated environment-variable access
├── constants.ts            # API base URL + default token (from env)
├── types.ts                # Shared TypeScript types
├── components/             # Button, Scanner (QR), SettingsModal
├── pages/                  # Login, Dashboard, Swap, Collection, History, Stats
└── services/
    ├── supabaseClient.ts   # Supabase client + admin auth + history queries
    └── umojaService.ts     # Umoja Portal API client
```

## Known follow-ups (not blocking, but recommended)

- **Tailwind via CDN** (`cdn.tailwindcss.com` in `index.html`) is not intended
  for production. Install Tailwind as a build dependency.
- **Import map / React version mismatch.** `index.html` pins React 19 from a CDN
  via an import map while `package.json` declares React 18. Vite bundles its own
  copy, so the import map is dead weight — remove it for clarity.
- **`/index.css` 404.** `index.html` links `/index.css`, which does not exist.
  Remove the link or add the file.
- **No automated tests, linting, or CI** are configured.
- The production bundle is ~770 kB; consider code-splitting with dynamic imports.
