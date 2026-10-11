import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { useAdmin } from "../ctx";
import { ago, Badge, Btn, Card, CategorySelect, Check, Empty, ErrorBox, Field, I, IconBtn, Input, Modal, PageHead, Pager, Select, Spinner, useDebounced } from "../ui";

export default function Products() {
  const { can, toast, confirm } = useAdmin();
  const nav = useNavigate();
  const [q, setQ] = useState(""); const dq = useDebounced(q);
  const [cat, setCat] = useState(null); const [status, setStatus] = useState("all"); const [page, setPage] = useState(1); const [sel, setSel] = useState([]);
  const [move, setMove] = useState(false);
  const { data: cats } = useApi("/admin/categories");
  const { data: lay } = useApi("/admin/layouts");
  const { data, error, loading, reload } = useApi(`/admin/products?q=${encodeURIComponent(dq)}&status=${status}&page=${page}${cat ? `&category_id=${cat}` : ""}`);
  useEffect(() => { setPage(1); setSel([]); }, [dq, cat, status]);
  const items = data?.items || [], edit = can("products.edit");
  const allSel = items.length > 0 && items.every((i) => sel.includes(i.id));
  const bulk = async (body, msg) => {
    if (body.action === "delete" && !(await confirm({ title: "Delete products", message: `Delete ${sel.length} product(s) permanently?`, danger: true, confirmText: "Delete" }))) return;
    await api("/admin/products/bulk", { method: "POST", body: { ids: sel, ...body } }).then(() => { toast(msg, "ok"); setSel([]); setMove(false); reload(); }).catch((e) => toast(e.message, "err"));
  };
  const dup = (id) => api(`/admin/products/${id}/duplicate`, { method: "POST" }).then((r) => { toast("Duplicated as draft", "ok"); nav(`/admin/products/${r.id}`); }).catch((e) => toast(e.message, "err"));
  const del = async (p) => { if (await confirm({ title: "Delete product", message: `Delete “${p.title}” permanently?`, danger: true, confirmText: "Delete" })) api(`/admin/products/${p.id}`, { method: "DELETE" }).then(() => { toast("Deleted", "ok"); reload(); }).catch((e) => toast(e.message, "err")); };

  return (
    <>
      <PageHead title="Products" sub="Add, edit and organise every product on the site.">
        {edit && <Link className="btn primary" to="/admin/products/new"><I n="plus" /> Add product</Link>}
      </PageHead>
      <Card flush>
        <div className="toolbar">
          <Input className="input search" placeholder="Search by name, slug or code…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div style={{ minWidth: 200 }}><CategorySelect cats={cats} value={cat} onChange={setCat} placeholder="All categories" /></div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option></Select>
        </div>
        {sel.length > 0 && edit && (
          <div className="bulk">{sel.length} selected
            <Btn sm onClick={() => bulk({ action: "publish" }, "Published")}>Publish</Btn><Btn sm onClick={() => bulk({ action: "unpublish" }, "Moved to drafts")}>Unpublish</Btn>
            <Btn sm onClick={() => setMove(true)}>Move / apply layout…</Btn>
            {can("products.delete") && <Btn sm variant="danger" icon="trash" onClick={() => bulk({ action: "delete" }, "Deleted")}>Delete</Btn>}
          </div>
        )}
        {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} retry={reload} /> : !items.length ? <Empty title="No products found">{edit && <Link className="btn primary" style={{ marginTop: 10 }} to="/admin/products/new">Add your first product</Link>}</Empty> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr>{edit && <th style={{ width: 36 }}><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? [] : items.map((i) => i.id))} aria-label="Select all" /></th>}<th>Product</th><th>Category</th><th>Layout</th><th>SEO</th><th>Status</th><th>Updated</th><th /></tr></thead>
            <tbody>{items.map((p) => (
              <tr key={p.id} className="click" onClick={() => nav(`/admin/products/${p.id}`)}>
                {edit && <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.includes(p.id)} onChange={() => setSel(sel.includes(p.id) ? sel.filter((x) => x !== p.id) : [...sel, p.id])} aria-label={`Select ${p.title}`} /></td>}
                <td><div className="row"><div className="thumb contain" style={{ backgroundImage: p.image ? `url(${p.image})` : "none", backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" }} /><div><span className="b">{p.title}</span><div className="muted small mono">/{p.slug}</div></div></div></td>
                <td className="muted small">{p.category}</td>
                <td><Badge tone={p.layout_source === "product" ? "brand" : ""}>{p.layout}</Badge><div className="tiny muted">{p.layout_source === "product" ? "set on product" : p.layout_source === "category" ? "from category" : "site default"}</div></td>
                <td>{p.seo_ok ? <Badge tone="ok">Custom</Badge> : <Badge tone="warn">Auto</Badge>}</td>
                <td>{p.published ? <Badge tone="ok">Published</Badge> : <Badge>Draft</Badge>}</td>
                <td className="muted small" style={{ whiteSpace: "nowrap" }}>{ago(p.updated_at)}</td>
                <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap" }}>
                  <a className="ico-btn" href={`/products/${p.slug}`} target="_blank" rel="noreferrer" title="View on site"><I n="ext" /></a>
                  {edit && <IconBtn n="copy" title="Duplicate" onClick={() => dup(p.id)} />}
                  {can("products.delete") && <IconBtn n="trash" danger title="Delete" onClick={() => del(p)} />}
                </td>
              </tr>))}</tbody>
          </table></div>
        )}
        <Pager page={page} limit={data?.limit || 25} total={data?.total || 0} onPage={setPage} />
      </Card>
      {move && <BulkMove cats={cats} layouts={lay?.items || []} canLayout={can("layouts.manage") || true} onClose={() => setMove(false)} onApply={bulk} count={sel.length} />}
    </>
  );
}

function BulkMove({ cats, layouts, onClose, onApply, count }) {
  const [mode, setMode] = useState("move"); const [cat, setCat] = useState(null); const [layout, setLayout] = useState("");
  return (
    <Modal title={`Bulk update ${count} product(s)`} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={mode === "move" && !cat} onClick={() => onApply(mode === "move" ? { action: "move", category_id: cat } : { action: "layout", layout_id: layout || null }, "Updated")}>Apply</Btn></>}>
      <div className="row" style={{ marginBottom: 16 }}><Btn variant={mode === "move" ? "dark" : ""} onClick={() => setMode("move")}>Move to category</Btn><Btn variant={mode === "layout" ? "dark" : ""} onClick={() => setMode("layout")}>Set layout</Btn></div>
      {mode === "move" ? <Field label="Destination category"><CategorySelect cats={cats} value={cat} onChange={setCat} /></Field> : (
        <Field label="Layout template" hint="“Inherit” removes the override"><Select value={layout} onChange={(e) => setLayout(e.target.value)}><option value="">Inherit from category / site default</option>{layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></Field>)}
    </Modal>
  );
}
