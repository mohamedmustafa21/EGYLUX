import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { useAdmin } from "../ctx";
import { Badge, Btn, Card, CategorySelect, Check, ErrorBox, Field, I, IconBtn, ImageInput, ImageList, Input, LayoutThumb, lenTone, PairList, PageHead, Select, Serp, Spinner, Textarea, Toggle } from "../ui";
import { normalizeTech } from "../../lib/tech";
import TechEditor from "./TechEditor";
import PreviewTab from "./PreviewTab";

function DatasheetFill({ url, onApply }) {
  const [st, setSt] = useState(null);
  const isLocalPdf = /^\/uploads\/[^/]+\.pdf$/i.test(url || "");
  const go = async () => {
    setSt({ busy: true });
    try {
      const d = await api("/admin/datasheet/parse", { method: "POST", body: { url } });
      onApply(d.tab);
      setSt({ ok: true, found: d.found, missing: d.missing });
    } catch (e) { setSt({ error: e.message }); }
  };
  if (!isLocalPdf) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <Btn sm onClick={go} disabled={st?.busy}>{st?.busy ? "Reading the PDF…" : "Fill the code table from this datasheet"}</Btn>
      {st?.ok && <div className="note" style={{ marginTop: 8 }}>Filled: {st.found.join(", ")}.{st.missing.length > 0 && <> Not found: {st.missing.join(", ")}.</>} Review it in “Specs &amp; technical”, then Save.</div>}
      {st?.error && <div className="note warn" style={{ marginTop: 8 }}>{st.error}</div>}
    </div>
  );
}

const BLANK = { title: "", slug: "", category_id: null, description: "", images: [], image_fit: "cover", specs: [], badges: [], certified: false, tech: null, codes: [], notes: [], files: [], datasheet: "", layout_id: null, published: true, seo_title: "", seo_desc: "", seo_image: "", noindex: false, sort: 0 };
const BADGE_ICONS = [["", "No icon"], ["ip", "IP"], ["ik", "IK"], ["cri", "CRI"], ["time", "Lifetime"]];

export default function ProductEdit() {
  const { id } = useParams(); const isNew = id === "new";
  const nav = useNavigate(); const { can, toast, confirm } = useAdmin();
  const readOnly = !can("products.edit");
  const { data: cats } = useApi("/admin/categories");
  const { data: lay } = useApi("/admin/layouts");
  const { data, error, loading } = useApi(isNew ? null : `/admin/products/${id}`);
  const { data: seoG } = useApi(can("seo.manage") ? "/admin/seo" : null);
  const [p, setP] = useState(isNew ? BLANK : null);
  const [orig, setOrig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("general");
  useEffect(() => { if (data) { const x = { ...BLANK, ...data, tech: normalizeTech(data.tech) }; setP(x); setOrig(JSON.stringify(x)); } }, [data]);
  useEffect(() => { if (isNew) setOrig(JSON.stringify(BLANK)); }, [isNew]);
  const dirty = p && orig && JSON.stringify(p) !== orig;
  useEffect(() => { const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);

  const set = (k) => (v) => setP((x) => ({ ...x, [k]: v }));
  // استيراد من Excel: بيملا الاسم والـ Brief لو فاضيين، وبيضيف/يستبدل التاب، ومتغيّرش حاجة إنت كاتبها
  const applyImport = (r) => setP((x) => {
    const has = x.tech?.tabs?.some((t) => t.label === r.tab.label);
    const tabs = x.tech?.tabs ? (has ? x.tech.tabs.map((t) => (t.label === r.tab.label ? r.tab : t)) : [r.tab, ...x.tech.tabs]) : [r.tab];
    const specKeys = new Set((x.specs || []).map(([k]) => k.toLowerCase()));
    return {
      ...x,
      title: x.title || r.title || "",
      description: x.description || r.brief || "",
      specs: [...(x.specs || []), ...r.specs.filter(([k]) => !specKeys.has(k.toLowerCase()))],
      notes: x.notes?.length ? x.notes : r.notes,
      tech: { showScale: x.tech?.showScale ?? true, tabs },
    };
  });
  const catChain = useMemo(() => { const out = []; let c = cats?.find((x) => x.id === p?.category_id); while (c) { out.unshift(c); c = cats.find((x) => x.id === c.parent_id); } return out; }, [cats, p?.category_id]);
  const inherited = useMemo(() => {
    if (!lay) return null;
    for (const c of [...catChain].reverse()) if (c.layout_id) return { l: lay.items.find((x) => x.id === c.layout_id), from: `category “${c.title}”` };
    return { l: lay.items.find((x) => x.id === lay.default_id), from: "the site default" };
  }, [catChain, lay]);

  const leafCat = catChain[catChain.length - 1];
  const { data: sib } = useApi(tab === "preview" && leafCat ? `/admin/products?category_id=${leafCat.id}&limit=8` : null);
  const previewProduct = useMemo(() => p, [p]);
  const previewCrumb = useMemo(() => [{ title: "Products", to: "/products" }, ...catChain.map((c) => ({ title: c.title, to: `/products/${c.slug}` }))], [catChain]);
  const previewLayout = useMemo(() => {
    const l = p?.layout_id ? lay?.items.find((x) => x.id === p.layout_id) : inherited?.l;
    return l ? { base: l.base, options: l.options } : { base: "standard", options: {} };
  }, [p?.layout_id, lay, inherited]);
  const previewRelated = useMemo(() => (sib?.items || []).filter((x) => x.slug !== p?.slug && x.published).slice(0, 12).map((x) => ({ title: x.title, image: x.image, to: `/products/${leafCat?.slug}/${x.slug}` })), [sib, p?.slug, leafCat]);

  if (!isNew && loading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  if (!p) return <Spinner />;

  const save = async (publish) => {
    if (!p.title.trim()) { setTab("general"); return toast("Please enter a product title", "err"); }
    if (!p.category_id) { setTab("general"); return toast("Please choose a category", "err"); }
    setSaving(true);
    const body = { ...p, published: publish ?? p.published };
    try {
      const r = await api(isNew ? "/admin/products" : `/admin/products/${id}`, { method: isNew ? "POST" : "PUT", body });
      toast("Saved", "ok"); setOrig(JSON.stringify({ ...p, published: body.published })); setP({ ...p, published: body.published });
      if (isNew) nav(`/admin/products/${r.id}`, { replace: true });
    } catch (e) { toast(e.message, "err"); }
    setSaving(false);
  };
  const del = async () => { if (await confirm({ title: "Delete product", message: `Delete “${p.title}” permanently?`, danger: true, confirmText: "Delete" })) { await api(`/admin/products/${id}`, { method: "DELETE" }); toast("Deleted", "ok"); nav("/admin/products"); } };

  const slug = p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const leaf = catChain[catChain.length - 1];
  const base = (seoG?.global.site_url || location.origin).replace(/\/$/, "");
  const url = `${base}/products/${leaf?.slug || "…"}/${slug || "…"}`;
  const template = (seoG?.global.title_template || "%s | EGYLUX");
  const autoTitle = template.replace("%s", p.title || "Product");
  const autoDesc = (p.description || "").replace(/\s+/g, " ").slice(0, 158);

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}><Link to="/admin/products" className="muted small">← Products</Link></div>
      <PageHead title={isNew ? "New product" : p.title || "Product"} sub={!isNew && <span className="row awrap" style={{ display: "flex" }}>{p.published ? <Badge tone="ok">Published</Badge> : <Badge>Draft</Badge>}{data && <span className="muted small">{data.views_30d} views (30 d) · {data.submissions} quote request(s)</span>}</span>}>
        {!isNew && <a className="btn" href={`/products/${leaf?.slug || "all"}/${p.slug}`} target="_blank" rel="noreferrer"><I n="ext" /> View</a>}
        {!isNew && can("products.delete") && <Btn variant="danger" icon="trash" onClick={del}>Delete</Btn>}
        {!readOnly && <>
          {!p.published && <Btn loading={saving} onClick={() => save(false)}>Save draft</Btn>}
          <Btn variant="primary" loading={saving} onClick={() => save(true)}>{p.published ? (dirty ? "Save changes" : "Saved") : "Publish"}</Btn>
        </>}
      </PageHead>
      {dirty && <div className="note warn" style={{ marginBottom: 14 }}>You have unsaved changes.</div>}
      <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="atabs">{[["general", "General"], ["media", "Images & files"], ["specs", "Specs & technical"], ["layout", "Layout"], ["preview", "Preview"], ["seo", "SEO"]].map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>

        {tab === "general" && (
          <div className="grid g-main">
            <div className="stack">
              <Card title="Basics">
                <Field label="Title *"><Input value={p.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. Panel Slim 60×60" /></Field>
                <Field label="Description" hint="Shown under the title on the product page"><Textarea rows={6} value={p.description} onChange={(e) => set("description")(e.target.value)} /></Field>
                <Field label="URL slug" hint="Leave empty to generate automatically"><Input mono value={p.slug} onChange={(e) => set("slug")(e.target.value)} placeholder={slug || "auto"} /></Field>
              </Card>
              <Card title="Badges" actions={<Check checked={p.certified} onChange={set("certified")}>Show “Certified” (UL / CE)</Check>}>
                <p className="muted small" style={{ marginTop: 0 }}>Small chips shown beside the title, e.g. “IP 65”, “CRI 80”, “50,000 Hrs” .</p>
                {p.badges.map((b, i) => (
                  <div className="kv three" key={i}>
                    <Select sm value={b.icon} onChange={(e) => set("badges")(p.badges.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))}>{BADGE_ICONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                    <Input sm value={b.label} placeholder="Label, e.g. IP 65" onChange={(e) => set("badges")(p.badges.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <IconBtn n="x" danger title="Remove" onClick={() => set("badges")(p.badges.filter((_, j) => j !== i))} />
                  </div>))}
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <Btn sm icon="plus" onClick={() => set("badges")([...p.badges, { icon: "", label: "" }])}>Add badge</Btn>
                  {[["ip", "IP 65"], ["ik", "IK 08"], ["cri", "CRI 80"], ["time", "50,000 Hrs"]].filter(([, l]) => !p.badges.some((b) => b.label === l)).map(([icon, label]) => <Btn key={label} sm onClick={() => set("badges")([...p.badges, { icon, label }])}>+ {label}</Btn>)}
                </div>
              </Card>
            </div>
            <div className="stack">
              <Card title="Publish">
                <Toggle checked={p.published} onChange={set("published")} label={p.published ? "Published — visible on the site" : "Draft — hidden from the site"} />
              </Card>
              <Card title="Category">
                <Field label="Category *"><CategorySelect cats={cats} value={p.category_id} onChange={set("category_id")} /></Field>
                <Field label="Order" hint="Lower number shows first"><Input type="number" value={p.sort} onChange={(e) => set("sort")(e.target.value)} /></Field>
                <Field label="Card image fit"><Select value={p.image_fit} onChange={(e) => set("image_fit")(e.target.value)}><option value="cover">Fill (crop)</option><option value="contain">Fit inside (no crop)</option></Select></Field>
              </Card>
            </div>
          </div>
        )}

        {tab === "media" && (
          <div className="stack">
            <Card title="Product images" actions={<span className="muted small">The page first shows all images together, then each one · use ↑ ↓ to reorder</span>}><ImageList value={p.images} onChange={set("images")} /></Card>
            <Card title="Datasheet (PDF)" actions={<span className="muted small">The customer gets a “Download Datasheet” button that downloads this file directly</span>}>
              <Field label="Datasheet file"><ImageInput kind="file" value={p.datasheet} onChange={set("datasheet")} placeholder="Upload the datasheet PDF or paste a link" /></Field>
              <DatasheetFill url={p.datasheet} onApply={(tab) => applyImport({ tab, title: "", brief: "", specs: [], notes: [] })} />
              {p.datasheet && !/\.pdf(\?|#|$)/i.test(p.datasheet) && <p className="muted small" style={{ margin: "6px 0 0" }}>This doesn’t look like a PDF — check the file.</p>}
            </Card>
            <Card title="Download Files (optional)" actions={<span className="muted small">IES files, drawings, extra PDFs… shown in the “Download Files” menu</span>}>
              {p.files.map((f, i) => (
                <div className="list-item" key={i}>
                  <IconBtn n="x" danger title="Remove" className="rm" onClick={() => set("files")(p.files.filter((_, j) => j !== i))} />
                  <Field label="Label"><Input sm value={f.label} placeholder="e.g. Download Datasheet" onChange={(e) => set("files")(p.files.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} /></Field>
                  <Field label="File"><ImageInput kind="file" value={f.url} onChange={(u) => set("files")(p.files.map((x, j) => (j === i ? { ...x, url: u } : x)))} placeholder="Upload a file or paste a link" /></Field>
                </div>))}
              <Btn sm icon="plus" onClick={() => set("files")([...p.files, { label: "", url: "" }])}>Add file</Btn>
            </Card>
          </div>
        )}

        {tab === "specs" && <SpecsTab p={p} set={set} onImport={applyImport} />}

        {tab === "layout" && (
          <Card title="Page layout for this product">
            <div className="note" style={{ marginBottom: 16 }}>Order of priority: <b>this product</b> → its category (and parents) → <b>site default</b>. Currently inheriting <b>{inherited?.l?.name}</b> from {inherited?.from}.</div>
            <div className="grid g3">
              <LayoutOption on={!p.layout_id} onClick={() => set("layout_id")(null)} title="Inherit" sub={`${inherited?.l?.name} (${inherited?.from})`} thumb={inherited?.l && <LayoutThumb base={inherited.l.base} o={inherited.l.options} />} />
              {(lay?.items || []).map((l) => <LayoutOption key={l.id} on={p.layout_id === l.id} onClick={() => set("layout_id")(l.id)} title={l.name} sub={l.description} thumb={<LayoutThumb base={l.base} o={l.options} />} />)}
            </div>
            {can("layouts.manage") && <p className="small muted" style={{ margin: "16px 0 0" }}>Need a different design? <Link to="/admin/templates" style={{ color: "var(--info)" }}>Create a layout template</Link>.</p>}
          </Card>
        )}

        {tab === "preview" && <PreviewTab product={previewProduct} breadcrumb={previewCrumb} layout={previewLayout} related={previewRelated} />}

        {tab === "seo" && (
          <div className="grid g-main">
            <Card title="Search engine listing">
              <Field label="SEO title" right={`${(p.seo_title || "").length}/60`}><Input value={p.seo_title} placeholder={autoTitle} onChange={(e) => set("seo_title")(e.target.value)} /></Field>
              <Field label="Meta description" right={`${(p.seo_desc || "").length}/160`}><Textarea rows={3} value={p.seo_desc} placeholder={autoDesc || "Auto-generated from the description"} onChange={(e) => set("seo_desc")(e.target.value)} /></Field>
              <Field label="Social share image" hint="1200×630 recommended. Defaults to the first product image."><ImageInput value={p.seo_image} onChange={set("seo_image")} /></Field>
              <Toggle checked={p.noindex} onChange={set("noindex")} label="Hide from search engines (noindex)" />
            </Card>
            <div className="stack"><Card title="Google preview"><Serp title={(p.seo_title || autoTitle).slice(0, 70)} desc={(p.seo_desc || autoDesc).slice(0, 165)} url={url} /></Card>
              <div className="note">Structured data (Product + Breadcrumbs), canonical URL and Open Graph tags are added automatically.</div></div>
          </div>
        )}
      </fieldset>
    </>
  );
}

function LayoutOption({ on, onClick, title, sub, thumb }) {
  return <button type="button" onClick={onClick} className="layout-card" style={{ cursor: "pointer", textAlign: "left", font: "inherit", ...(on ? { borderColor: "var(--brand)", boxShadow: "0 0 0 3px rgba(210,202,19,.3)" } : {}) }}><div className="pv">{thumb}</div><div className="bd"><b>{title}</b> {on && <Badge tone="brand">Selected</Badge>}<div className="muted small">{sub}</div></div></button>;
}

function SpecsTab({ p, set, onImport }) {
  return (
    <div className="stack">
      <Card title="Specifications" actions={<span className="muted small">The “Specifications” box beside the gallery</span>}><PairList value={p.specs} onChange={set("specs")} kPh="e.g. Mounting type" vPh="e.g. Wall Mounted" /></Card>
      <Card title="Technical specs" actions={<span className="muted small">Color scale + code builder table</span>}>
        <TechEditor value={p.tech} onChange={set("tech")} onImport={onImport} />
      </Card>
      <Card title="Product codes" actions={<span className="muted small">Shown inside the “Specifications” box and used to pre-fill the quote form</span>}><PairList value={p.codes} onChange={set("codes")} kPh="e.g. Product Code" vPh="e.g. PNLF***-E1A12" /></Card>
      <Card title="Notes" actions={<span className="muted small">One row per line · separate items with “|”</span>}>
        <Textarea rows={4} value={(p.notes || []).map((r) => r.join(" | ")).join("\n")} onChange={(e) => set("notes")(e.target.value.split("\n").map((l) => l.split("|").map((x) => x.trim()).filter(Boolean)).filter((r) => r.length))} placeholder={"RG = Gold Reflector | RW = White Reflector\n1 = White Housing | 2 = Black Housing"} />
      </Card>
    </div>
  );
}
