import { Hono } from "hono";
import { Bindings } from "./db.ts";
import { csrfProtection } from "./middleware.ts";
import publicRouter from "./routes/public.ts";
import authRouter from "./routes/auth.ts";
import meRouter from "./routes/me.ts";
import adminRouter from "./routes/admin.ts";
import ifrRouter from "./routes/ifr.ts";

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
  if (
    c.req.path.startsWith("/api/auth") ||
    c.req.path.startsWith("/api/me") ||
    c.req.path.startsWith("/api/admin")
  ) {
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
app.route("/api/ifr", ifrRouter);

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

// Intercept /ifr for customized Social Previews (WhatsApp OG Tags)
app.get("/ifr*", async (c) => {
  if (c.env.ASSETS) {
    const res = await c.env.ASSETS.fetch(new Request(new URL("/index.html", c.req.url)));
    if (!res.ok) return res;

    // @ts-ignore - HTMLRewriter is available in Cloudflare Workers runtime
    const rewriter = new HTMLRewriter()
      .on('meta[property="og:title"]', { element(e: any) { e.setAttribute("content", "Pendaftaran Ikhwan Fun Run 3.0") } })
      .on('meta[property="og:description"]', { element(e: any) { e.setAttribute("content", "Sertai larian santai Ikhwan Fun Run 3.0! Klik di sini untuk mendaftar secara rasmi.") } })
      .on('meta[property="og:image"]', { element(e: any) { e.setAttribute("content", "https://alikhwan.amanmana.workers.dev/hero.webp") } })
      .on('meta[property="og:url"]', { element(e: any) { e.setAttribute("content", "https://alikhwan.amanmana.workers.dev/ifr") } })
      .on('meta[name="twitter:title"]', { element(e: any) { e.setAttribute("content", "Pendaftaran Ikhwan Fun Run 3.0") } })
      .on('meta[name="twitter:description"]', { element(e: any) { e.setAttribute("content", "Sertai larian santai Ikhwan Fun Run 3.0! Klik di sini untuk mendaftar secara rasmi.") } })
      .on('meta[name="twitter:image"]', { element(e: any) { e.setAttribute("content", "https://alikhwan.amanmana.workers.dev/hero.webp") } });
      
    return rewriter.transform(res);
  }
  return c.text("Sila rujuk pentadbir sistem.", 404);
});

// 5. Global Not Found Handler
app.notFound(async (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "Pautan API tidak ditemui." }, 404);
  }

  // SPA fallback for all unrecognized paths
  if (c.env.ASSETS) {
    return await c.env.ASSETS.fetch(new Request(new URL("/index.html", c.req.url)));
  }

  return c.text("Laman tidak ditemui (404).", 404);
});

export default app;
