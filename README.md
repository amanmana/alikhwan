# e-Kariah Al-Ikhwan

e-Kariah Al-Ikhwan is a production-ready, mobile-first member management and directory web application designed for **Surau Al-Ikhwan** in Malaysia. It simplifies registration, checks legacy database records, handles account claims, and provides comprehensive admin records management.

---

## 1. Package Version Documentation

As required, these are the exact dependencies and development tool versions configured in `package.json`:

### Production Dependencies
- `hono`: `^4.4.7` — Lightweight and fast web framework for Cloudflare Workers.
- `libphonenumber-js`: `^1.11.4` — Safe international normalization of Malaysian phone numbers.
- `lucide-react`: `^0.395.0` — Icon collection.
- `react`: `^18.3.1` — UI rendering engine.
- `react-dom`: `^18.3.1` — React DOM bindings.
- `react-router-dom`: `^6.24.1` — SPA routing.
- `zod`: `^3.23.8` — Schema validation.

### Development Dependencies
- `@cloudflare/workers-types`: `^4.20240610.0` — Cloudflare runtime type definitions.
- `@playwright/test`: `^1.44.1` — E2E viewport-responsive testing.
- `@testing-library/react`: `^16.0.0` — React Testing Library.
- `typescript`: `^5.4.5` — TypeScript compiler.
- `vite`: `^5.3.1` — Bundler and development server.
- `vitest`: `^1.6.0` — Unit and integration test runner.
- `wrangler`: `^3.60.3` — Cloudflare Worker command line tool.
- `tailwindcss`: `^3.4.4` — Tailwind CSS styling (v3 stable).
- `postcss`: `^8.4.38` — PostCSS CSS processor.
- `autoprefixer`: `^10.4.19` — CSS prefix builder.
- `prettier`: `^3.3.2` — Code formatter.
- `eslint`: `^8.57.0` — Code quality checks.

---

## 2. Architecture & File Structure

This project uses a unified single-repository structure where both frontend React code and Hono backend code are contained in `src/`. This enables seamless sharing of validation logic and schemas.

- **Frontend SPA:** Compiled with Vite into `dist/`.
- **Backend API:** Built with Hono on Cloudflare Workers edge runtime.
- **Database:** Serverless SQL with Cloudflare D1 utilizing full-text search index (FTS5).
- **Asset Routing:** Cloudflare Workers static assets serves static files from `dist/` directly at the edge, falling back to `index.html` for client routing and calling the Hono worker only for `/api/*` requests.

---

## 3. Local Prerequisites

Make sure you have installed:
- Node.js (v18.0.0 or later, v20+ recommended)
- npm (v9.0.0 or later)

---

## 4. Installation

Clone the repository and run the package installation:
```bash
npm install
```

---

## 5. Local Development

Start the development servers (runs both Vite dev on port 5173 and Wrangler dev on port 8787 in parallel):
```bash
npm run dev
```

Visit the application at: `http://localhost:5173`

---

## 6. Local D1 database Setup

1. Before starting local database queries, initialize the local emulator D1 database by applying the initial schema migration:
```bash
npm run db:migrate:local
```
2. Populate the local database with clearly fictional development seed records:
```bash
npm run db:seed:local
```

---

## 7. Creating Production Secrets

Create the local `.dev.vars` file for development secrets:
```env
ADMIN_MAGIC_KEYWORD=SesiKunciSurauAlIkhwan2026
SESSION_SECRET=a_very_long_secure_random_string_here
TURNSTILE_SECRET_KEY=1x00000000000000000000000000000000AA
```

To set the production secrets on Cloudflare, run the following commands (do not commit secrets to Git):
```bash
npx wrangler secret put ADMIN_MAGIC_KEYWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
```

---

## 8. Applying Migrations (Remote vs. Local)

Apply migrations to your local development environment:
```bash
npm run db:migrate:local
```

Apply migrations to the remote production Cloudflare D1 database:
```bash
npm run db:migrate:remote
```

---

## 9. Turnstile Setup

In development, we use the standard Turnstile test keys:
- Site Key (Public): `1x00000000000000000000AA` (prefilled in `wrangler.jsonc` vars)
- Secret Key: `1x00000000000000000000000000000000AA`

For production, replace `TURNSTILE_SITE_KEY` in `wrangler.jsonc` under `vars` with your real site key, and set `TURNSTILE_SECRET_KEY` using:
```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
```

---

## 10. Running Tests

Run unit tests (validations, age checks, password hashing):
```bash
npm run test
```

Run API integration tests (permissions, IDOR checks):
```bash
npm run test:integration
```

Run Playwright E2E journeys (verifies registration, login, admin):
```bash
npm run test:e2e
```

---

## 11. Production Build & Deployment

1. Compile the React assets:
```bash
npm run build
```
2. Deploy the Worker and built static assets to Cloudflare:
```bash
npx wrangler deploy
```

---

## 12. Rollback Steps

If a deployment fails or is unstable, roll back to a previous version using wrangler's rollback command:
1. List previous deployments:
```bash
npx wrangler deployments list
```
2. Roll back to a specific stable deployment ID:
```bash
npx wrangler rollback <DEPLOYMENT_ID>
```

To roll back D1 imported legacy records:
```sql
DELETE FROM members WHERE registration_source = 'legacy_import';
```

---

## 13. Safe users.sql Import Process

1. Place your legacy `users.sql` file at the project root. (It is listed in `.gitignore` and will never be committed).
2. Run the analysis script to inspect columns, encoding, duplicates, and invalid fields:
```bash
npx wrangler tsx scripts/analyse-users-sql.ts
```
This generates duplicate and error reports in the `output/` directory. Review these files before proceeding.
3. Perform the conversion and test the import on the local emulator first:
```bash
npx wrangler tsx scripts/convert-users-sql.ts
```

---

## 14. Admin Session Behaviour & Safety

- Admin device enrollment represents a specific browser profile, not an entire physical computer.
- Sesi Pentadbir is stored as HttpOnly, Secure, SameSite=Strict cookies with a lifespan of 180 days.
- If using a shared computer, the admin must explicitly click "Log Keluar" to revoke the token and clear the cookies. Sesi can also be revoked remotely by other administrators under the **Sesi Pentadbir** page.

---

## 15. Security Checklist
- [x] All state-changing requests verify same-origin `Origin` and `Host` headers.
- [x] Password hashes are created using Node's asynchronous `scrypt` hashing.
- [x] Cookie flags set `__Host-` prefix, SameSite=Strict, HttpOnly, and Secure.
- [x] Public API endpoints return only safe fields (name, general area) and exclude IC, phone, address, and internal IDs.
- [x] Prepared statements are used for all D1 operations. No string-concatenated SQL is present.
