import { useState } from "react";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { useAdmin } from "../ctx";
import { Badge, Btn, Card, ErrorBox, Field, Input, LayoutThumb, Modal, PageHead, Spinner, Textarea, Toggle } from "../ui";

const SECTIONS = [["galleryOverview", "Gallery: show all images together first"], ["showBadges", "Badges (IP, CRI, lifetime)"], ["showSpecs", "Specifications box"], ["showTech", "Technical specs (scale + table)"], ["showScale", "Color-temperature scale"], ["showCodes", "Product codes"], ["showNotes", "Notes"], ["showQuote", "“Get Quotation” button"], ["showDownload", "Download menu"], ["showRelated", "Related products"]];
const BASES = [["standard", "Standard", "Gallery + badges + specs, color scale & tech table"], ["panel", "Panel", "Big title, datasheet button & codes"]];

export default function Templates() {
  const { toast, confirm } = useAdmin();
  const { data, error, loading, reload } = useApi("/admin/layouts");
  const [edit, setEdit] = useState(null);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} retry={reload} />;
  const act = (p, m, msg) => api(p, { method: m }).then(() => { toast(msg, "ok"); reload(); }).catch((e) => toast(e.message, "err"));
  return (
    <>
      <PageHead title="Layout templates" sub="Design the product page once and reuse it: for the whole site, a category, or a single product.">
        <Btn variant="primary" icon="plus" onClick={() => setEdit({ name: "", description: "", base: "standard", options: { galleryOverview: true, showScale: true, showBadges: true, showSpecs: true, showTech: true, showCodes: true, showNotes: true, showQuote: true, showDownload: true, showRelated: true, quoteLabel: "Get Quotation", relatedTitle: "Related Products" } })}>New template</Btn>
      </PageHead>
      <div className="note" style={{ marginBottom: 18 }}><b>How it works:</b> a product uses its own template if it has one → otherwise its category's (or parent category's) → otherwise the <b>site default</b>. Set a category's layout in <b>Categories</b>, and a single product's layout in the product's <b>Layout</b> tab.</div>
      <div className="grid g3">
        {data.items.map((l) => {
          const isDef = l.id === data.default_id;
          return (
            <div key={l.id} className={`layout-card ${isDef ? "def" : ""}`}>
              <div className="pv"><LayoutThumb base={l.base} o={l.options} /></div>
              <div className="bd"><div className="row"><b>{l.name}</b>{isDef && <Badge tone="brand">Site default</Badge>}</div><p className="muted small" style={{ margin: "4px 0 8px" }}>{l.description}</p>
                <div className="small muted">Used by {l.categories.length} categor{l.categories.length === 1 ? "y" : "ies"}{l.categories.length > 0 && <>: {l.categories.map((c) => c.title).join(", ")}</>} · {l.products_count} product override(s)</div></div>
              <div className="ft"><Btn sm onClick={() => setEdit(l)}>Edit</Btn>
                {!isDef && <Btn sm onClick={() => act(`/admin/layouts/${l.id}/default`, "PUT", "Set as site default")}>Make default</Btn>}
                <Btn sm onClick={async () => (await confirm({ title: "Apply to the whole site", message: `Use “${l.name}” for every product? This clears all category and product-level layout choices.`, confirmText: "Apply to all" })) && act(`/admin/layouts/${l.id}/apply-all`, "POST", "Applied to the entire site")}>Apply to all</Btn>
                {!isDef && <Btn sm variant="danger" onClick={async () => (await confirm({ title: "Delete template", message: `Delete “${l.name}”? Items using it will fall back to the default.`, danger: true, confirmText: "Delete" })) && act(`/admin/layouts/${l.id}`, "DELETE", "Deleted")}>Delete</Btn>}</div>
            </div>);
        })}
      </div>
      {edit && <Editor l={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </>
  );
}

function Editor({ l, onClose, onSaved }) {
  const { toast } = useAdmin();
  const [f, setF] = useState(l); const [busy, setBusy] = useState(false);
  const o = f.options || {}; const setO = (k, v) => setF({ ...f, options: { ...o, [k]: v } });
  const save = async () => {
    if (!f.name.trim()) return toast("Give the template a name", "err");
    setBusy(true);
    try { await api(f.id ? `/admin/layouts/${f.id}` : "/admin/layouts", { method: f.id ? "PUT" : "POST", body: f }); toast("Saved", "ok"); onSaved(); } catch (e) { toast(e.message, "err"); setBusy(false); }
  };
  return (
    <Modal title={f.id ? "Edit template" : "New template"} size="wide" onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" loading={busy} onClick={save}>Save</Btn></>}>
      <div className="grid g2">
        <div>
          <Field label="Name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
          <Field label="Description"><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div className="lbl" style={{ marginBottom: 6 }}>Base design</div>
          <div className="pick" style={{ marginBottom: 16 }}>{BASES.map(([k, n, d]) => <button type="button" key={k} className={f.base === k ? "on" : ""} onClick={() => setF({ ...f, base: k })}><b>{n}</b><div className="muted small">{d}</div></button>)}</div>
          <Field label="Quote button text"><Input value={o.quoteLabel || ""} onChange={(e) => setO("quoteLabel", e.target.value)} placeholder="Get Quotation" /></Field>
          <Field label="Related products heading"><Input value={o.relatedTitle || ""} onChange={(e) => setO("relatedTitle", e.target.value)} placeholder="Related Products" /></Field>
        </div>
        <div>
          <div className="lbl" style={{ marginBottom: 8 }}>Live preview</div>
          <div className="layout-card" style={{ marginBottom: 16 }}><div className="pv"><LayoutThumb base={f.base} o={o} /></div></div>
          <div className="lbl" style={{ marginBottom: 8 }}>Sections to show</div>
          <div className="stack" style={{ display: "grid", gap: 9 }}>{SECTIONS.map(([k, label]) => <Toggle key={k} checked={o[k] !== false} onChange={(v) => setO(k, v)} label={label} />)}</div>
        </div>
      </div>
    </Modal>
  );
}
