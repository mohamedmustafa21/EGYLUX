import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "./admin.css";
import { api } from "../lib/api";
import { AdminCtx } from "./ctx";
import { Btn, I, IconBtn, Modal, Spinner } from "./ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Submissions from "./pages/Submissions";
import Products from "./pages/Products";
import ProductEdit from "./pages/ProductEdit";
import Categories from "./pages/Categories";
import Templates from "./pages/Templates";
import Content from "./pages/Content";
import Media from "./pages/Media";
import Analytics from "./pages/Analytics";
import Seo from "./pages/Seo";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Account from "./pages/Account";

const NAV = [
  ["Overview", [["/admin", "Dashboard", "grid", "dashboard.view", true], ["/admin/submissions", "Submissions", "inbox", "submissions.view"], ["/admin/analytics", "Analytics", "chart", "analytics.view"]]],
  ["Catalog", [["/admin/products", "Products", "box", "products.view"], ["/admin/categories", "Categories", "folder", "categories.manage"], ["/admin/templates", "Layout templates", "layout", "layouts.manage"]]],
  ["Website", [["/admin/content", "Page content", "file", "content.edit"], ["/admin/media", "Media library", "image", "media.manage"], ["/admin/seo", "SEO", "globe", "seo.manage"]]],
  ["Administration", [["/admin/users", "Users & roles", "users", "users.manage", false, "roles.manage"], ["/admin/settings", "Settings & email", "sliders", "settings.manage"]]],
];
const TITLES = { submissions: "Submissions", analytics: "Analytics", products: "Products", categories: "Categories", templates: "Layout templates", content: "Page content", media: "Media library", seo: "SEO", users: "Users & roles", settings: "Settings", account: "My account" };

export default function AdminApp() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [meta, setMeta] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [dlg, setDlg] = useState(null);
  const [badge, setBadge] = useState(0);
  const [menu, setMenu] = useState(false);
  const loc = useLocation(); const nav = useNavigate();
  const lastBadge = useRef(null);

  const toast = useCallback((msg, tone = "") => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "err" ? 6000 : 3200);
  }, []);
  const confirm = useCallback((o) => new Promise((resolve) => setDlg({ ...o, resolve })), []);

  useEffect(() => { api("/auth/me").then((d) => setUser(d.user)).catch(() => setUser(null)); }, []);
  useEffect(() => { if (user) api("/admin/meta").then(setMeta).catch(() => {}); }, [user]);

  // إشعار داخل الداش بورد لما يوصل submission جديد
  useEffect(() => {
    if (!user) return;
    const poll = () => api("/admin/badges").then(({ newSubmissions: n }) => {
      if (lastBadge.current !== null && n > lastBadge.current) toast(`${n - lastBadge.current} new submission${n - lastBadge.current > 1 ? "s" : ""} received`, "ok");
      lastBadge.current = n; setBadge(n);
    }).catch(() => {});
    poll(); const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, [user, toast]);
  useEffect(() => { document.title = (badge ? `(${badge}) ` : "") + (TITLES[loc.pathname.split("/")[2]] || "Dashboard") + " · EGYLUX Admin"; }, [loc.pathname, badge]);
  useEffect(() => setMenu(false), [loc.pathname]);

  const can = useCallback((p) => !!user && (user.perms.includes("*") || user.perms.includes(p)), [user]);
  const ctx = useMemo(() => ({ user, can, toast, confirm, meta, refreshBadge: () => api("/admin/badges").then((d) => { lastBadge.current = d.newSubmissions; setBadge(d.newSubmissions); }).catch(() => {}), setUser }), [user, can, toast, confirm, meta]);

  if (user === undefined) return <div className="adm"><Spinner /></div>;

  const logout = async () => { await api("/auth/logout", { method: "POST" }).catch(() => {}); setUser(null); nav("/admin/login"); };

  if (!user) {
    return (
      <AdminCtx.Provider value={ctx}>
        <div className="adm">
          <Routes><Route path="*" element={<Login onLogin={(u) => { setUser(u); nav(loc.pathname === "/admin/login" ? "/admin" : loc.pathname); }} />} /></Routes>
          <Toasts list={toasts} />
        </div>
      </AdminCtx.Provider>
    );
  }
  if (loc.pathname === "/admin/login") return <Navigate to="/admin" replace />;

  const first = NAV.flatMap(([, items]) => items).find((i) => can(i[3]) || (i[5] && can(i[5])));
  return (
    <AdminCtx.Provider value={ctx}>
      <div className="adm">
        <div className="adm-shell">
          <aside className={`adm-side ${menu ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && setMenu(false)}>
            <div className="adm-brand"><i>E</i> EGYLUX</div>
            <nav className="adm-nav" aria-label="Dashboard">
              {NAV.map(([group, items]) => {
                const vis = items.filter((i) => can(i[3]) || (i[5] && can(i[5])));
                return vis.length ? <div key={group}><h6>{group}</h6>{vis.map(([to, label, icon, , end]) => (
                  <NavLink key={to} to={to} end={!!end || to === "/admin"} className={({ isActive }) => (isActive ? "on" : "")}><I n={icon} />{label}{to.endsWith("submissions") && badge > 0 && <span className="n">{badge}</span>}</NavLink>
                ))}</div> : null;
              })}
            </nav>
            <div className="adm-user">
              <Link to="/admin/account" className="av" title="My account">{user.name.slice(0, 1).toUpperCase()}</Link>
              <div style={{ minWidth: 0 }}><b>{user.name}</b><small>{user.role}</small></div>
              <IconBtn n="logout" title="Sign out" onClick={logout} />
            </div>
          </aside>
          <div className="adm-main">
            <header className="adm-top">
              <IconBtn n="menu" title="Menu" className="burger" onClick={() => setMenu(true)} />
              <span className="grow" />
              <a className="btn sm" href="/" target="_blank" rel="noreferrer"><I n="ext" /> View site</a>
              {can("submissions.view") && (
                <Link to="/admin/submissions?status=new" className="ico-btn" title={`${badge} new submissions`} style={{ position: "relative" }}>
                  <I n="bell" />{badge > 0 && <span style={{ position: "absolute", top: 2, right: 0, background: "#e5484d", color: "#fff", borderRadius: 99, fontSize: 10, padding: "0 5px", fontWeight: 700 }}>{badge}</span>}
                </Link>
              )}
            </header>
            <main className="adm-page">
              <Routes>
                <Route path="/admin" element={can("dashboard.view") ? <Dashboard /> : <Navigate to={first?.[0] || "/admin/account"} replace />} />
                <Route path="/admin/submissions" element={<Gate p="submissions.view"><Submissions /></Gate>} />
                <Route path="/admin/products" element={<Gate p="products.view"><Products /></Gate>} />
                <Route path="/admin/products/:id" element={<Gate p="products.view"><ProductEdit /></Gate>} />
                <Route path="/admin/categories" element={<Gate p="categories.manage"><Categories /></Gate>} />
                <Route path="/admin/templates" element={<Gate p="layouts.manage"><Templates /></Gate>} />
                <Route path="/admin/content" element={<Gate p="content.edit"><Content /></Gate>} />
                <Route path="/admin/media" element={<Gate p="media.manage"><Media /></Gate>} />
                <Route path="/admin/analytics" element={<Gate p="analytics.view"><Analytics /></Gate>} />
                <Route path="/admin/seo" element={<Gate p="seo.manage"><Seo /></Gate>} />
                <Route path="/admin/users" element={<Gate p={["users.manage", "roles.manage"]}><Users /></Gate>} />
                <Route path="/admin/settings" element={<Gate p="settings.manage"><Settings /></Gate>} />
                <Route path="/admin/account" element={<Account />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </main>
          </div>
        </div>
        <Toasts list={toasts} />
        {dlg && (
          <Modal title={dlg.title || "Are you sure?"} onClose={() => { dlg.resolve(false); setDlg(null); }}
            footer={<><Btn onClick={() => { dlg.resolve(false); setDlg(null); }}>Cancel</Btn><Btn variant={dlg.danger ? "dark" : "primary"} style={dlg.danger ? { background: "#b3261e", borderColor: "#b3261e" } : undefined} onClick={() => { dlg.resolve(true); setDlg(null); }}>{dlg.confirmText || "Confirm"}</Btn></>}>
            <p style={{ margin: 0 }}>{dlg.message}</p>
          </Modal>
        )}
      </div>
    </AdminCtx.Provider>
  );
}

function Gate({ p, children }) {
  const { can } = useAdminLite();
  const ok = [].concat(p).some(can);
  return ok ? children : <div className="note warn">You don't have permission to view this page. Ask a Super Admin to update your role.</div>;
}
import { useAdmin as useAdminLite } from "./ctx";

function Toasts({ list }) {
  return <div className="toasts" role="status" aria-live="polite">{list.map((t) => <div key={t.id} className={`toast ${t.tone}`}>{t.tone === "ok" && <I n="check" />}{t.msg}</div>)}</div>;
}
