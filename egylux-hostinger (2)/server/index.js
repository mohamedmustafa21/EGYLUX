import "./env.js";
import express from "express";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { all, get, run, getSetting, seedIfEmpty, UPLOAD_DIR, logAudit } from "./db.js";
import { auth, signToken, setAuthCookie, clearAuthCookie, loadUser } from "./auth.js";
import { product as parseProduct, catChain, resolveLayout, breadcrumb, catUrl } from "./model.js";
import { buildMeta, injectHead, sitemap, robots } from "./seo.js";
import { notifySubmission } from "./mail.js";
import adminRouter from "./admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist");
const PROD = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT || 4000);

await seedIfEmpty();
run("DELETE FROM visits WHERE ts < ?", Date.now() - 400 * 864e5);

const app = express();
app.set("trust proxy", true);
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  next();
});

const origin = (req) => `${req.protocol}://${req.get("host")}`;
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ملفات الرفع — CSP يمنع تنفيذ أي سكربت لو اتفتح SVG مباشرة
app.use("/uploads", express.static(UPLOAD_DIR, {
  maxAge: "30d",
  setHeaders: (res, file) => {
    res.setHeader("Content-Security-Policy", "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; sandbox");
    // الـ PDF بيتحمّل مباشرة (الـ sandbox بيمنع Chrome يعرضه جوا الصفحة)
    if (/\.pdf$/i.test(file)) res.setHeader("Content-Disposition", "attachment");
  },
}));

// ---------- Rate limiting (in-memory) ----------
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

// =====================================================================
// PUBLIC API
// =====================================================================
const pub = express.Router();

const cardOf = {
  category: (c) => ({ title: c.title, image: c.image, to: catUrl(c), contain: c.image_fit === "contain" }),
  product: (p, cat) => ({ title: p.title, image: p.images?.[0] || "", to: `/products/${cat?.slug || "all"}/${p.slug}`, contain: p.image_fit === "contain" }),
};

function categoryPayload(c) {
  const pid = c ? c.id : null;
  const kids = all(`SELECT * FROM categories WHERE published=1 AND ${pid ? "parent_id=?" : "parent_id IS NULL"} ORDER BY sort,id`, ...(pid ? [pid] : []));
  const prods = pid ? all("SELECT * FROM products WHERE published=1 AND category_id=? ORDER BY sort,id", pid).map(parseProduct) : [];
  return {
    type: "category",
    category: c ? { slug: c.slug, title: c.title, heading: c.heading || "", description: c.description } : { slug: "", title: "Products", heading: "Our Products", description: "" },
    breadcrumb: c ? breadcrumb(c.id) : [{ title: "Products", to: "/products" }],
    items: [...kids.map(cardOf.category), ...prods.map((p) => cardOf.product(p, c))],
  };
}

function productPayload(p) {
  const cat = get("SELECT * FROM categories WHERE id=?", p.category_id);
  const layout = resolveLayout(p);
  let rel = all("SELECT * FROM products WHERE published=1 AND category_id=? AND id<>? ORDER BY sort,id LIMIT 12", p.category_id, p.id).map(parseProduct);
  if (rel.length < 12 && cat?.parent_id)
    rel = rel.concat(all("SELECT p.* FROM products p JOIN categories c ON c.id=p.category_id WHERE p.published=1 AND c.parent_id=? AND p.id<>? ORDER BY p.sort,p.id LIMIT ?", cat.parent_id, p.id, 12 - rel.length).map(parseProduct));
  const catOf = (x) => get("SELECT slug FROM categories WHERE id=?", x.category_id);
  const { seo_title, seo_desc, seo_image, noindex, layout_id, published, sort, created_at, updated_at, category_id, ...pubFields } = p;
  return {
    type: "product",
    product: { ...pubFields, category: cat && { slug: cat.slug, title: cat.title } },
    breadcrumb: breadcrumb(p.category_id),
    layout: { base: layout.base, options: layout.options },
    related: rel.map((x) => cardOf.product(x, catOf(x))),
  };
}

pub.get(["/entry", "/entry/:slug"], (req, res) => {
  const slug = req.params.slug || "";
  if (!slug) return res.json(categoryPayload(null));
  const c = get("SELECT * FROM categories WHERE slug=? AND published=1", slug);
  if (c) return res.json(categoryPayload(c));
  const p = get("SELECT * FROM products WHERE slug=? AND published=1", slug);
  if (p) return res.json(productPayload(parseProduct(p)));
  res.status(404).json({ error: "Not found" });
});

pub.get("/content/:key", (req, res) => {
  const r = get("SELECT data FROM content WHERE key=?", req.params.key);
  res.json(r ? JSON.parse(r.data) : {});
});

pub.get("/meta", (req, res) => res.json(buildMeta(String(req.query.path || "/"), origin(req)).meta));

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse|headless|monitor|curl|wget|python-requests/i;
pub.post("/track", (req, res) => {
  res.status(204).end();
  try {
    const ua = String(req.headers["user-agent"] || "");
    const b = req.body || {};
    if (BOT.test(ua) || typeof b.path !== "string" || !b.path.startsWith("/") || b.path.startsWith("/admin") || b.path.startsWith("/__") || b.path.startsWith("/api")) return;
    let ref = "";
    try { const h = new URL(b.ref).host; if (h && h !== req.get("host")) ref = h.replace(/^www\./, ""); } catch {}
    const device = /ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop";
    const country = String(req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"] || "").slice(0, 2).toUpperCase();
    run("INSERT INTO visits(ts,path,ref,device,country,sid) VALUES(?,?,?,?,?,?)", Date.now(), b.path.slice(0, 300), ref, device, country, String(b.sid || "").slice(0, 40));
  } catch {}
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
pub.post("/submit", wrap(async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot
  if (limited("submit|" + req.ip, 6, 15 * 60e3)) return res.status(429).json({ error: "Too many requests, please try again later." });
  const type = b.type === "quote" ? "quote" : "contact";
  const sub = { type, name: clip(b.name, 120), email: clip(b.email, 160), phone: clip(b.phone, 40), company: clip(b.company, 160), message: clip(b.message, 5000), product_title: clip(b.product_title, 200), product_code: clip(b.product_code, 200), page_url: clip(b.page_url, 300) };
  if (!sub.name || !sub.message) return res.status(400).json({ error: "Name and message are required." });
  if (!EMAIL.test(sub.email)) return res.status(400).json({ error: "Please enter a valid email address." });
  let pid = Number(b.product_id) || null;
  if (pid && !get("SELECT id FROM products WHERE id=?", pid)) pid = null;
  const now = Date.now();
  const r = run(
    `INSERT INTO submissions(type,name,email,phone,company,message,product_id,product_title,product_code,page_url,ip,user_agent,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    sub.type, sub.name, sub.email, sub.phone, sub.company, sub.message, pid, sub.product_title, sub.product_code, sub.page_url, req.ip, clip(req.headers["user-agent"], 250), now, now
  );
  res.json({ ok: true });
  // الإيميل بعد الرد عشان العميل ما يستناش SMTP
  notifySubmission({ ...sub, id: r.id })
    .then((x) => run("UPDATE submissions SET notified=? WHERE id=?", x.sent ? 1 : 0, r.id))
    .catch((e) => { console.error("[mail]", e.message); run("UPDATE submissions SET notified=-1, notify_error=? WHERE id=?", String(e.message).slice(0, 300), r.id); });
}));

app.use("/api/public", pub);

// =====================================================================
// AUTH
// =====================================================================
const authR = express.Router();
authR.post("/login", wrap(async (req, res) => {
  const email = clip(req.body?.email, 160).toLowerCase();
  const key = `login|${req.ip}|${email}`;
  if (limited(key, 8, 15 * 60e3)) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  const u = get("SELECT * FROM users WHERE email=?", email);
  if (!u || !u.active || !bcrypt.compareSync(String(req.body?.password || ""), u.password_hash)) return res.status(401).json({ error: "Wrong email or password" });
  hits.delete(key);
  run("UPDATE users SET last_login=? WHERE id=?", Date.now(), u.id);
  setAuthCookie(req, res, signToken(u.id));
  logAudit(u, "login", "user", u.id, u.email);
  res.json({ user: loadUser(u.id) });
}));
authR.post("/logout", (req, res) => { clearAuthCookie(res); res.json({ ok: true }); });
authR.get("/me", auth, (req, res) => res.json({ user: req.user }));
authR.put("/password", auth, (req, res) => {
  const { current, password } = req.body || {};
  const u = get("SELECT * FROM users WHERE id=?", req.user.id);
  if (!bcrypt.compareSync(String(current || ""), u.password_hash)) return res.status(400).json({ error: "Current password is wrong" });
  if (String(password || "").length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
  run("UPDATE users SET password_hash=? WHERE id=?", bcrypt.hashSync(password, 10), u.id);
  res.json({ ok: true });
});
app.use("/api/auth", authR);
app.use("/api/admin", auth, adminRouter);

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// =====================================================================
// SEO files + SPA
// =====================================================================
app.get("/sitemap.xml", (req, res) => res.type("application/xml").send(sitemap(origin(req))));
app.get("/robots.txt", (req, res) => res.type("text/plain").send(robots(origin(req))));

if (fs.existsSync(path.join(DIST, "index.html"))) {
  app.use(express.static(DIST, { index: false, maxAge: "1h", setHeaders: (res, p) => p.includes("/assets/") && res.setHeader("Cache-Control", "public,max-age=31536000,immutable") }));
  // بنعيد قراءة index.html لو اتغيّر (بعد كل `npm run build`) من غير restart
  let tpl = { mtime: 0, html: "" };
  const template = () => {
    const f = path.join(DIST, "index.html"), m = fs.statSync(f).mtimeMs;
    if (m !== tpl.mtime) tpl = { mtime: m, html: fs.readFileSync(f, "utf8") };
    return tpl.html;
  };
  // معاينة المنتج داخل الداش بورد (iframe) — مش للمحركات ولا بتتسجل كزيارة
  app.get("/__preview/*", (req, res) => res.type("html").send(template().replace("<head>", '<head><meta name="robots" content="noindex,nofollow">')));
  app.get("*", (req, res) => {
    const { meta, status } = buildMeta(req.path, origin(req));
    res.status(status).type("html").send(injectHead(template(), meta));
  });
} else if (!PROD) {
  app.get("/", (req, res) => res.type("text").send("EGYLUX API is running. Start the site with `npm run dev` (Vite on :5173) — or `npm run build && npm start`."));
}

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File is too large (max 15 MB)" });
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : err.message?.includes("not allowed") ? err.message : "Server error" });
});

app.listen(PORT, () => console.log(`EGYLUX server → http://localhost:${PORT}  (${PROD ? "production" : "development"})`));
