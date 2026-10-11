import { all, get, getSetting } from "./db.js";

const DEFAULTS = { images: [], specs: [], badges: [], tech: null, codes: [], notes: [], files: [], options: {}, permissions: [] };
export function inflate(row, ...cols) {
  if (!row) return row;
  for (const c of cols) {
    try { row[c] = JSON.parse(row[c]); } catch { row[c] = DEFAULTS[c]; }
    if (row[c] == null) row[c] = DEFAULTS[c];
  }
  return row;
}
export const product = (row) => (row ? inflate(row, "images", "specs", "badges", "tech", "codes", "notes", "files") : row);
export const layoutRow = (row) => inflate(row, "options");

// root → leaf
export function catChain(id) {
  const chain = [];
  let cur = id ? get("SELECT * FROM categories WHERE id=?", id) : null;
  while (cur && chain.length < 12) {
    chain.unshift(cur);
    cur = cur.parent_id ? get("SELECT * FROM categories WHERE id=?", cur.parent_id) : null;
  }
  return chain;
}
export function descendantIds(id) {
  const out = [id];
  for (const c of all("SELECT id FROM categories WHERE parent_id=?", id)) out.push(...descendantIds(c.id));
  return out;
}

// Product → Category (and its parents) → Global default
export function resolveLayout(p) {
  if (p.layout_id) {
    const l = get("SELECT * FROM layouts WHERE id=?", p.layout_id);
    if (l) return { ...layoutRow(l), source: "product" };
  }
  const chain = catChain(p.category_id).reverse();
  for (const c of chain) {
    if (!c.layout_id) continue;
    const l = get("SELECT * FROM layouts WHERE id=?", c.layout_id);
    if (l) return { ...layoutRow(l), source: "category", source_title: c.title };
  }
  const l = get("SELECT * FROM layouts WHERE id=?", getSetting("default_layout_id")) || get("SELECT * FROM layouts ORDER BY id LIMIT 1");
  return { ...layoutRow(l), source: "default" };
}

export const catUrl = (c) => `/products/${c.slug}`;
export const prodUrl = (p, cat) => `/products/${cat?.slug || "all"}/${p.slug}`;

export function breadcrumb(categoryId) {
  return [{ title: "Products", to: "/products" }, ...catChain(categoryId).map((c) => ({ title: c.title, to: catUrl(c) }))];
}

export function slugify(s) {
  return String(s || "").toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "item";
}
// الـ slug لازم يكون فريد عبر الكاتيجوري والمنتجات (لأن /products/:slug بيخدم الاتنين)
export function uniqueSlug(table, base, selfId = 0) {
  const other = table === "categories" ? "products" : "categories";
  let slug = slugify(base), n = 1;
  const taken = (s) => get(`SELECT id FROM ${table} WHERE slug=? AND id<>?`, s, selfId) || get(`SELECT id FROM ${other} WHERE slug=?`, s);
  while (taken(slug)) slug = `${slugify(base)}-${++n}`;
  return slug;
}
