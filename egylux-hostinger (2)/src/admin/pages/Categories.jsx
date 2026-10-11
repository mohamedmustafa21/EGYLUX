import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { useAdmin } from "../ctx";
import { Badge, Btn, Card, CategorySelect, Empty, ErrorBox, Field, I, IconBtn, ImageInput, Input, Modal, PageHead, Select, Serp, Spinner, Textarea, Toggle, treeOrder } from "../ui";

const BLANK = { title: "", slug: "", heading: "", parent_id: null, image: "", image_fit: "cover", description: "", layout_id: null, sort: 0, published: true, seo_title: "", seo_desc: "", seo_image: "", noindex: false };

export default function Categories() {
  const { toast, confirm } = useAdmin();
  const [sp, setSp] = useSearchParams();
  const { data: cats, error, loading, reload } = useApi("/admin/categories");
  const { data: lay } = useApi("/admin/layouts");
  const [edit, setEdit] = useState(null);
  const list = useMemo(() => (cats ? treeOrder(cats) : []), [cats]);
  useEffect(() => { const e = sp.get("edit"); if (e && cats) { const c = cats.find((x) => x.id == e); if (c) setEdit(c); } }, [cats]); // eslint-disable-line
  const del = async (c) => { if (await confirm({ title: "Delete category", message: `Delete “${c.title}”?`, danger: true, confirmText: "Delete" })) api(`/admin/categories/${c.id}`, { method: "DELETE" }).then(() => { toast("Deleted", "ok"); reload(); }).catch((e) => toast(e.message, "err")); };

  return (
    <>
      <PageHead title="Categories" sub="Build the product tree: Indoor → Panels → …. Each category can have its own page layout.">
        <Btn variant="primary" icon="plus" onClick={() => setEdit({ ...BLANK })}>Add category</Btn>
      </PageHead>
      <Card flush>
        {loading ? <Spinner /> : error ? <ErrorBox error={error} retry={reload} /> : !list.length ? <Empty title="No categories yet">Create one to start adding products.</Empty> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Category</th><th>Products</th><th>Layout for its products</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c.id}>
                <td><div className="row" style={{ paddingLeft: c.depth * 26 }}>{c.depth > 0 && <span className="muted">└</span>}
                  <div className="thumb contain" style={{ backgroundImage: c.image ? `url(${c.image})` : "none", backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" }} />
                  <div><span className="b">{c.title}</span><div className="muted small mono">/products/{c.slug}</div></div></div></td>
                <td>{c.product_count}{c.child_count > 0 && <span className="muted small"> · {c.child_count} sub</span>}</td>
                <td>{c.layout_name ? <Badge tone="brand">{c.layout_name}</Badge> : <span className="muted small">Inherits</span>}</td>
                <td>{c.published ? <Badge tone="ok">Visible</Badge> : <Badge>Hidden</Badge>}</td>
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  <a className="ico-btn" href={`/products/${c.slug}`} target="_blank" rel="noreferrer" title="View on site"><I n="ext" /></a>
                  <IconBtn n="edit" title="Edit" onClick={() => setEdit(c)} /><IconBtn n="trash" danger title="Delete" onClick={() => del(c)} />
                </td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Card>
      {edit && <CatModal cat={edit} cats={cats} layouts={lay?.items || []} onClose={() => { setEdit(null); if (sp.get("edit")) setSp({}, { replace: true }); }} onSaved={() => { setEdit(null); reload(); }} />}
    </>
  );
}

function CatModal({ cat, cats, layouts, onClose, onSaved }) {
  const { toast, can } = useAdmin();
  const [c, setC] = useState({ ...BLANK, ...cat }); const [busy, setBusy] = useState(false); const [tab, setTab] = useState("basic");
  const [applyKids, setApplyKids] = useState(false);
  const set = (k) => (v) => setC((x) => ({ ...x, [k]: v }));
  const isNew = !cat.id;
  const exclude = useMemo(() => { if (isNew) return []; const out = [cat.id]; let grew = true; while (grew) { grew = false; for (const x of cats) if (!out.includes(x.id) && out.includes(x.parent_id)) { out.push(x.id); grew = true; } } return out; }, [cats, cat.id, isNew]);
  const save = async () => {
    if (!c.title.trim()) return toast("Title is required", "err");
    setBusy(true);
    try {
      const r = await api(isNew ? "/admin/categories" : `/admin/categories/${cat.id}`, { method: isNew ? "POST" : "PUT", body: c });
      if (!isNew && applyKids && can("layouts.manage")) await api(`/admin/categories/${cat.id}/apply-layout`, { method: "POST", body: { layout_id: c.layout_id, reset_products: true } });
      toast("Saved", "ok"); onSaved(r);
    } catch (e) { toast(e.message, "err"); setBusy(false); }
  };
  return (
    <Modal title={isNew ? "New category" : `Edit “${cat.title}”`} size="wide" onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" loading={busy} onClick={save}>Save</Btn></>}>
      <div className="atabs">{[["basic", "Basics"], ["layout", "Layout"], ["seo", "SEO"]].map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === "basic" && (
        <div className="grid g2">
          <div>
            <Field label="Title *"><Input value={c.title} onChange={(e) => set("title")(e.target.value)} autoFocus /></Field>
            <Field label="Parent category"><CategorySelect cats={cats} value={c.parent_id} onChange={set("parent_id")} exclude={exclude} allowNone /></Field>
            <Field label="Page heading" hint="Optional, e.g. “Indoor Lighting Categories”"><Input value={c.heading} onChange={(e) => set("heading")(e.target.value)} /></Field>
            <Field label="Description" hint="Shown above the cards"><Textarea rows={3} value={c.description} onChange={(e) => set("description")(e.target.value)} /></Field>
          </div>
          <div>
            <Field label="Card image"><ImageInput value={c.image} onChange={set("image")} /></Field>
            <Field label="Image fit"><Select value={c.image_fit} onChange={(e) => set("image_fit")(e.target.value)}><option value="cover">Fill (crop)</option><option value="contain">Fit inside</option></Select></Field>
            <Field label="URL slug"><Input mono value={c.slug} placeholder="auto" onChange={(e) => set("slug")(e.target.value)} /></Field>
            <Field label="Order"><Input type="number" value={c.sort} onChange={(e) => set("sort")(e.target.value)} /></Field>
            <Toggle checked={c.published} onChange={set("published")} label="Visible on the site" />
          </div>
        </div>
      )}
      {tab === "layout" && (
        <>
          <div className="note" style={{ marginBottom: 14 }}>Choose how <b>product pages inside this category</b> look. Sub-categories inherit it unless they choose their own. A single product can still override it.</div>
          <Field label="Layout template"><Select value={c.layout_id || ""} onChange={(e) => set("layout_id")(e.target.value ? Number(e.target.value) : null)}><option value="">Inherit from parent / site default</option>{layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></Field>
          {!isNew && can("layouts.manage") && <Toggle checked={applyKids} onChange={setApplyKids} label="Also apply to all sub-categories and clear product-level overrides" />}
        </>
      )}
      {tab === "seo" && (
        <div className="grid g2"><div>
          <Field label="SEO title" right={`${c.seo_title.length}/60`}><Input value={c.seo_title} onChange={(e) => set("seo_title")(e.target.value)} placeholder={(c.heading || c.title) + " | EGYLUX"} /></Field>
          <Field label="Meta description" right={`${c.seo_desc.length}/160`}><Textarea rows={3} value={c.seo_desc} onChange={(e) => set("seo_desc")(e.target.value)} /></Field>
          <Field label="Share image"><ImageInput value={c.seo_image} onChange={set("seo_image")} /></Field>
          <Toggle checked={c.noindex} onChange={set("noindex")} label="Hide from search engines" />
        </div><div><Serp title={c.seo_title || `${c.heading || c.title} | EGYLUX`} desc={c.seo_desc || c.description} url={`${location.origin}/products/${c.slug || "…"}`} /></div></div>
      )}
    </Modal>
  );
}
