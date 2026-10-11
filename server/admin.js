import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseDatasheetFile } from "./datasheet.js";
import { all, get, run, getSetting, setSetting, allSettings, logAudit, UPLOAD_DIR } from "./db.js";
import { need, has, PERMISSIONS, ALL_PERMS } from "./auth.js";
import { product as parseProduct, layoutRow, inflate, catChain, descendantIds, resolveLayout, uniqueSlug } from "./model.js";
import { STATIC_PAGES, audit } from "./seo.js";
import { sendMail } from "./mail.js";

const r = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const TZ = Number(process.env.TZ_OFFSET_HOURS ?? 2); // مصر = +2 (توقيت شتوي)
const OFF = `'+${TZ} hours'`;
const day = (ts) => new Date(ts + TZ * 3600e3).toISOString().slice(0, 10);

// ---------- generic save ----------
function persist(table, body, spec, id = null) {
  const vals = {};
  for (const c of spec.text || []) if (c in body) vals[c] = String(body[c] ?? "").trim();
  for (const c of spec.json || []) if (c in body) vals[c] = JSON.stringify(body[c] ?? null);
  for (const c of spec.bool || []) if (c in body) vals[c] = body[c] ? 1 : 0;
  for (const c of spec.int || []) if (c in body) vals[c] = Number(body[c]) || 0;
  for (const c of spec.ref || []) if (c in body) vals[c] = body[c] ? Number(body[c]) : null;
  if (spec.stamps) vals.updated_at = Date.now();
  if (!id && spec.slugFrom) vals.slug = uniqueSlug(table, body.slug || body[spec.slugFrom]);
  const keys = Object.keys(vals);
  if (id) {
    if (keys.length) run(`UPDATE ${table} SET ${keys.map((k) => k + "=?").join(",")} WHERE id=?`, ...keys.map((k) => vals[k]), id);
    return id;
  }
  if (spec.stamps) vals.created_at = Date.now();
  else if (spec.created) vals.created_at = Date.now();
  const ks = Object.keys(vals);
  return run(`INSERT INTO ${table}(${ks.join(",")}) VALUES(${ks.map(() => "?").join(",")})`, ...ks.map((k) => vals[k])).id;
}
const SEO_TEXT = ["seo_title", "seo_desc", "seo_image"];

// ---------- meta (permissions list for UI) ----------
r.get("/meta", (req, res) => res.json({ permissions: PERMISSIONS, staticPages: STATIC_PAGES }));
r.get("/badges", (req, res) => res.json({ newSubmissions: has(req.user, "submissions.view") ? get("SELECT COUNT(*) n FROM submissions WHERE status='new'").n : 0 }));

// =====================================================================
// ANALYTICS + DASHBOARD
// =====================================================================
function analytics(days) {
  const now = Date.now();
  const since = now - days * 864e5;
  const prevSince = since - days * 864e5;
  const cur = get("SELECT COUNT(*) views, COUNT(DISTINCT sid) visitors FROM visits WHERE ts>=?", since);
  const prev = get("SELECT COUNT(*) views, COUNT(DISTINCT sid) visitors FROM visits WHERE ts>=? AND ts<?", prevSince, since);
  const rows = all(`SELECT date(ts/1000,'unixepoch',${OFF}) d, COUNT(*) views, COUNT(DISTINCT sid) visitors FROM visits WHERE ts>=? GROUP BY d`, since);
  const map = Object.fromEntries(rows.map((x) => [x.d, x]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) { const d = day(now - i * 864e5); series.push({ date: d, views: map[d]?.views || 0, visitors: map[d]?.visitors || 0 }); }
  const sessions = get("SELECT COUNT(DISTINCT sid) n FROM visits WHERE ts>=?", since).n || 1;
  const pages = all("SELECT path, COUNT(*) views, COUNT(DISTINCT sid) visitors FROM visits WHERE ts>=? GROUP BY path ORDER BY views DESC LIMIT 12", since);
  const prodViews = {};
  for (const p of all("SELECT path, COUNT(*) v FROM visits WHERE ts>=? AND path LIKE '/products/%/%' GROUP BY path", since)) {
    const slug = p.path.split("?")[0].split("/").filter(Boolean).pop();
    prodViews[slug] = (prodViews[slug] || 0) + p.v;
  }
  const products = Object.entries(prodViews).map(([slug, views]) => {
    const pr = get("SELECT id,title FROM products WHERE slug=?", slug);
    return pr && { id: pr.id, title: pr.title, slug, views };
  }).filter(Boolean).sort((a, b) => b.views - a.views).slice(0, 8);
  return {
    days,
    totals: {
      views: cur.views, visitors: cur.visitors, prevViews: prev.views, prevVisitors: prev.visitors,
      pagesPerVisit: +(cur.views / sessions).toFixed(1),
      live: get("SELECT COUNT(DISTINCT sid) n FROM visits WHERE ts>=?", now - 5 * 60e3).n,
      today: get("SELECT COUNT(*) n FROM visits WHERE ts>=?", new Date(day(now) + "T00:00:00Z").getTime() - TZ * 3600e3).n,
    },
    series, pages, products,
    referrers: all("SELECT ref name, COUNT(*) n FROM visits WHERE ts>=? AND ref<>'' GROUP BY ref ORDER BY n DESC LIMIT 8", since),
    devices: all("SELECT device name, COUNT(*) n FROM visits WHERE ts>=? GROUP BY device ORDER BY n DESC", since),
    countries: all("SELECT country name, COUNT(*) n FROM visits WHERE ts>=? AND country<>'' GROUP BY country ORDER BY n DESC LIMIT 8", since),
  };
}
r.get("/analytics", need("analytics.view"), (req, res) => res.json(analytics(Math.min(Math.max(Number(req.query.days) || 30, 1), 365))));

r.get("/stats", need("dashboard.view"), (req, res) => {
  const canSub = has(req.user, "submissions.view");
  const sub = canSub ? {
    counts: Object.fromEntries(all("SELECT status, COUNT(*) n FROM submissions GROUP BY status").map((x) => [x.status, x.n])),
    recent: all("SELECT id,type,name,email,product_title,status,created_at FROM submissions ORDER BY id DESC LIMIT 6"),
    series: (() => {
      const since = Date.now() - 14 * 864e5;
      const m = Object.fromEntries(all(`SELECT date(created_at/1000,'unixepoch',${OFF}) d, COUNT(*) n FROM submissions WHERE created_at>=? GROUP BY d`, since).map((x) => [x.d, x.n]));
      return Array.from({ length: 14 }, (_, i) => { const d = day(Date.now() - (13 - i) * 864e5); return { date: d, n: m[d] || 0 }; });
    })(),
  } : null;
  res.json({
    catalog: { products: get("SELECT COUNT(*) n FROM products").n, published: get("SELECT COUNT(*) n FROM products WHERE published=1").n, categories: get("SELECT COUNT(*) n FROM categories").n },
    submissions: sub,
    analytics: has(req.user, "analytics.view") ? analytics(14) : null,
    seo: has(req.user, "seo.manage") ? (({ score, counts }) => ({ score, counts }))(audit()) : null,
  });
});

// =====================================================================
// SUBMISSIONS (forms + get quote)
// =====================================================================
function subFilter(q) {
  const w = [], p = [];
  if (q.status && q.status !== "all") { w.push("s.status=?"); p.push(q.status); }
  if (q.type && q.type !== "all") { w.push("s.type=?"); p.push(q.type); }
  if (q.product_id) { w.push("s.product_id=?"); p.push(Number(q.product_id)); }
  if (q.q) { w.push("(s.name LIKE ? OR s.email LIKE ? OR s.company LIKE ? OR s.message LIKE ? OR s.product_title LIKE ? OR s.phone LIKE ?)"); p.push(...Array(6).fill(`%${q.q}%`)); }
  return [w.length ? "WHERE " + w.join(" AND ") : "", p];
}
const SUB_SELECT = "SELECT s.*, u.name AS assigned_name FROM submissions s LEFT JOIN users u ON u.id=s.assigned_to";

r.get("/submissions", need("submissions.view"), (req, res) => {
  const [where, p] = subFilter(req.query);
  const limit = Math.min(Number(req.query.limit) || 20, 100), page = Math.max(Number(req.query.page) || 1, 1);
  const items = all(`${SUB_SELECT} ${where} ORDER BY s.id DESC LIMIT ? OFFSET ?`, ...p, limit, (page - 1) * limit).map((x) => ({ ...x, message: x.message?.slice(0, 160) }));
  const total = get(`SELECT COUNT(*) n FROM submissions s ${where}`, ...p).n;
  const counts = Object.fromEntries(all("SELECT status, COUNT(*) n FROM submissions GROUP BY status").map((x) => [x.status, x.n]));
  res.json({ items, total, page, limit, counts });
});

r.get("/submissions/export.csv", need("submissions.view"), (req, res) => {
  const [where, p] = subFilter(req.query);
  const rows = all(`${SUB_SELECT} ${where} ORDER BY s.id DESC`, ...p);
  const cols = ["id", "created_at", "type", "status", "name", "email", "phone", "company", "product_title", "product_code", "message", "note", "assigned_name", "page_url"];
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "\uFEFF" + [cols.join(","), ...rows.map((x) => cols.map((c) => cell(c === "created_at" ? new Date(x.created_at).toISOString() : x[c])).join(","))].join("\r\n");
  res.setHeader("Content-Disposition", `attachment; filename="submissions-${day(Date.now())}.csv"`);
  res.type("text/csv").send(csv);
});

r.get("/submissions/:id", need("submissions.view"), (req, res) => {
  const s = get(`${SUB_SELECT} WHERE s.id=?`, req.params.id);
  if (!s) return bad(res, "Not found", 404);
  const prod = s.product_id ? get("SELECT id,title,slug FROM products WHERE id=?", s.product_id) : null;
  const history = all("SELECT id,type,status,created_at FROM submissions WHERE email=? AND id<>? ORDER BY id DESC LIMIT 5", s.email, s.id);
  res.json({ ...s, product: prod, history });
});

r.patch("/submissions/:id", need("submissions.manage"), (req, res) => {
  const b = req.body || {};
  const sets = [], p = [];
  if (b.status) { if (!["new", "in_progress", "done", "spam"].includes(b.status)) return bad(res, "Invalid status"); sets.push("status=?"); p.push(b.status); }
  if ("note" in b) { sets.push("note=?"); p.push(String(b.note).slice(0, 4000)); }
  if ("assigned_to" in b) { sets.push("assigned_to=?"); p.push(b.assigned_to ? Number(b.assigned_to) : null); }
  if (!sets.length) return res.json({ ok: true });
  run(`UPDATE submissions SET ${sets.join(",")}, updated_at=? WHERE id=?`, ...p, Date.now(), req.params.id);
  logAudit(req.user, "update", "submission", req.params.id, b.status || "");
  res.json({ ok: true });
});
r.delete("/submissions/:id", need("submissions.manage"), (req, res) => { run("DELETE FROM submissions WHERE id=?", req.params.id); logAudit(req.user, "delete", "submission", req.params.id); res.json({ ok: true }); });
r.post("/submissions/bulk", need("submissions.manage"), (req, res) => {
  const ids = (req.body?.ids || []).map(Number).filter(Boolean);
  if (!ids.length) return res.json({ ok: true });
  const ph = ids.map(() => "?").join(",");
  if (req.body.action === "delete") run(`DELETE FROM submissions WHERE id IN (${ph})`, ...ids);
  else if (["new", "in_progress", "done", "spam"].includes(req.body.status)) run(`UPDATE submissions SET status=?, updated_at=? WHERE id IN (${ph})`, req.body.status, Date.now(), ...ids);
  res.json({ ok: true });
});

// =====================================================================
// CATEGORIES
// =====================================================================
const CAT = { text: ["title", "heading", "image", "image_fit", "description", ...SEO_TEXT], bool: ["published", "noindex"], int: ["sort"], ref: ["parent_id", "layout_id"], stamps: true, slugFrom: "title" };

r.get("/categories", need("products.view", "categories.manage"), (req, res) => {
  const rows = all(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) AS product_count,
    (SELECT COUNT(*) FROM categories k WHERE k.parent_id=c.id) AS child_count, l.name AS layout_name FROM categories c LEFT JOIN layouts l ON l.id=c.layout_id ORDER BY c.sort,c.id`);
  res.json(rows.map((c) => ({ ...c, path: catChain(c.id).map((x) => x.title).join(" › ") })));
});
function checkParent(res, id, parent) {
  if (!parent) return true;
  if (!get("SELECT id FROM categories WHERE id=?", parent)) return bad(res, "Parent category not found") && false;
  if (id && descendantIds(id).includes(Number(parent))) return bad(res, "A category can't be moved inside itself") && false;
  return true;
}
r.post("/categories", need("categories.manage"), (req, res) => {
  const b = req.body || {};
  if (!String(b.title || "").trim()) return bad(res, "Title is required");
  if (!checkParent(res, null, b.parent_id)) return;
  const id = persist("categories", b, CAT);
  logAudit(req.user, "create", "category", id, b.title);
  res.json(get("SELECT * FROM categories WHERE id=?", id));
});
r.put("/categories/:id", need("categories.manage"), (req, res) => {
  const id = Number(req.params.id), b = req.body || {};
  if (!get("SELECT id FROM categories WHERE id=?", id)) return bad(res, "Not found", 404);
  if (!checkParent(res, id, b.parent_id)) return;
  if ("title" in b && !String(b.title).trim()) return bad(res, "Title is required");
  persist("categories", b, CAT, id);
  if (b.slug) run("UPDATE categories SET slug=? WHERE id=?", uniqueSlug("categories", b.slug, id), id);
  logAudit(req.user, "update", "category", id, b.title);
  res.json(get("SELECT * FROM categories WHERE id=?", id));
});
r.delete("/categories/:id", need("categories.manage"), (req, res) => {
  const id = Number(req.params.id);
  const pc = get("SELECT COUNT(*) n FROM products WHERE category_id=?", id).n, cc = get("SELECT COUNT(*) n FROM categories WHERE parent_id=?", id).n;
  if (pc || cc) return bad(res, `This category still has ${pc} product(s) and ${cc} sub-categor${cc === 1 ? "y" : "ies"}. Move or delete them first.`, 409);
  run("DELETE FROM categories WHERE id=?", id);
  logAudit(req.user, "delete", "category", id);
  res.json({ ok: true });
});
// تطبيق Layout على كاتيجوري كاملة (وكل اللي تحتها) ومسح أي override على المنتجات
r.post("/categories/:id/apply-layout", need("layouts.manage"), (req, res) => {
  const id = Number(req.params.id), lid = req.body?.layout_id ? Number(req.body.layout_id) : null;
  const ids = descendantIds(id), ph = ids.map(() => "?").join(",");
  run(`UPDATE categories SET layout_id=? WHERE id IN (${ph})`, lid, ...ids);
  if (req.body?.reset_products) run(`UPDATE products SET layout_id=NULL WHERE category_id IN (${ph})`, ...ids);
  res.json({ ok: true });
});

// =====================================================================
// PRODUCTS
// =====================================================================
const PROD = { text: ["title", "description", "image_fit", "datasheet", ...SEO_TEXT], json: ["images", "specs", "badges", "tech", "codes", "notes", "files"], bool: ["published", "certified", "noindex"], int: ["sort"], ref: ["category_id", "layout_id"], stamps: true, slugFrom: "title" };

r.get("/products", need("products.view"), (req, res) => {
  const w = [], p = [];
  if (req.query.q) { w.push("(p.title LIKE ? OR p.slug LIKE ? OR p.codes LIKE ?)"); p.push(...Array(3).fill(`%${req.query.q}%`)); }
  if (req.query.category_id) { const ids = descendantIds(Number(req.query.category_id)); w.push(`p.category_id IN (${ids.map(() => "?").join(",")})`); p.push(...ids); }
  if (req.query.status === "published") w.push("p.published=1"); else if (req.query.status === "draft") w.push("p.published=0");
  const where = w.length ? "WHERE " + w.join(" AND ") : "";
  const limit = Math.min(Number(req.query.limit) || 25, 100), page = Math.max(Number(req.query.page) || 1, 1);
  const rows = all(`SELECT p.* FROM products p ${where} ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`, ...p, limit, (page - 1) * limit).map(parseProduct);
  const items = rows.map((x) => {
    const l = resolveLayout(x);
    return { id: x.id, title: x.title, slug: x.slug, image: x.images[0] || "", published: x.published, updated_at: x.updated_at, category: catChain(x.category_id).map((c) => c.title).join(" › "), layout: l.name, layout_source: l.source, seo_ok: !!(x.seo_title && x.seo_desc) };
  });
  res.json({ items, total: get(`SELECT COUNT(*) n FROM products p ${where}`, ...p).n, page, limit });
});
r.get("/products/:id", need("products.view"), (req, res) => {
  const row = get("SELECT * FROM products WHERE id=?", req.params.id);
  if (!row) return bad(res, "Not found", 404);
  const p = parseProduct(row);
  const l = resolveLayout(p);
  res.json({ ...p, effective_layout: { id: l.id, name: l.name, source: l.source, source_title: l.source_title }, views_30d: get("SELECT COUNT(*) n FROM visits WHERE ts>=? AND path LIKE ?", Date.now() - 30 * 864e5, `%/${p.slug}`).n, submissions: get("SELECT COUNT(*) n FROM submissions WHERE product_id=?", p.id).n });
});
function validateProduct(res, b, creating) {
  if (creating || "title" in b) if (!String(b.title || "").trim()) return bad(res, "Title is required") && false;
  if (creating || "category_id" in b) if (!b.category_id || !get("SELECT id FROM categories WHERE id=?", b.category_id)) return bad(res, "Please choose a category") && false;
  return true;
}
r.post("/products", need("products.edit"), (req, res) => {
  const b = req.body || {};
  if (!validateProduct(res, b, true)) return;
  const id = persist("products", b, PROD);
  logAudit(req.user, "create", "product", id, b.title);
  res.json({ id });
});
r.put("/products/:id", need("products.edit"), (req, res) => {
  const id = Number(req.params.id), b = req.body || {};
  if (!get("SELECT id FROM products WHERE id=?", id)) return bad(res, "Not found", 404);
  if (!validateProduct(res, b, false)) return;
  persist("products", b, PROD, id);
  if (b.slug) run("UPDATE products SET slug=? WHERE id=?", uniqueSlug("products", b.slug, id), id);
  logAudit(req.user, "update", "product", id, b.title);
  res.json({ id });
});
r.post("/products/:id/duplicate", need("products.edit"), (req, res) => {
  const row = get("SELECT * FROM products WHERE id=?", req.params.id);
  if (!row) return bad(res, "Not found", 404);
  const p = parseProduct(row);
  const id = persist("products", { ...p, title: p.title + " (copy)", slug: p.slug + "-copy", published: 0 }, PROD);
  res.json({ id });
});
r.delete("/products/:id", need("products.delete"), (req, res) => {
  run("DELETE FROM products WHERE id=?", req.params.id);
  logAudit(req.user, "delete", "product", req.params.id);
  res.json({ ok: true });
});
r.post("/products/bulk", need("products.edit"), (req, res) => {
  const ids = (req.body?.ids || []).map(Number).filter(Boolean);
  if (!ids.length) return res.json({ ok: true });
  const ph = ids.map(() => "?").join(",");
  if (req.body.action === "delete") { if (!has(req.user, "products.delete")) return bad(res, "You can't delete products", 403); run(`DELETE FROM products WHERE id IN (${ph})`, ...ids); }
  else if (req.body.action === "publish" || req.body.action === "unpublish") run(`UPDATE products SET published=?, updated_at=? WHERE id IN (${ph})`, req.body.action === "publish" ? 1 : 0, Date.now(), ...ids);
  else if (req.body.action === "move" && req.body.category_id) run(`UPDATE products SET category_id=?, updated_at=? WHERE id IN (${ph})`, Number(req.body.category_id), Date.now(), ...ids);
  else if (req.body.action === "layout") run(`UPDATE products SET layout_id=?, updated_at=? WHERE id IN (${ph})`, req.body.layout_id ? Number(req.body.layout_id) : null, Date.now(), ...ids);
  res.json({ ok: true });
});

// =====================================================================
// LAYOUT TEMPLATES
// =====================================================================
const LAY = { text: ["name", "description", "base"], json: ["options"], created: true };
r.get("/layouts", need("layouts.manage", "products.view"), (req, res) => {
  const def = getSetting("default_layout_id");
  res.json({
    default_id: def,
    items: all("SELECT * FROM layouts ORDER BY id").map(layoutRow).map((l) => ({
      ...l,
      categories: all("SELECT id,title FROM categories WHERE layout_id=?", l.id),
      products_count: get("SELECT COUNT(*) n FROM products WHERE layout_id=?", l.id).n,
    })),
  });
});
r.post("/layouts", need("layouts.manage"), (req, res) => {
  const b = req.body || {};
  if (!String(b.name || "").trim()) return bad(res, "Name is required");
  if (!["standard", "panel"].includes(b.base)) return bad(res, "Choose a base design");
  res.json({ id: persist("layouts", b, LAY) });
});
r.put("/layouts/:id", need("layouts.manage"), (req, res) => {
  const b = req.body || {};
  if ("base" in b && !["standard", "panel"].includes(b.base)) return bad(res, "Invalid base design");
  persist("layouts", b, LAY, Number(req.params.id));
  res.json({ ok: true });
});
r.delete("/layouts/:id", need("layouts.manage"), (req, res) => {
  if (Number(req.params.id) === getSetting("default_layout_id")) return bad(res, "This is the site default layout — choose another default first.", 409);
  run("DELETE FROM layouts WHERE id=?", req.params.id);
  res.json({ ok: true });
});
// "كل الموقع بنفس الـ Layout": يعمل default + يمسح كل override على الكاتيجوري والمنتجات
r.post("/layouts/:id/apply-all", need("layouts.manage"), (req, res) => {
  const id = Number(req.params.id);
  setSetting("default_layout_id", id);
  run("UPDATE categories SET layout_id=NULL");
  run("UPDATE products SET layout_id=NULL");
  logAudit(req.user, "apply-all-layout", "layout", id);
  res.json({ ok: true });
});
r.put("/layouts/:id/default", need("layouts.manage"), (req, res) => { setSetting("default_layout_id", Number(req.params.id)); res.json({ ok: true }); });

// =====================================================================
// CONTENT (editable page text)
// =====================================================================
r.get("/content", need("content.edit"), (req, res) => res.json(all("SELECT key, updated_at FROM content ORDER BY key")));
r.get("/content/:key", need("content.edit"), (req, res) => {
  const row = get("SELECT data, updated_at FROM content WHERE key=?", req.params.key);
  res.json({ data: row ? JSON.parse(row.data) : {}, updated_at: row?.updated_at || null });
});
r.put("/content/:key", need("content.edit"), (req, res) => {
  if (!/^[a-z0-9_-]{1,40}$/.test(req.params.key)) return bad(res, "Invalid key");
  run("INSERT INTO content(key,data,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at, updated_by=excluded.updated_by", req.params.key, JSON.stringify(req.body?.data ?? {}), Date.now(), req.user.id);
  logAudit(req.user, "update", "content", req.params.key);
  res.json({ ok: true });
});

// =====================================================================
// SEO
// =====================================================================
const SEO_KEYS = ["site_name", "site_url", "title_template", "home_title", "default_description", "default_og_image", "twitter_handle", "google_verification", "ga_id", "robots_extra"];
r.get("/seo", need("seo.manage"), (req, res) => {
  const S = allSettings();
  res.json({ global: Object.fromEntries(SEO_KEYS.map((k) => [k, S[k] ?? ""])), pages: S.seo_pages || {}, staticPages: STATIC_PAGES });
});
r.put("/seo", need("seo.manage"), (req, res) => {
  const b = req.body || {};
  for (const k of SEO_KEYS) if (k in (b.global || {})) setSetting(k, String(b.global[k] ?? "").trim());
  if (b.pages) setSetting("seo_pages", b.pages);
  logAudit(req.user, "update", "seo");
  res.json({ ok: true });
});
r.get("/seo/audit", need("seo.manage"), (req, res) => res.json(audit(`${req.protocol}://${req.get("host")}`)));

// =====================================================================
// USERS & ROLES
// =====================================================================
const roleIsStar = (id) => (JSON.parse(get("SELECT permissions FROM roles WHERE id=?", id)?.permissions || "[]")).includes("*");
r.get("/users", need("users.manage", "submissions.manage"), (req, res) => {
  const rows = all("SELECT u.id,u.name,u.email,u.active,u.role_id,u.last_login,u.created_at,r.name AS role FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id");
  res.json(has(req.user, "users.manage") ? rows : rows.map((u) => ({ id: u.id, name: u.name }))); // للـ assign في الـ submissions
});
r.post("/users", need("users.manage"), (req, res) => {
  const b = req.body || {};
  const email = String(b.email || "").trim().toLowerCase();
  if (!String(b.name || "").trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(res, "Name and a valid email are required");
  if (String(b.password || "").length < 8) return bad(res, "Password must be at least 8 characters");
  if (!get("SELECT id FROM roles WHERE id=?", b.role_id)) return bad(res, "Choose a role");
  if (roleIsStar(b.role_id) && !has(req.user, "*")) return bad(res, "Only a Super Admin can create another Super Admin", 403);
  if (get("SELECT id FROM users WHERE email=?", email)) return bad(res, "A user with this email already exists", 409);
  const id = run("INSERT INTO users(name,email,password_hash,role_id,active,created_at) VALUES(?,?,?,?,?,?)", b.name.trim(), email, bcrypt.hashSync(b.password, 10), Number(b.role_id), b.active === false ? 0 : 1, Date.now()).id;
  logAudit(req.user, "create", "user", id, email);
  res.json({ id });
});
r.put("/users/:id", need("users.manage"), (req, res) => {
  const id = Number(req.params.id), b = req.body || {};
  const u = get("SELECT * FROM users WHERE id=?", id);
  if (!u) return bad(res, "Not found", 404);
  if ((roleIsStar(u.role_id) || (b.role_id && roleIsStar(b.role_id))) && !has(req.user, "*")) return bad(res, "Only a Super Admin can modify Super Admins", 403);
  const sets = [], p = [];
  if (b.name) { sets.push("name=?"); p.push(String(b.name).trim()); }
  if (b.email) { sets.push("email=?"); p.push(String(b.email).trim().toLowerCase()); }
  if (b.role_id) { if (!get("SELECT id FROM roles WHERE id=?", b.role_id)) return bad(res, "Role not found"); sets.push("role_id=?"); p.push(Number(b.role_id)); }
  if ("active" in b) { if (id === req.user.id && !b.active) return bad(res, "You can't deactivate yourself"); sets.push("active=?"); p.push(b.active ? 1 : 0); }
  if (b.password) { if (String(b.password).length < 8) return bad(res, "Password must be at least 8 characters"); sets.push("password_hash=?"); p.push(bcrypt.hashSync(b.password, 10)); }
  // ما نسيبش النظام من غير Super Admin
  const losing = (b.role_id && !roleIsStar(b.role_id) && roleIsStar(u.role_id)) || ("active" in b && !b.active && roleIsStar(u.role_id));
  if (losing && get("SELECT COUNT(*) n FROM users u JOIN roles r ON r.id=u.role_id WHERE u.active=1 AND r.permissions LIKE '%\"*\"%' AND u.id<>?", id).n === 0) return bad(res, "There must be at least one active Super Admin", 409);
  try { if (sets.length) run(`UPDATE users SET ${sets.join(",")} WHERE id=?`, ...p, id); } catch { return bad(res, "That email is already in use", 409); }
  logAudit(req.user, "update", "user", id, u.email);
  res.json({ ok: true });
});
r.delete("/users/:id", need("users.manage"), (req, res) => {
  const id = Number(req.params.id);
  const u = get("SELECT * FROM users WHERE id=?", id);
  if (!u) return bad(res, "Not found", 404);
  if (id === req.user.id) return bad(res, "You can't delete your own account");
  if (roleIsStar(u.role_id) && !has(req.user, "*")) return bad(res, "Only a Super Admin can delete Super Admins", 403);
  run("UPDATE submissions SET assigned_to=NULL WHERE assigned_to=?", id);
  run("DELETE FROM users WHERE id=?", id);
  logAudit(req.user, "delete", "user", id, u.email);
  res.json({ ok: true });
});

r.get("/roles", need("roles.manage", "users.manage"), (req, res) =>
  res.json(all("SELECT r.*, (SELECT COUNT(*) FROM users u WHERE u.role_id=r.id) AS users FROM roles r ORDER BY r.id").map((x) => inflate(x, "permissions"))));
function cleanPerms(list) { return [...new Set((list || []).filter((p) => ALL_PERMS.includes(p)))]; }
r.post("/roles", need("roles.manage"), (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return bad(res, "Role name is required");
  if (get("SELECT id FROM roles WHERE name=?", name)) return bad(res, "A role with this name already exists", 409);
  res.json({ id: run("INSERT INTO roles(name,permissions) VALUES(?,?)", name, JSON.stringify(cleanPerms(req.body.permissions))).id });
});
r.put("/roles/:id", need("roles.manage"), (req, res) => {
  const role = get("SELECT * FROM roles WHERE id=?", req.params.id);
  if (!role) return bad(res, "Not found", 404);
  if (JSON.parse(role.permissions).includes("*")) return bad(res, "The Super Admin role can't be edited", 409);
  const name = String(req.body?.name || role.name).trim();
  if (get("SELECT id FROM roles WHERE name=? AND id<>?", name, role.id)) return bad(res, "A role with this name already exists", 409);
  run("UPDATE roles SET name=?, permissions=? WHERE id=?", name, JSON.stringify(cleanPerms(req.body.permissions)), role.id);
  logAudit(req.user, "update", "role", role.id, name);
  res.json({ ok: true });
});
r.delete("/roles/:id", need("roles.manage"), (req, res) => {
  const role = get("SELECT * FROM roles WHERE id=?", req.params.id);
  if (!role) return bad(res, "Not found", 404);
  if (JSON.parse(role.permissions).includes("*")) return bad(res, "The Super Admin role can't be deleted", 409);
  const n = get("SELECT COUNT(*) n FROM users WHERE role_id=?", role.id).n;
  if (n) return bad(res, `${n} user(s) still have this role. Reassign them first.`, 409);
  run("DELETE FROM roles WHERE id=?", role.id);
  res.json({ ok: true });
});

// =====================================================================
// MEDIA
// =====================================================================
const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".zip", ".dwg", ".ies", ".ldt"]);
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => (ALLOWED.has(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error("This file type is not allowed"))),
});
r.get("/media", need("media.manage", "products.edit", "content.edit", "categories.manage", "seo.manage"), (req, res) => {
  const q = req.query.q ? `%${req.query.q}%` : "%";
  const kind = req.query.kind === "image" ? "AND mime LIKE 'image/%'" : req.query.kind === "file" ? "AND mime NOT LIKE 'image/%'" : "";
  res.json(all(`SELECT * FROM media WHERE original LIKE ? ${kind} ORDER BY id DESC LIMIT 300`, q));
});
// قراءة الـ Datasheet PDF المرفوع واستخراج خانات الجدول (للمراجعة قبل الحفظ)
r.post("/datasheet/parse", need("products.edit"), async (req, res) => {
  const url = String(req.body?.url || "");
  if (!/^\/uploads\/[^/\\]+\.pdf$/i.test(url)) return res.status(400).json({ error: "Upload the datasheet as a PDF first" });
  try { res.json(await parseDatasheetFile(path.join(UPLOAD_DIR, path.basename(url)))); }
  catch (e) { res.status(422).json({ error: e.message || "Couldn't read this PDF" }); }
});

r.post("/media", need("media.manage", "products.edit", "content.edit", "categories.manage", "seo.manage"), upload.array("files", 20), (req, res) => {
  const out = (req.files || []).map((f) => {
    const url = "/uploads/" + f.filename;
    const id = run("INSERT INTO media(filename,original,url,mime,size,created_at,created_by) VALUES(?,?,?,?,?,?,?)", f.filename, f.originalname, url, f.mimetype, f.size, Date.now(), req.user.id).id;
    return { id, url, original: f.originalname, mime: f.mimetype, size: f.size };
  });
  res.json(out);
});
r.patch("/media/:id", need("media.manage"), (req, res) => { run("UPDATE media SET alt=? WHERE id=?", String(req.body?.alt || "").slice(0, 200), req.params.id); res.json({ ok: true }); });
r.delete("/media/:id", need("media.manage"), (req, res) => {
  const m = get("SELECT * FROM media WHERE id=?", req.params.id);
  if (m) { fs.rm(path.join(UPLOAD_DIR, path.basename(m.filename)), () => {}); run("DELETE FROM media WHERE id=?", m.id); }
  res.json({ ok: true });
});

// =====================================================================
// SETTINGS (notifications / SMTP) + activity log
// =====================================================================
r.get("/settings", need("settings.manage"), (req, res) => {
  const S = allSettings(), smtp = S.smtp || {};
  res.json({
    notify_emails: S.notify_emails || "", notify_quote: S.notify_quote !== false, notify_contact: S.notify_contact !== false,
    smtp: { host: smtp.host || "", port: smtp.port || 587, user: smtp.user || "", from: smtp.from || "", secure: !!smtp.secure, has_pass: !!smtp.pass },
    env_smtp: !!process.env.SMTP_HOST,
  });
});
r.put("/settings", need("settings.manage"), (req, res) => {
  const b = req.body || {};
  if ("notify_emails" in b) setSetting("notify_emails", String(b.notify_emails).trim());
  if ("notify_quote" in b) setSetting("notify_quote", !!b.notify_quote);
  if ("notify_contact" in b) setSetting("notify_contact", !!b.notify_contact);
  if (b.smtp) {
    const old = getSetting("smtp", {}) || {};
    setSetting("smtp", { host: String(b.smtp.host || "").trim(), port: Number(b.smtp.port) || 587, user: String(b.smtp.user || "").trim(), from: String(b.smtp.from || "").trim(), secure: !!b.smtp.secure, pass: b.smtp.pass ? String(b.smtp.pass) : old.pass || "" });
  }
  logAudit(req.user, "update", "settings");
  res.json({ ok: true });
});
r.post("/settings/test-email", need("settings.manage"), wrap(async (req, res) => {
  const to = String(req.body?.to || getSetting("notify_emails", "")).split(/[,;\s]+/).filter(Boolean).join(",") || req.user.email;
  try {
    await sendMail({ to, subject: "EGYLUX dashboard — test email", html: "<p>✅ Email notifications are working. You'll receive new quote requests and contact messages here.</p>", text: "Email notifications are working." });
    res.json({ ok: true, to });
  } catch (e) { bad(res, "Could not send: " + e.message); }
}));
r.get("/audit", need("settings.manage", "users.manage"), (req, res) =>
  res.json(all("SELECT a.*, u.name AS user_name FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 100")));

export default r;
