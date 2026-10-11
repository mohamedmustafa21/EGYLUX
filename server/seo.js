import { all, get, allSettings } from "./db.js";
import { product as parseProduct, catChain, catUrl } from "./model.js";

export const STATIC_PAGES = [
  ["/", "Home"], ["/about", "About Us"], ["/products", "Products"], ["/projects", "Projects"],
  ["/careers", "Careers"], ["/egylabs", "Egy Labs"], ["/news", "News"], ["/contact", "Contact Us"],
];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cut = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
const abs = (base, u) => (!u ? "" : /^https?:/.test(u) ? u : base + (u.startsWith("/") ? u : "/" + u));

const ctx = (origin) => {
  const S = allSettings();
  return { S, base: (S.site_url || origin || "").replace(/\/$/, "") };
};
const fmt = (S, t) => (t ? String(S.title_template || "%s").replace("%s", t) : S.site_name);

function forProduct(p, c, { S, base }) {
  const chain = catChain(p.category_id);
  const leaf = chain[chain.length - 1];
  const url = `${base}/products/${leaf?.slug || "all"}/${p.slug}`;
  const img = abs(base, p.seo_image || p.images[0] || S.default_og_image);
  const desc = p.seo_desc || cut(p.description, 158) || S.default_description;
  const ld = [
    {
      "@context": "https://schema.org", "@type": "Product", name: p.title, image: p.images.map((i) => abs(base, i)),
      description: cut(p.description, 300), sku: p.codes?.[0]?.[1] || p.slug, brand: { "@type": "Brand", name: S.site_name }, url,
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [{ title: "Products", u: "/products" }, ...chain.map((x) => ({ title: x.title, u: catUrl(x) })), { title: p.title, u: url.replace(base, "") }]
        .map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.title, item: base + x.u })),
    },
  ];
  return { title: p.seo_title || fmt(S, p.title), description: desc, image: img, canonical: url, noindex: !!p.noindex || !p.published, type: "product", jsonld: ld };
}

function forCategory(c, k) {
  const { S, base } = k;
  const url = `${base}${catUrl(c)}`;
  return {
    title: c.seo_title || fmt(S, c.heading || c.title),
    description: c.seo_desc || cut(c.description, 158) || `Browse ${c.title} by EGYLUX. ${S.default_description}`.slice(0, 158),
    image: abs(base, c.seo_image || c.image || S.default_og_image),
    canonical: url, noindex: !!c.noindex || !c.published, type: "website", jsonld: [],
  };
}

function forPage(path, label, k) {
  const { S, base } = k;
  const sp = (S.seo_pages || {})[path] || {};
  const ld = path === "/" ? [{ "@context": "https://schema.org", "@type": "Organization", name: S.site_name, url: base || undefined, logo: abs(base, S.default_og_image) || undefined }] : [];
  return {
    title: sp.title || (path === "/" ? S.home_title : fmt(S, label)),
    description: sp.description || S.default_description,
    image: abs(base, sp.image || S.default_og_image),
    canonical: base + (path === "/" ? "/" : path), noindex: !!sp.noindex, type: "website", jsonld: ld,
  };
}

// يرجع { meta, status } لأي مسار في الموقع
export function buildMeta(pathname, origin = "") {
  const k = ctx(origin);
  const path = ("/" + pathname.replace(/^\/+|\/+$/g, "")).replace(/\/+/g, "/");
  const site = (m, status = 200) => ({ meta: { site_name: k.S.site_name, twitter: k.S.twitter_handle, verification: k.S.google_verification, ga_id: k.S.ga_id, ...m }, status });

  if (path.startsWith("/admin")) return site({ title: "Admin · " + k.S.site_name, description: "", noindex: true, jsonld: [] });

  const page = STATIC_PAGES.find(([p]) => p === path);
  if (page) return site(forPage(page[0], page[1], k));

  if (path.startsWith("/products/")) {
    const slug = path.split("/").filter(Boolean).pop();
    const c = get("SELECT * FROM categories WHERE slug=?", slug);
    if (c) return site(forCategory(c, k), c.published ? 200 : 404);
    const p = get("SELECT * FROM products WHERE slug=?", slug);
    if (p) return site(forProduct(parseProduct(p), null, k), p.published ? 200 : 404);
    return site({ ...forPage("/products", "Products", k), title: fmt(k.S, "Product not found"), noindex: true }, 404);
  }
  if (path.startsWith("/projects/")) return site({ ...forPage("/projects", "Projects", k), canonical: k.base + path });
  return site({ ...forPage("/", "Not found", k), title: fmt(k.S, "Page not found"), noindex: true, canonical: "" }, 404);
}

export function headTags(m) {
  const t = [`<title>${esc(m.title)}</title>`];
  const meta = (a, b, c) => c && t.push(`<meta ${a}="${b}" content="${esc(c)}" data-seo />`);
  meta("name", "description", m.description);
  if (m.noindex) t.push(`<meta name="robots" content="noindex,nofollow" data-seo />`);
  if (m.canonical) t.push(`<link rel="canonical" href="${esc(m.canonical)}" data-seo />`);
  meta("property", "og:type", m.type === "product" ? "product" : "website");
  meta("property", "og:site_name", m.site_name);
  meta("property", "og:title", m.title);
  meta("property", "og:description", m.description);
  meta("property", "og:url", m.canonical);
  meta("property", "og:image", m.image);
  meta("name", "twitter:card", m.image ? "summary_large_image" : "summary");
  meta("name", "twitter:site", m.twitter);
  meta("name", "google-site-verification", m.verification);
  for (const j of m.jsonld || []) t.push(`<script type="application/ld+json" data-seo>${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`);
  if (m.ga_id && /^[\w-]+$/.test(m.ga_id))
    t.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${m.ga_id}"></script>`,
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${m.ga_id}');</script>`);
  return t.join("\n    ");
}

export function injectHead(html, m) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, "").replace("</head>", `  ${headTags(m)}\n  </head>`);
}

export function sitemap(origin) {
  const { S, base } = ctx(origin);
  const urls = [];
  for (const [p] of STATIC_PAGES) if (!(S.seo_pages?.[p]?.noindex)) urls.push([base + (p === "/" ? "/" : p), null, p === "/" ? "1.0" : "0.7"]);
  urls.push([base + "/projects/cairo", null, "0.5"]);
  for (const c of all("SELECT slug,updated_at FROM categories WHERE published=1 AND noindex=0")) urls.push([`${base}/products/${c.slug}`, c.updated_at, "0.8"]);
  for (const p of all("SELECT p.slug,p.updated_at,p.category_id FROM products p WHERE published=1 AND noindex=0")) {
    const leaf = get("SELECT slug FROM categories WHERE id=?", p.category_id);
    urls.push([`${base}/products/${leaf?.slug || "all"}/${p.slug}`, p.updated_at, "0.9"]);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(([loc, mod, pr]) => `  <url><loc>${esc(loc)}</loc>${mod ? `<lastmod>${new Date(mod).toISOString().slice(0, 10)}</lastmod>` : ""}<priority>${pr}</priority></url>`).join("\n")}\n</urlset>`;
}

export function robots(origin) {
  const { S, base } = ctx(origin);
  return ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api/", S.robots_extra || "", `Sitemap: ${base}/sitemap.xml`].filter((x) => x !== "").join("\n") + "\n";
}

// ---------- SEO audit (للداش بورد) ----------
export function audit(origin = "") {
  const k = ctx(origin);
  const items = [];
  const titles = new Map();
  const check = (type, id, label, url, edit, m, raw) => {
    const issues = [];
    const add = (level, msg) => issues.push({ level, msg });
    if (!raw.seoTitle) add("info", "No custom SEO title — using the automatic title");
    if (m.title.length > 60) add("warn", `Title is ${m.title.length} chars (recommended ≤ 60)`);
    if (m.title.length < 15) add("warn", `Title is very short (${m.title.length} chars)`);
    if (!m.description) add("error", "No meta description");
    else {
      if (!raw.seoDesc) add("warn", "No custom meta description — auto-generated from content");
      if (m.description.length < 70) add("warn", `Description is short (${m.description.length} chars, aim for 70–160)`);
      if (m.description.length > 160) add("warn", `Description is long (${m.description.length} chars, aim for ≤ 160)`);
    }
    if (!m.image) add("warn", "No social share image (og:image)");
    if (m.noindex) add("info", "Hidden from search engines (noindex)");
    items.push({ type, id, label, url, edit, title: m.title, description: m.description, noindex: m.noindex, issues });
    const key = m.title.toLowerCase();
    titles.set(key, [...(titles.get(key) || []), items.length - 1]);
  };
  for (const [p, label] of STATIC_PAGES) {
    const sp = k.S.seo_pages?.[p] || {};
    check("page", p, label, p, "/admin/seo?tab=pages", forPage(p, label, k), { seoTitle: sp.title, seoDesc: sp.description });
  }
  for (const c of all("SELECT * FROM categories WHERE published=1")) check("category", c.id, c.title, catUrl(c), `/admin/categories?edit=${c.id}`, forCategory(c, k), { seoTitle: c.seo_title, seoDesc: c.seo_desc });
  for (const r of all("SELECT * FROM products WHERE published=1")) {
    const p = parseProduct(r);
    const leaf = catChain(p.category_id).pop();
    check("product", p.id, p.title, `/products/${leaf?.slug || "all"}/${p.slug}`, `/admin/products/${p.id}`, forProduct(p, null, k), { seoTitle: p.seo_title, seoDesc: p.seo_desc });
  }
  for (const idx of titles.values()) if (idx.length > 1) idx.forEach((i) => items[i].issues.unshift({ level: "error", msg: "Duplicate title used by another page" }));
  const pen = { error: 15, warn: 5, info: 0 };
  for (const it of items) it.score = Math.max(0, 100 - it.issues.reduce((a, i) => a + pen[i.level], 0));
  const counts = { error: 0, warn: 0, info: 0 };
  items.forEach((it) => it.issues.forEach((i) => counts[i.level]++));
  return { score: items.length ? Math.round(items.reduce((a, i) => a + i.score, 0) / items.length) : 100, counts, items };
}
