import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export const DATA_DIR = path.resolve(process.env.DATA_DIR || "server/data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, "egylux.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

const plain = (r) => ({ ...r });
const clean = (p) => p.map((v) => (v === undefined ? null : typeof v === "boolean" ? +v : v));
export const all = (sql, ...p) => db.prepare(sql).all(...clean(p)).map(plain);
export const get = (sql, ...p) => { const r = db.prepare(sql).get(...clean(p)); return r ? plain(r) : null; };
export const run = (sql, ...p) => {
  const r = db.prepare(sql).run(...clean(p));
  return { changes: Number(r.changes), id: Number(r.lastInsertRowid) };
};

db.exec(`
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, permissions TEXT NOT NULL DEFAULT '[]', is_system INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id), active INTEGER DEFAULT 1, last_login INTEGER, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS layouts (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', base TEXT NOT NULL DEFAULT 'standard',
  options TEXT NOT NULL DEFAULT '{}', created_at INTEGER
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES categories(id), slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
  heading TEXT DEFAULT '', image TEXT DEFAULT '', image_fit TEXT DEFAULT 'cover', description TEXT DEFAULT '',
  layout_id INTEGER REFERENCES layouts(id) ON DELETE SET NULL, sort INTEGER DEFAULT 0, published INTEGER DEFAULT 1,
  seo_title TEXT DEFAULT '', seo_desc TEXT DEFAULT '', seo_image TEXT DEFAULT '', noindex INTEGER DEFAULT 0,
  created_at INTEGER, updated_at INTEGER
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY, category_id INTEGER REFERENCES categories(id), slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
  images TEXT DEFAULT '[]', image_fit TEXT DEFAULT 'cover', description TEXT DEFAULT '', specs TEXT DEFAULT '[]',
  badges TEXT DEFAULT '[]', certified INTEGER DEFAULT 0, tech TEXT DEFAULT 'null', codes TEXT DEFAULT '[]',
  notes TEXT DEFAULT '[]', files TEXT DEFAULT '[]',
  layout_id INTEGER REFERENCES layouts(id) ON DELETE SET NULL, sort INTEGER DEFAULT 0, published INTEGER DEFAULT 1,
  seo_title TEXT DEFAULT '', seo_desc TEXT DEFAULT '', seo_image TEXT DEFAULT '', noindex INTEGER DEFAULT 0,
  created_at INTEGER, updated_at INTEGER
);
CREATE TABLE IF NOT EXISTS content (key TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER, updated_by INTEGER);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY, type TEXT NOT NULL, name TEXT, email TEXT, phone TEXT, company TEXT, message TEXT,
  product_id INTEGER, product_title TEXT, product_code TEXT, page_url TEXT, ip TEXT, user_agent TEXT,
  status TEXT DEFAULT 'new', note TEXT DEFAULT '', assigned_to INTEGER, notified INTEGER DEFAULT 0, notify_error TEXT DEFAULT '',
  created_at INTEGER, updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sub_status ON submissions(status, created_at);
CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY, ts INTEGER, path TEXT, ref TEXT, device TEXT, country TEXT, sid TEXT);
CREATE INDEX IF NOT EXISTS idx_visits_ts ON visits(ts);
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY, filename TEXT, original TEXT, url TEXT, mime TEXT, size INTEGER, alt TEXT DEFAULT '', created_at INTEGER, created_by INTEGER
);
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, ts INTEGER, user_id INTEGER, action TEXT, entity TEXT, entity_id TEXT, label TEXT);
`);

// ملف الـ Datasheet (PDF) الرئيسي للمنتج — عمود جديد، بيتضاف تلقائيًا للداتابيز القديمة
if (!all("PRAGMA table_info(products)").some((c) => c.name === "datasheet")) db.exec("ALTER TABLE products ADD COLUMN datasheet TEXT DEFAULT ''");


// ---------- settings ----------
export const getSetting = (key, def = null) => {
  const r = get("SELECT value FROM settings WHERE key=?", key);
  if (!r) return def;
  try { return JSON.parse(r.value); } catch { return def; }
};
export const setSetting = (key, value) =>
  run("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", key, JSON.stringify(value));
export const allSettings = () => Object.fromEntries(all("SELECT key,value FROM settings").map((r) => [r.key, JSON.parse(r.value)]));

export const logAudit = (user, action, entity, entity_id = "", label = "") =>
  run("INSERT INTO audit(ts,user_id,action,entity,entity_id,label) VALUES(?,?,?,?,?,?)", Date.now(), user?.id ?? null, action, entity, String(entity_id), label);

// ---------- seed ----------
export async function seedIfEmpty() {
  const now = Date.now();
  if (!get("SELECT id FROM roles LIMIT 1")) {
    const roles = [
      ["Super Admin", ["*"], 1],
      ["Content Editor", ["dashboard.view", "products.view", "products.edit", "categories.manage", "content.edit", "media.manage", "layouts.manage"], 1],
      ["Sales", ["dashboard.view", "submissions.view", "submissions.manage", "products.view"], 1],
      ["SEO Specialist", ["dashboard.view", "seo.manage", "analytics.view", "products.view", "content.edit"], 1],
    ];
    for (const [n, p, s] of roles) run("INSERT INTO roles(name,permissions,is_system) VALUES(?,?,?)", n, JSON.stringify(p), s);
  }

  if (!get("SELECT id FROM users LIMIT 1")) {
    const email = (process.env.ADMIN_EMAIL || "admin@egylux.com").toLowerCase();
    const generated = !process.env.ADMIN_PASSWORD;
    const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString("base64url");
    const role = get("SELECT id FROM roles WHERE name='Super Admin'");
    run("INSERT INTO users(name,email,password_hash,role_id,created_at) VALUES(?,?,?,?,?)", process.env.ADMIN_NAME || "Administrator", email, bcrypt.hashSync(password, 10), role.id, now);
    console.log("\n  ┌──────────────────────────────────────────────┐");
    console.log("  │  First run: admin account created             │");
    console.log(`  │  Email:    ${email.padEnd(34)} │`);
    console.log(`  │  Password: ${(generated ? password : "(from ADMIN_PASSWORD)").padEnd(34)} │`);
    console.log("  │  Login at /admin  — change the password!      │");
    console.log("  └──────────────────────────────────────────────┘\n");
  }

  if (!get("SELECT id FROM layouts LIMIT 1")) {
    const full = { galleryOverview: true, showScale: true, showBadges: true, showSpecs: true, showTech: true, showCodes: true, showNotes: true, showRelated: true, showQuote: true, showDownload: true, quoteLabel: "Get Quotation", relatedTitle: "Related Products" };
    run("INSERT INTO layouts(name,description,base,options,created_at) VALUES(?,?,?,?,?)", "Standard", "Breadcrumb + gallery on the left, badges, description and specifications on the right.", "standard", JSON.stringify(full), now);
    run("INSERT INTO layouts(name,description,base,options,created_at) VALUES(?,?,?,?,?)", "Panel / Datasheet", "Big title with gallery, datasheet download and product codes. No badges or spec box.", "panel", JSON.stringify({ ...full, showBadges: false, showSpecs: false, quoteLabel: "Get Quotation" }), now);
  }

  if (!get("SELECT id FROM categories LIMIT 1")) await seedCatalog(now);

  const seedContent = await import("./seedContent.js");
  for (const [key, data] of Object.entries(seedContent.default)) {
    if (!get("SELECT key FROM content WHERE key=?", key)) run("INSERT INTO content(key,data,updated_at) VALUES(?,?,?)", key, JSON.stringify(data), now);
  }

  const defaults = {
    site_name: "EGYLUX",
    site_url: process.env.SITE_URL || "",
    title_template: "%s | EGYLUX",
    home_title: "EGYLUX | We Light Your Life",
    default_description: "EGYLUX is an Egyptian manufacturer of LED lighting solutions since 1996 — indoor, outdoor, panels, cylinders, floodlights and more for the MENA region.",
    default_og_image: "",
    twitter_handle: "",
    google_verification: "",
    ga_id: "",
    robots_extra: "",
    notify_emails: process.env.ADMIN_EMAIL || get("SELECT email FROM users ORDER BY id LIMIT 1")?.email || "",
    notify_quote: true,
    notify_contact: true,
    smtp: {},
    seo_pages: {},
  };
  for (const [k, v] of Object.entries(defaults)) if (getSetting(k) === null) setSetting(k, v);
  if (getSetting("default_layout_id") === null) setSetting("default_layout_id", get("SELECT id FROM layouts ORDER BY id LIMIT 1").id);
}

async function seedCatalog(now) {
  const { categories, getProduct, icons } = await import("../src/data/products.js");
  const assets = await import("../src/assets.js");
  const panelLayout = get("SELECT id FROM layouts WHERE base='panel'").id;
  const mk = (slug, title, parent, o = {}) =>
    run(
      "INSERT INTO categories(parent_id,slug,title,heading,image,image_fit,layout_id,sort,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
      parent, slug, title, o.heading || "", o.image || "", o.fit || "cover", o.layout || null, o.sort || 0, now, now
    ).id;

  const indoor = mk("indoor", "Indoor Lighting", null, { heading: "Indoor Lighting Categories", image: assets.indoorBg, sort: 1 });
  const outdoor = mk("outdoor", "Outdoor Lighting", null, { heading: "Outdoor Lighting Categories", image: assets.outdoorBg, sort: 2 });
  const [cylItem, panItem, dlItem] = categories.indoor.items;
  const cyl = mk("cylinders", "Cylinders", indoor, { image: cylItem.image, sort: 1 });
  const pan = mk("panels", "Panels", indoor, { image: panItem.image, fit: "contain", layout: panelLayout, sort: 2 });
  mk("downlights", "Downlights", indoor, { image: dlItem.image, sort: 3 });
  const bulk = mk("bulkhead", "Bulkhead", outdoor, { image: categories.outdoor.items[0].image, sort: 1 });

  const iconKey = (url) => Object.entries(icons).find(([, v]) => v === url)?.[0] || "";
  const add = (catId, catKey, card, sort) => {
    const slug = card.to.split("/").pop();
    const p = getProduct(catKey, slug);
    run(
      `INSERT INTO products(category_id,slug,title,images,image_fit,description,specs,badges,certified,tech,codes,notes,layout_id,sort,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      catId, slug, p.title, JSON.stringify(p.images), card.contain ? "contain" : "cover", p.description,
      JSON.stringify(p.specs || []), JSON.stringify((p.badges || []).map((b) => ({ icon: iconKey(b.icon), label: b.label }))),
      p.certified ? 1 : 0, JSON.stringify(p.tech || null), JSON.stringify(p.codes || []), JSON.stringify(p.notes || []),
      null, sort, now, now
    );
  };
  categories.cylinders.items.forEach((c, i) => add(cyl, "cylinders", c, i));
  categories.panels.items.forEach((c, i) => add(pan, "panels", c, i));
  add(bulk, "outdoor", categories.outdoor.items[0], 0);
}
