import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { useAdmin } from "../ctx";
import { ago, Badge, Btn, Card, Check, Drawer, Empty, ErrorBox, fmtDate, I, Input, PageHead, Pager, Select, Spinner, Tabs, Textarea, useDebounced, Field } from "../ui";
import { STATUS } from "./Dashboard";

export default function Submissions() {
  const { can, toast, confirm, refreshBadge } = useAdmin();
  const [sp, setSp] = useSearchParams();
  const status = sp.get("status") || "all", type = sp.get("type") || "all", open = sp.get("open");
  const [q, setQ] = useState(""); const dq = useDebounced(q);
  const [page, setPage] = useState(1); const [sel, setSel] = useState([]);
  const qs = `status=${status}&type=${type}&q=${encodeURIComponent(dq)}`;
  const { data, error, loading, reload } = useApi(`/admin/submissions?${qs}&page=${page}`);
  useEffect(() => { setPage(1); setSel([]); }, [status, type, dq]);
  const set = (k, v) => { const n = new URLSearchParams(sp); v === "all" || !v ? n.delete(k) : n.set(k, v); setSp(n, { replace: true }); };
  const manage = can("submissions.manage");
  const c = data?.counts || {};
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const items = data?.items || [];
  const allSel = items.length > 0 && items.every((i) => sel.includes(i.id));

  const bulk = async (body, msg) => {
    if (body.action === "delete" && !(await confirm({ title: "Delete submissions", message: `Delete ${sel.length} submission(s)? This can't be undone.`, danger: true, confirmText: "Delete" }))) return;
    await api("/admin/submissions/bulk", { method: "POST", body: { ids: sel, ...body } }).then(() => { toast(msg, "ok"); setSel([]); reload(); refreshBadge(); }).catch((e) => toast(e.message, "err"));
  };

  return (
    <>
      <PageHead title="Submissions" sub="Contact forms and “Get Quotation” requests from your visitors.">
        <a className="btn" href={`/api/admin/submissions/export.csv?${qs}`}><I n="download" /> Export CSV</a>
      </PageHead>
      <Tabs value={status} onChange={(v) => set("status", v)} items={[
        { id: "all", label: "All", count: total }, { id: "new", label: "New", count: c.new || 0 }, { id: "in_progress", label: "In progress", count: c.in_progress || 0 },
        { id: "done", label: "Done", count: c.done || 0 }, { id: "spam", label: "Spam", count: c.spam || 0 }]} />
      <Card flush>
        <div className="toolbar">
          <Input className="input search" placeholder="Search name, email, company, product, message…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={type} onChange={(e) => set("type", e.target.value)}><option value="all">All types</option><option value="quote">Quote requests</option><option value="contact">Contact messages</option></Select>
        </div>
        {sel.length > 0 && manage && (
          <div className="bulk">{sel.length} selected
            <Btn sm onClick={() => bulk({ status: "in_progress" }, "Marked in progress")}>In progress</Btn><Btn sm onClick={() => bulk({ status: "done" }, "Marked done")}>Done</Btn>
            <Btn sm onClick={() => bulk({ status: "spam" }, "Marked spam")}>Spam</Btn><Btn sm variant="danger" icon="trash" onClick={() => bulk({ action: "delete" }, "Deleted")}>Delete</Btn>
          </div>
        )}
        {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} retry={reload} /> : !items.length ? <Empty title="Nothing here">No submissions match these filters.</Empty> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr>{manage && <th style={{ width: 36 }}><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? [] : items.map((i) => i.id))} aria-label="Select all" /></th>}<th>From</th><th>Type</th><th>Product</th><th>Message</th><th>Status</th><th>Assigned</th><th>Received</th></tr></thead>
            <tbody>{items.map((r) => (
              <tr key={r.id} className={`click ${r.status === "new" ? "unread" : ""}`} onClick={() => set("open", r.id)}>
                {manage && <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.includes(r.id)} onChange={() => setSel(sel.includes(r.id) ? sel.filter((x) => x !== r.id) : [...sel, r.id])} aria-label={`Select ${r.name}`} /></td>}
                <td><span className={r.status === "new" ? "b" : ""}>{r.name}</span><div className="muted small">{r.company || r.email}</div></td>
                <td><Badge tone={r.type === "quote" ? "brand" : "info"}>{r.type === "quote" ? "Quote" : "Contact"}</Badge></td>
                <td className="clip" style={{ maxWidth: 150 }}>{r.product_title || <span className="muted">—</span>}</td>
                <td className="muted clip" style={{ maxWidth: 240 }}>{r.message}</td>
                <td><Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge></td>
                <td className="muted small">{r.assigned_name || "—"}</td>
                <td className="muted small" title={fmtDate(r.created_at)} style={{ whiteSpace: "nowrap" }}>{ago(r.created_at)}</td>
              </tr>))}</tbody>
          </table></div>
        )}
        <Pager page={page} limit={data?.limit || 20} total={data?.total || 0} onPage={setPage} />
      </Card>
      {open && <Detail id={open} onClose={() => set("open", "")} onChanged={() => { reload(); refreshBadge(); }} />}
    </>
  );
}

function Detail({ id, onClose, onChanged }) {
  const { can, toast, confirm } = useAdmin();
  const { data: s, loading, error, setData } = useApi(`/admin/submissions/${id}`);
  const { data: users } = useApi(can("submissions.manage") ? "/admin/users" : null);
  const [note, setNote] = useState(null);
  const manage = can("submissions.manage");
  useEffect(() => { if (s) setNote(s.note || ""); }, [s?.id]); // eslint-disable-line
  const patch = (body) => api(`/admin/submissions/${id}`, { method: "PATCH", body }).then(() => { setData({ ...s, ...body }); onChanged(); toast("Saved", "ok"); }).catch((e) => toast(e.message, "err"));
  // أول ما الإدمن يفتح رسالة جديدة → تبقى "in progress"
  useEffect(() => { if (s && s.status === "new" && manage) api(`/admin/submissions/${id}`, { method: "PATCH", body: { status: "in_progress" } }).then(() => { setData({ ...s, status: "in_progress" }); onChanged(); }); }, [s?.id]); // eslint-disable-line
  const del = async () => { if (await confirm({ title: "Delete submission", message: "This can't be undone.", danger: true, confirmText: "Delete" })) { await api(`/admin/submissions/${id}`, { method: "DELETE" }); onChanged(); onClose(); } };
  return (
    <Drawer title={s ? `${s.type === "quote" ? "Quote request" : "Contact message"} #${s.id}` : "Submission"} onClose={onClose}>
      {loading ? <Spinner /> : error ? <ErrorBox error={error} /> : (
        <>
          <div className="row awrap" style={{ marginBottom: 16 }}>
            <Badge tone={STATUS[s.status][1]}>{STATUS[s.status][0]}</Badge><span className="muted small">{fmtDate(s.created_at)}</span>
            {s.notified === 1 && <Badge tone="ok"><I n="mail" /> Admin emailed</Badge>}
            {s.notified === -1 && <Badge tone="err" title={s.notify_error}>Email failed</Badge>}
          </div>
          <dl className="kvlist" style={{ marginBottom: 18 }}>
            <dt>Name</dt><dd className="b">{s.name}</dd>
            <dt>Email</dt><dd><a href={`mailto:${s.email}`} style={{ color: "var(--info)" }}>{s.email}</a></dd>
            {s.phone && <><dt>Phone</dt><dd><a href={`tel:${s.phone}`} style={{ color: "var(--info)" }}>{s.phone}</a></dd></>}
            {s.company && <><dt>Company</dt><dd>{s.company}</dd></>}
            {(s.product_title || s.product_code) && <><dt>Product</dt><dd>{s.product ? <Link to={`/admin/products/${s.product.id}`} style={{ color: "var(--info)" }}>{s.product.title}</Link> : s.product_title}{s.product_code && <span className="mono muted"> · {s.product_code}</span>}</dd></>}
            {s.page_url && <><dt>Sent from</dt><dd className="mono">{s.page_url}</dd></>}
          </dl>
          <div className="lbl" style={{ marginBottom: 6 }}>Message</div>
          <div style={{ background: "#faf9f5", border: "1px solid var(--line)", borderRadius: 10, padding: 14, whiteSpace: "pre-wrap", marginBottom: 18 }}>{s.message}</div>
          <div className="row awrap" style={{ marginBottom: 20 }}>
            <a className="btn primary" href={`mailto:${s.email}?subject=${encodeURIComponent("Re: your " + (s.type === "quote" ? "quotation request" : "message") + (s.product_title ? " — " + s.product_title : ""))}`}><I n="mail" /> Reply by email</a>
            {s.phone && <a className="btn" href={`tel:${s.phone}`}><I n="phone" /> Call</a>}
          </div>
          {manage ? (
            <>
              <Field label="Status"><div className="row awrap">{Object.entries(STATUS).map(([k, [label]]) => <Btn key={k} sm variant={s.status === k ? "dark" : ""} onClick={() => patch({ status: k })}>{label}</Btn>)}</div></Field>
              <Field label="Assigned to"><Select value={s.assigned_to || ""} onChange={(e) => patch({ assigned_to: e.target.value || null, assigned_name: users?.find((u) => u.id == e.target.value)?.name })}><option value="">Unassigned</option>{(users || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
              <Field label="Internal note" hint="Only visible to your team"><Textarea rows={4} value={note ?? ""} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (s.note || "") && patch({ note })} placeholder="e.g. Called on Monday, sent price list…" /></Field>
            </>
          ) : s.note && <div className="note">{s.note}</div>}
          {s.history?.length > 0 && <Field label="Earlier from this email">{s.history.map((h) => <div key={h.id} className="small muted">#{h.id} · {h.type} · {STATUS[h.status][0]} · {ago(h.created_at)}</div>)}</Field>}
          {manage && <div style={{ marginTop: 24 }}><Btn variant="danger" icon="trash" onClick={del}>Delete</Btn></div>}
        </>
      )}
    </Drawer>
  );
}
