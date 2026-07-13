import { Hono } from "hono";
import { Bindings } from "./db.ts";
import { csrfProtection } from "./middleware.ts";
import publicRouter from "./routes/public.ts";
import authRouter from "./routes/auth.ts";
import meRouter from "./routes/me.ts";
import adminRouter from "./routes/admin.ts";

const app = new Hono<{ Bindings: Bindings }>();

// 1. Inject Security Headers on All Responses
app.use("*", async (c, next) => {
  await next();
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; object-src 'none';",
  );
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  c.header("X-Frame-Options", "DENY");

  // No-store cache on sensitive APIs
  if (c.req.path.startsWith("/api/me") || c.req.path.startsWith("/api/admin")) {
    c.header(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
  }
});

// 2. Apply CSRF (Same-Origin) protections
app.use("*", csrfProtection);

// 3. Mount Sub-Routers
app.route("/api/public", publicRouter);
app.route("/api/auth", authRouter);
app.route("/api/me", meRouter);
app.route("/api/admin", adminRouter);

// 4. Global Error Handler (Hono Error Boundary)
app.onError((err, c) => {
  console.error("Unhandled Server Error:", err);

  // Do not expose internal SQL or stack trace details in production
  return c.json(
    {
      error: "Sistem mengalami ralat dalaman. Sila cuba lagi sebentar.",
    },
    500,
  );
});

// 5. Global Not Found Handler
app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "Pautan API tidak ditemui." }, 404);
  }

  // SPA fallback if worker catches a non-matching page request
  // (e.g. during local Wrangler dev testing or specific asset configurations)
  if (c.env.ASSETS) {
    try {
      return c.env.ASSETS.fetch(c.req.raw);
    } catch {
      // Fallback below
    }
  }

  return c.text("Laman tidak ditemui (404).", 404);
});

export default app;
