import { useState } from "react";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { useAdmin } from "../ctx";
import { Btn, Card, Empty, ErrorBox, I, IconBtn, Input, Modal, PageHead, Spinner, bytes, fmtDate, useDebounced } from "../ui";

export default function Media() {
  const { toast, confirm } = useAdmin();
  const [q, setQ] = useState(""); const dq = useDebounced(q); const [over, setOver] = useState(false); const [busy, setBusy] = useState(false); const [view, setView] = useState(null);
  const { data, error, loading, reload } = useApi(`/admin/media?q=${encodeURIComponent(dq)}`);
  const upload = async (files) => {
    if (!files?.length) return; setBusy(true);
    try { const fd = new FormData(); [...files].forEach((f) => fd.append("files", f)); const o = await api("/admin/media", { method: "POST", form: fd }); toast(`${o.length} file(s) uploaded`, "ok"); reload(); } catch (e) { toast(e.message, "err"); }
    setBusy(false);
  };
  const del = async (m) => { if (await confirm({ title: "Delete file", message: `Delete “${m.original}”? Pages using it will show a broken image.`, danger: true, confirmText: "Delete" })) { await api(`/admin/media/${m.id}`, { method: "DELETE" }); setView(null); reload(); } };
  const copy = (m) => navigator.clipboard?.writeText(location.origin + m.url).then(() => toast("Link copied", "ok"));
  return (
    <>
      <PageHead title="Media library" sub="Images, PDFs and datasheets (max 15 MB each)." />
      <div className={`drop ${over ? "over" : ""}`} style={{ marginBottom: 16 }} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}>
        <I n="upload" /> Drop files here or <label style={{ color: "var(--brand-d)", fontWeight: 650, cursor: "pointer", textDecoration: "underline" }}>browse<input type="file" multiple hidden onChange={(e) => upload(e.target.files)} /></label> {busy && <span className="spin" />}
      </div>
      <Card flush>
        <div className="toolbar"><Input className="input search" placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div style={{ padding: 16 }}>{loading && !data ? <Spinner /> : error ? <ErrorBox error={error} /> : !data.length ? <Empty title="No files">Upload images and documents to use them in products and pages.</Empty> : (
          <div className="media-grid">{data.map((m) => (
            <div className="media-item" key={m.id} onClick={() => setView(m)}>
              <div className="pic" style={m.mime.startsWith("image/") ? { backgroundImage: `url(${m.url})` } : undefined}>{!m.mime.startsWith("image/") && (m.original.split(".").pop() || "").toUpperCase()}</div>
              <p className="clip">{m.original}<span className="muted"> · {bytes(m.size)}</span></p>
            </div>))}</div>)}</div>
      </Card>
      {view && (
        <Modal title={view.original} onClose={() => setView(null)} footer={<><Btn variant="danger" icon="trash" onClick={() => del(view)}>Delete</Btn><span className="grow" /><Btn onClick={() => copy(view)}>Copy link</Btn><a className="btn primary" href={view.url} target="_blank" rel="noreferrer">Open</a></>}>
          {view.mime.startsWith("image/") && <img src={view.url} alt={view.alt || ""} style={{ maxHeight: 320, margin: "0 auto 14px", borderRadius: 8 }} />}
          <dl className="kvlist"><dt>URL</dt><dd className="mono">{view.url}</dd><dt>Type</dt><dd>{view.mime}</dd><dt>Size</dt><dd>{bytes(view.size)}</dd><dt>Uploaded</dt><dd>{fmtDate(view.created_at)}</dd></dl>
        </Modal>)}
    </>
  );
}
