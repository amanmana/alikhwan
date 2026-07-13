# System Architecture: e-Kariah Al-Ikhwan

This document details the system's architecture, including components, deployment model, request lifecycle, and compile/runtime characteristics.

---

## 1. Technological Architecture

The application is built as a single unified project to simplify deployment, typesharing, and validation schemas, while utilizing Cloudflare's serverless edge capabilities.

```
                  ┌──────────────────────────────┐
                  │       Client Browser         │
                  └──────────────┬───────────────┘
                                 │
                   HTTPS Requests (Port 443)
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │                   Cloudflare Edge Network                   │
  │                                                             │
  │  ┌────────────────────────┐       ┌──────────────────────┐  │
  │  │  Static Assets Server  │       │  Hono Worker (API)   │  │
  │  │  (Serves CSS, JS, HTML)│       │  (Handles /api/*)    │  │
  │  └───────────▲────────────┘       └──────────┬───────────┘  │
  └──────────────┼───────────────────────────────┼──────────────┘
                 │ (Wrangler Asset upload)       │ (D1 SQL Protocol)
                 │                               │
       ┌─────────┴─────────┐           ┌─────────▼─────────┐
       │   Vite Compiler   │           │    Cloudflare     │
       │  (Build Artifacts)│           │    D1 Database    │
       └───────────────────┘           └───────────────────┘
```

---

## 2. Component Design

### Frontend (Client SPA)
- **Vite & React:** Fast hot module reloading for dev, and optimized compilation for production.
- **React Router:** Handles routing client-side (SPA).
- **Tailwind CSS:** Modern utility classes using custom style tokens for themes.
- **Lucide Icons:** SVG icons loaded dynamically.
- **Zod Schemas:** Validates forms (e.g. member registration, login, profile edit requests) before submission.

### Backend (Serverless Edge Worker)
- **Hono:** A fast, lightweight web framework designed for Cloudflare Workers.
- **D1 Database:** Cloudflare's serverless SQLite database, utilizing parameterised queries and FTS5 search indexing.
- **Node:Crypto:** Uses built-in `scrypt` hashing asynchronously for passwords.

---

## 3. Worker Request Lifecycle & Asset Routing

Cloudflare Workers with static assets serves files according to the following priorities:

1. **Static Files Priority:**
   - Any request matching a physical file in `./dist` (like `/assets/index-xyz.js` or `/favicon.ico`) is served directly by Cloudflare's static file servers without calling the Hono Worker.
2. **Worker Exemption (API Routes):**
   - We configure `wrangler.jsonc` with `"run_worker_first": true` (or selective path pattern `["/api/*"]`) so that `/api/*` requests bypass the static asset layer and directly invoke the Hono Worker.
3. **SPA Fallback Routing:**
   - Client navigation routes (like `/profil` or `/admin`) do not match static files on the edge. Because the wrangler assets are configured with `not_found_handling = "single-page-application"`, Cloudflare redirects those requests back to `/index.html`, allowing React Router to render the page client-side.

---

## 4. Shared Schemas & Logic

To prevent double-maintenance of parsing logic, we place validation logic in a shared folder:
- **`src/shared/validation.ts`:** IC parsing, age calculation, Malaysian phone number formatting. Shared by React input components and Hono endpoints.
- **`src/shared/schemas.ts`:** Zod rules for authentication, forms, and admin actions.
