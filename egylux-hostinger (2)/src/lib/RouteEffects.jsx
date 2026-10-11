import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { api } from "./api";

function sid() {
  try {
    let s = localStorage.getItem("egx_sid");
    if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("egx_sid", s); }
    return s;
  } catch { return ""; }
}

function applyMeta(m) {
  document.title = m.title;
  document.head.querySelectorAll("[data-seo]").forEach((n) => n.remove());
  const add = (tag, attrs) => { const el = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); el.setAttribute("data-seo", ""); document.head.appendChild(el); return el; };
  const meta = (k, v, c) => c && add("meta", { [k]: v, content: c });
  meta("name", "description", m.description);
  if (m.noindex) meta("name", "robots", "noindex,nofollow");
  if (m.canonical) add("link", { rel: "canonical", href: m.canonical });
  meta("property", "og:type", m.type === "product" ? "product" : "website");
  meta("property", "og:site_name", m.site_name);
  meta("property", "og:title", m.title);
  meta("property", "og:description", m.description);
  meta("property", "og:url", m.canonical);
  meta("property", "og:image", m.image);
  meta("name", "twitter:card", m.image ? "summary_large_image" : "summary");
  (m.jsonld || []).forEach((j) => { const s = add("script", { type: "application/ld+json" }); s.textContent = JSON.stringify(j); });
}

let first = true;
// بيتحط مرة واحدة في App: تتبع الزيارات + تحديث الـ SEO tags عند كل تنقل
export default function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/__preview")) return;
    // 1) تتبع الزيارة (بدون كوكيز، بدون IP)
    try {
      const body = JSON.stringify({ path: pathname, ref: first ? document.referrer : "", sid: sid() });
      first = false;
      navigator.sendBeacon?.("/api/public/track", new Blob([body], { type: "application/json" })) ||
        fetch("/api/public/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    } catch {}
    // 2) SEO
    let alive = true;
    api(`/public/meta?path=${encodeURIComponent(pathname)}`).then((m) => alive && applyMeta(m)).catch(() => {});
    return () => { alive = false; };
  }, [pathname]);
  return null;
}
