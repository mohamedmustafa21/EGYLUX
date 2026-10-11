import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { useAdmin } from "../ctx";
import { Badge, Btn, Card, ErrorBox, Field, I, ImageInput, Input, PageHead, Serp, Spinner, Tabs, Textarea, Toggle } from "../ui";

export default function Seo() {
  const [sp, setSp] = useSearchParams(); const tab = sp.get("tab") || "audit";
  return (
    <>
      <PageHead title="SEO" sub="Control how your site appears in Google and when shared on social media." />
      <Tabs value={tab} onChange={(t) => setSp({ tab: t })} items={[{ id: "audit", label: "Audit" }, { id: "global", label: "Global settings" }, { id: "pages", label: "Pages" }]} />
      {tab === "audit" ? <Audit /> : <Settings tab={tab} />}
    </>
  );
}

function Audit() {
  const { data, error, loading, reload } = useApi("/admin/seo/audit");
  const [filter, setFilter] = useState("issues");
  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} retry={reload} />;
  const rows = data.items.filter((i) => filter === "all" || i.issues.some((x) => x.level !== "info")).sort((a, b) => a.score - b.score);
  const tone = (s) => (s >= 85 ? "ok" : s >= 65 ? "warn" : "err");
  return (
    <>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="acard stat"><div className="k">SEO score</div><div className="v" style={{ color: `var(--${tone(data.score)})` }}>{data.score}<span className="muted" style={{ fontSize: 15 }}>/100</span></div><span className="muted small">{data.items.length} pages checked</span></div>
        <div className="acard stat"><div className="k">Errors</div><div className="v" style={{ color: "var(--err)" }}>{data.counts.error}</div></div>
        <div className="acard stat"><div className="k">Warnings</div><div className="v" style={{ color: "var(--warn)" }}>{data.counts.warn}</div></div>
        <div className="acard stat"><div className="k">Tools</div><div className="small" style={{ marginTop: 8, display: "grid", gap: 4 }}><a href="/sitemap.xml" target="_blank" rel="noreferrer" style={{ color: "var(--info)" }}>sitemap.xml ↗</a><a href="/robots.txt" target="_blank" rel="noreferrer" style={{ color: "var(--info)" }}>robots.txt ↗</a></div></div>
      </div>
      <Card flush title="Pages" actions={<div className="row"><Btn sm variant={filter === "issues" ? "dark" : ""} onClick={() => setFilter("issues")}>With issues</Btn><Btn sm variant={filter === "all" ? "dark" : ""} onClick={() => setFilter("all")}>All</Btn></div>}>
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Page</th><th>Score</th><th>Issues</th><th /></tr></thead><tbody>
          {!rows.length && <tr><td colSpan={4}><div className="aempty"><b>Looking good 🎉</b>No SEO problems found.</div></td></tr>}
          {rows.map((r) => (
            <tr key={r.type + r.id}>
              <td style={{ maxWidth: 320 }}><div className="row"><Badge>{r.type}</Badge><span className="b clip">{r.label}</span></div><div className="muted small clip">{r.title}</div></td>
              <td><Badge tone={tone(r.score)}>{r.score}</Badge></td>
              <td>{r.issues.map((i, k) => <div key={k} className="small" style={{ color: i.level === "error" ? "var(--err)" : i.level === "warn" ? "var(--warn)" : "var(--muted)" }}>{i.level === "error" ? "✕" : i.level === "warn" ? "!" : "i"} {i.msg}</div>)}{!r.issues.length && <span className="muted small">All good</span>}</td>
              <td style={{ textAlign: "right" }}><Link className="btn sm" to={r.edit}>Fix</Link></td>
            </tr>))}
        </tbody></table></div>
      </Card>
    </>
  );
}

function Settings({ tab }) {
  const { toast } = useAdmin();
  const { data, error, loading } = useApi("/admin/seo");
  const [g, setG] = useState(null); const [pages, setPages] = useState({}); const [busy, setBusy] = useState(false); const [orig, setOrig] = useState("");
  useEffect(() => { if (data) { setG(data.global); setPages(data.pages); setOrig(JSON.stringify([data.global, data.pages])); } }, [data]);
  if (loading || !g) return error ? <ErrorBox error={error} /> : <Spinner />;
  const dirty = JSON.stringify([g, pages]) !== orig;
  const save = async () => { setBusy(true); try { await api("/admin/seo", { method: "PUT", body: { global: g, pages } }); setOrig(JSON.stringify([g, pages])); toast("SEO settings saved", "ok"); } catch (e) { toast(e.message, "err"); } setBusy(false); };
  const sg = (k) => (e) => setG({ ...g, [k]: e.target.value });
  const sp = (p, k, v) => setPages({ ...pages, [p]: { ...(pages[p] || {}), [k]: v } });
  const base = (g.site_url || location.origin).replace(/\/$/, "");
  return (
    <>
      <div className="row" style={{ justifyContent: "flex-end", marginBottom: 14 }}><Btn variant="primary" loading={busy} disabled={!dirty} onClick={save}>{dirty ? "Save changes" : "Saved"}</Btn></div>
      {tab === "global" ? (
        <div className="grid g2">
          <Card title="Site identity">
            <Field label="Site name"><Input value={g.site_name} onChange={sg("site_name")} /></Field>
            <Field label="Site URL" hint="Used for canonical links & sitemap"><Input value={g.site_url} onChange={sg("site_url")} placeholder="https://www.egylux.com" /></Field>
            <Field label="Title template" hint="%s = page title"><Input value={g.title_template} onChange={sg("title_template")} /></Field>
            <Field label="Home page title"><Input value={g.home_title} onChange={sg("home_title")} /></Field>
            <Field label="Default meta description" right={`${g.default_description.length}/160`}><Textarea rows={3} value={g.default_description} onChange={sg("default_description")} /></Field>
            <Field label="Default share image" hint="Used when a page has none"><ImageInput value={g.default_og_image} onChange={(v) => setG({ ...g, default_og_image: v })} /></Field>
          </Card>
          <Card title="Integrations & crawling">
            <Field label="Google Analytics ID" hint="e.g. G-XXXXXXXXXX"><Input value={g.ga_id} onChange={sg("ga_id")} placeholder="G-XXXXXXXXXX" /></Field>
            <Field label="Google Search Console verification" hint="Content of the meta tag"><Input value={g.google_verification} onChange={sg("google_verification")} /></Field>
            <Field label="Twitter / X handle"><Input value={g.twitter_handle} onChange={sg("twitter_handle")} placeholder="@egylux" /></Field>
            <Field label="Extra robots.txt rules" hint="One per line"><Textarea rows={3} className="textarea" value={g.robots_extra} onChange={sg("robots_extra")} placeholder="Disallow: /private/" /></Field>
            <div className="note">A sitemap is generated automatically at <b>/sitemap.xml</b> from all published products and categories. Submit it in Google Search Console.</div>
          </Card>
        </div>
      ) : (
        <div className="stack">{data.staticPages.map(([p, label]) => { const v = pages[p] || {}; return (
          <Card key={p} title={<>{label} <span className="muted mono" style={{ fontWeight: 400 }}>{p}</span></>}>
            <div className="grid g-main">
              <div>
                <Field label="Title" right={`${(v.title || "").length}/60`}><Input value={v.title || ""} onChange={(e) => sp(p, "title", e.target.value)} placeholder={p === "/" ? g.home_title : g.title_template.replace("%s", label)} /></Field>
                <Field label="Description" right={`${(v.description || "").length}/160`}><Textarea rows={2} value={v.description || ""} onChange={(e) => sp(p, "description", e.target.value)} placeholder={g.default_description} /></Field>
                <div className="row awrap"><div style={{ flex: 1, minWidth: 220 }}><ImageInput value={v.image || ""} onChange={(u) => sp(p, "image", u)} /></div><Toggle checked={v.noindex} onChange={(x) => sp(p, "noindex", x)} label="noindex" /></div>
              </div>
              <Serp title={v.title || (p === "/" ? g.home_title : g.title_template.replace("%s", label))} desc={v.description || g.default_description} url={base + (p === "/" ? "" : p)} />
            </div>
          </Card>); })}</div>
      )}
    </>
  );
}
