import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAdmin } from "./ctx";

/* ---------------- icons (feather-style) ---------------- */
const P = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  box: "M16.5 9.4l-9-5.19 M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
  folder: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  layout: "M3 3h18v18H3z M3 9h18 M9 21V9",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  image: "M3 3h18v18H3z M8.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M21 15l-5-5L5 21",
  chart: "M18 20V10 M12 20V4 M6 20v-6",
  search: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.35-4.35",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  sliders: "M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  plus: "M12 5v14 M5 12h14",
  trash: "M3 6h18 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6 M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  copy: "M9 9h11v11H9z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1",
  ext: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18 M6 6l12 12",
  menu: "M3 12h18 M3 6h18 M3 18h18",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  pulse: "M22 12h-4l-3 9L9 3l-3 9H2",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 6l-10 7L2 6",
  up: "M12 19V5 M5 12l7-7 7 7",
  down: "M12 5v14 M19 12l-7 7-7-7",
  edit: "M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
};
export const I = ({ n, className = "" }) => (
  <svg className={`ico ${className}`} viewBox="0 0 24 24" aria-hidden="true">{(P[n] || "").split(" M").map((d, i) => <path key={i} d={(i ? "M" : "") + d} />)}</svg>
);

/* ---------------- helpers ---------------- */
export const fmtDate = (ts) => (ts ? new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
export function ago(ts) {
  if (!ts) return "never";
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); if (d < 30) return `${d} d ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
export const num = (n) => Number(n || 0).toLocaleString("en-US");
export const bytes = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
export function useDebounced(v, ms = 350) {
  const [x, setX] = useState(v);
  useEffect(() => { const t = setTimeout(() => setX(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return x;
}
// ترتيب الكاتيجوري كشجرة مع depth
export function treeOrder(cats, parent = null, depth = 0) {
  return cats.filter((c) => (c.parent_id || null) === parent).sort((a, b) => a.sort - b.sort || a.id - b.id)
    .flatMap((c) => [{ ...c, depth }, ...treeOrder(cats, c.id, depth + 1)]);
}

/* ---------------- basic components ---------------- */
export function Btn({ variant = "", sm, icon, loading, children, className = "", ...p }) {
  return (
    <button type="button" className={`btn ${variant} ${sm ? "sm" : ""} ${className}`} disabled={loading || p.disabled} {...p}>
      {loading ? <span className="spin" style={{ width: 14, height: 14 }} /> : icon && <I n={icon} />}{children}
    </button>
  );
}
export const IconBtn = ({ n, danger, title, ...p }) => <button type="button" className={`ico-btn ${danger ? "danger" : ""}`} title={title} aria-label={title} {...p}><I n={n} /></button>;
export const Badge = ({ tone = "", children }) => <span className={`badge ${tone}`}>{children}</span>;
export const Spinner = () => <div className="center-load"><span className="spin" /></div>;
export const Empty = ({ title, children }) => <div className="aempty"><b>{title}</b>{children}</div>;
export const ErrorBox = ({ error, retry }) => (
  <div className="note err" style={{ margin: 16 }}>{error?.message || "Something went wrong"} {retry && <button className="btn sm" style={{ marginLeft: 8 }} onClick={retry}>Retry</button>}</div>
);

export function Card({ title, actions, children, flush, className = "", id }) {
  return (
    <section className={`acard ${className}`} id={id}>
      {(title || actions) && <div className="acard-h"><h3>{title}</h3><span className="grow" />{actions}</div>}
      <div className={`acard-b ${flush ? "flush" : ""}`}>{children}</div>
    </section>
  );
}
export function PageHead({ title, sub, children }) {
  return <div className="adm-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><span className="grow" />{children}</div>;
}
export function Field({ label, hint, right, children }) {
  return <div className="field">{label && <label>{label}{right ? <span className="counter">{right}</span> : hint ? <span className="hint">{hint}</span> : null}</label>}{children}</div>;
}
export const Input = ({ mono, sm, ...p }) => <input className={`input ${mono ? "mono" : ""} ${sm ? "input-sm" : ""}`} {...p} />;
export const Textarea = (p) => <textarea className="textarea" {...p} />;
export const Select = ({ children, sm, ...p }) => <select className={`select ${sm ? "input-sm" : ""}`} {...p}>{children}</select>;
export function Toggle({ checked, onChange, label }) {
  return <label className="toggle"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /><i />{label && <span>{label}</span>}</label>;
}
export function Check({ checked, onChange, children }) {
  return <label className="check"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />{children}</label>;
}
export function Tabs({ value, onChange, items }) {
  return <div className="atabs" role="tablist">{items.map((t) => (
    <button key={t.id} role="tab" aria-selected={value === t.id} className={value === t.id ? "on" : ""} onClick={() => onChange(t.id)}>{t.label}{t.count != null && <span className="cnt">{t.count}</span>}</button>
  ))}</div>;
}
export function Pager({ page, limit, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pager">
      <span>{total ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${num(total)}` : "No results"}</span>
      <div className="row"><Btn sm disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Btn><span className="small">Page {page} / {pages}</span><Btn sm disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Btn></div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, size = "" }) {
  useEffect(() => { const h = (e) => e.key === "Escape" && onClose(); document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);
  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`amodal ${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-h"><h3>{title}</h3><IconBtn n="x" title="Close" onClick={onClose} /></div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}
export function Drawer({ title, onClose, children, actions }) {
  useEffect(() => { const h = (e) => e.key === "Escape" && onClose(); document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);
  return (
    <div className="ov right" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-h"><h3>{title}</h3>{actions}<IconBtn n="x" title="Close" onClick={onClose} /></div>
        <div className="modal-b">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- editors ---------------- */
export function Tags({ value = [], onChange, placeholder = "Type and press Enter" }) {
  const [t, setT] = useState("");
  const add = (raw) => { const v = raw.trim(); if (v && !value.includes(v)) onChange([...value, v]); setT(""); };
  return (
    <div className="tags">
      {value.map((v) => <span key={v}>{v}<button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>×</button></span>)}
      <input value={t} placeholder={value.length ? "" : placeholder} onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value.slice(0, -1)) : setT(e.target.value))}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(t); } else if (e.key === "Backspace" && !t && value.length) onChange(value.slice(0, -1)); }} onBlur={() => t && add(t)} />
    </div>
  );
}
export function PairList({ value = [], onChange, kPh = "Name", vPh = "Value", addLabel = "Add row" }) {
  const set = (i, j, v) => onChange(value.map((r, x) => (x === i ? r.map((c, y) => (y === j ? v : c)) : r)));
  return (
    <div>
      {value.map((r, i) => (
        <div className="kv" key={i}>
          <Input sm value={r[0]} placeholder={kPh} onChange={(e) => set(i, 0, e.target.value)} />
          <Input sm value={r[1]} placeholder={vPh} onChange={(e) => set(i, 1, e.target.value)} />
          <IconBtn n="x" danger title="Remove" onClick={() => onChange(value.filter((_, x) => x !== i))} />
        </div>
      ))}
      <Btn sm icon="plus" onClick={() => onChange([...value, ["", ""]])}>{addLabel}</Btn>
    </div>
  );
}

export function MediaPicker({ onPick, onClose, kind = "image", multiple }) {
  const { toast } = useAdmin();
  const [q, setQ] = useState(""); const dq = useDebounced(q);
  const [items, setItems] = useState(null); const [sel, setSel] = useState([]); const [busy, setBusy] = useState(false); const [over, setOver] = useState(false);
  const load = () => api(`/admin/media?kind=${kind}&q=${encodeURIComponent(dq)}`).then(setItems).catch((e) => toast(e.message, "err"));
  useEffect(() => { load(); }, [dq]); // eslint-disable-line
  const upload = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    try { const fd = new FormData(); [...files].forEach((f) => fd.append("files", f)); const out = await api("/admin/media", { method: "POST", form: fd }); toast(`${out.length} file(s) uploaded`, "ok"); await load(); setSel((s) => (multiple ? [...s, ...out.map((o) => o.url)] : [out[0].url])); } catch (e) { toast(e.message, "err"); }
    setBusy(false);
  };
  const toggle = (u) => setSel(multiple ? (sel.includes(u) ? sel.filter((x) => x !== u) : [...sel, u]) : [u]);
  return (
    <Modal title={kind === "image" ? "Choose an image" : "Choose a file"} size="xl" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!sel.length} onClick={() => { onPick(multiple ? sel : sel[0]); onClose(); }}>Use {sel.length > 1 ? `${sel.length} selected` : "selected"}</Btn></>}>
      <div className={`drop ${over ? "over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}>
        <I n="upload" /> Drag files here or <label style={{ color: "var(--brand-d)", fontWeight: 650, cursor: "pointer", textDecoration: "underline" }}>browse<input type="file" hidden multiple={multiple} accept={kind === "image" ? "image/*" : undefined} onChange={(e) => upload(e.target.files)} /></label> {busy && <span className="spin" />}
      </div>
      <div className="row" style={{ margin: "14px 0" }}><Input placeholder="Search by file name…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {!items ? <Spinner /> : !items.length ? <Empty title="No files yet">Upload your first file above.</Empty> : (
        <div className="media-grid">{items.map((m) => (
          <div key={m.id} className={`media-item ${sel.includes(m.url) ? "sel" : ""}`} onClick={() => toggle(m.url)}>
            <div className="pic" style={m.mime.startsWith("image/") ? { backgroundImage: `url(${m.url})` } : undefined}>{!m.mime.startsWith("image/") && (m.original.split(".").pop() || "").toUpperCase()}</div>
            <p className="clip">{m.original}</p>
          </div>))}</div>
      )}
    </Modal>
  );
}
export function ImageInput({ value, onChange, kind = "image", placeholder = "https://… or choose from library" }) {
  const [pick, setPick] = useState(false);
  return (
    <div className="img-field">
      {kind === "image" && <div className="thumb contain" style={{ backgroundImage: value ? `url(${value})` : "none", backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" }} />}
      <Input sm value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <Btn sm icon="image" onClick={() => setPick(true)}>{kind === "image" ? "Choose" : "Upload"}</Btn>
      {value && <IconBtn n="x" title="Clear" onClick={() => onChange("")} />}
      {pick && <MediaPicker kind={kind} onPick={onChange} onClose={() => setPick(false)} />}
    </div>
  );
}
export function ImageList({ value = [], onChange }) {
  const [pick, setPick] = useState(false);
  const move = (i, d) => { const a = [...value]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div className="imgs">
      {value.map((u, i) => (
        <div className="im" key={u + i} style={{ backgroundImage: `url(${u})` }}>
          {i === 0 && <span className="badge brand main">Main</span>}
          <div className="ctl">
            <span><button type="button" title="Move left" onClick={() => move(i, -1)}><I n="up" className="" /></button></span>
            <span style={{ display: "flex", gap: 4 }}><button type="button" title="Move right" onClick={() => move(i, 1)}><I n="down" /></button><button type="button" title="Remove" onClick={() => onChange(value.filter((_, x) => x !== i))}><I n="trash" /></button></span>
          </div>
        </div>
      ))}
      <button type="button" className="add" onClick={() => setPick(true)}><span><I n="plus" /><br />Add images</span></button>
      {pick && <MediaPicker multiple onPick={(urls) => onChange([...value, ...urls.filter((u) => !value.includes(u))])} onClose={() => setPick(false)} />}
    </div>
  );
}
export function CategorySelect({ cats, value, onChange, exclude = [], placeholder = "— Select category —", allowNone, sm }) {
  const list = useMemo(() => treeOrder(cats || []), [cats]);
  return (
    <Select sm={sm} value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">{allowNone ? "— None (top level) —" : placeholder}</option>
      {list.filter((c) => !exclude.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{"\u00A0\u00A0".repeat(c.depth)}{c.depth ? "└ " : ""}{c.title}</option>)}
    </Select>
  );
}

/* ---------------- charts ---------------- */
export function LineChart({ data, lines, height = 200 }) {
  const W = 700, H = height, L = 36, B = 24, T = 10, R = 8;
  const max = Math.max(4, ...data.flatMap((d) => lines.map((l) => d[l.k] || 0)));
  const step = Math.pow(10, Math.floor(Math.log10(max))); const top = Math.ceil(max / step) * step;
  const x = (i) => L + (data.length < 2 ? 0 : (i * (W - L - R)) / (data.length - 1));
  const y = (v) => T + (1 - v / top) * (H - T - B);
  const every = Math.ceil(data.length / 8);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Line chart">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => <g key={f}><line x1={L} x2={W - R} y1={y(top * f)} y2={y(top * f)} stroke="#ecebe3" /><text className="ax" x={L - 6} y={y(top * f) + 3} textAnchor="end">{Math.round(top * f)}</text></g>)}
        {lines.map((l, li) => {
          const d = data.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p[l.k] || 0)}`).join(" ");
          return <g key={l.k}>{li === 0 && <path d={`${d} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={l.color} opacity=".12" />}<path d={d} fill="none" stroke={l.color} strokeWidth="2.2" strokeLinejoin="round" />{data.length <= 31 && data.map((p, i) => <circle key={i} cx={x(i)} cy={y(p[l.k] || 0)} r="2.8" fill="#fff" stroke={l.color} strokeWidth="1.6" />)}</g>;
        })}
        {data.map((p, i) => i % every === 0 && <text key={i} className="ax" x={x(i)} y={H - 6} textAnchor="middle">{p.date.slice(5)}</text>)}
        {data.map((p, i) => <rect key={i} x={x(i) - (W - L) / data.length / 2} y={T} width={(W - L) / data.length} height={H - T - B} fill="transparent"><title>{p.date} — {lines.map((l) => `${l.label}: ${p[l.k] || 0}`).join(", ")}</title></rect>)}
      </svg>
    </div>
  );
}
export function BarList({ rows = [], labelKey = "name", valueKey = "n", empty = "No data yet", format }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  if (!rows.length) return <p className="muted small" style={{ margin: 0 }}>{empty}</p>;
  return <div>{rows.map((r, i) => <div className="bar-row" key={i}><span className="clip">{format ? format(r) : r[labelKey]}</span><b>{num(r[valueKey])}</b><div className="bar"><i style={{ width: `${(r[valueKey] / max) * 100}%` }} /></div></div>)}</div>;
}
export function Trend({ now, prev }) {
  if (!prev && !now) return <span className="muted small">—</span>;
  if (!prev) return <span className="trend up">new</span>;
  const p = Math.round(((now - prev) / prev) * 100);
  return <span className={`trend ${p >= 0 ? "up" : "down"}`}>{p >= 0 ? "▲" : "▼"} {Math.abs(p)}% <span className="muted" style={{ fontWeight: 400 }}>vs previous</span></span>;
}

/* ---------------- SERP preview ---------------- */
export function Serp({ title, desc, url }) {
  return <div className="serp"><div className="u">{url}</div><div className="t">{title || "Page title"}</div><div className="d">{desc || "Meta description will appear here."}</div></div>;
}
export const lenTone = (n, min, max) => (!n ? "" : n < min || n > max ? "bad" : "ok");

/* ---------------- layout wireframes ---------------- */
export function LayoutThumb({ base, o = {} }) {
  const bar = (x, y, w, c = "#d9d7ca", h = 5) => <rect x={x} y={y} width={w} height={h} rx="2.5" fill={c} />;
  const std = base === "standard";
  return (
    <svg viewBox="0 0 220 132" style={{ width: "100%", display: "block", borderRadius: 8, background: "#fff", border: "1px solid #e8e7e0" }}>
      <defs><linearGradient id="lt-g" x1="0" x2="1"><stop offset="0" stopColor="#f7941d" /><stop offset=".5" stopColor="#fffdf6" /><stop offset="1" stopColor="#5b8fe3" /></linearGradient></defs>
      <rect x="10" y="10" width="92" height="52" rx="5" fill="#ecebe3" />
      {o.galleryOverview !== false && std ? <><rect x="13" y="66" width="34" height="11" rx="2" fill="#dcdacd" stroke="#8c8a7c" /><rect x="51" y="66" width="16" height="11" rx="2" fill="#ecebe3" /><rect x="71" y="66" width="16" height="11" rx="2" fill="#ecebe3" /></> : <><rect x="14" y="66" width="16" height="11" rx="2" fill="#ecebe3" /><rect x="34" y="66" width="16" height="11" rx="2" fill="#ecebe3" /></>}
      {std ? (<>
        {bar(112, 12, 70, "#6f6d62", 7)}
        {o.showBadges !== false && [0, 1, 2].map((i) => <rect key={i} x={112 + i * 26} y="25" width="22" height="9" rx="4.5" fill="#f1ecaa" />)}
        {bar(112, 40, 96)}{bar(112, 48, 88)}
        {o.showQuote !== false && <rect x="112" y="58" width="46" height="11" rx="3" fill="#d2ca13" />}
        {o.showDownload !== false && <rect x="162" y="58" width="40" height="11" rx="3" fill="#fff" stroke="#cfcdbf" />}
        {o.showSpecs !== false && <><rect x="112" y="74" width="96" height="20" rx="4" fill="#faf9f5" stroke="#e8e7e0" />{bar(118, 79, 50)}{bar(118, 86, 70)}</>}
        {o.showTech !== false && <>
          {o.showScale !== false && <rect x="10" y="98" width="200" height="5" rx="2.5" fill="url(#lt-g)" />}
          <rect x="10" y="108" width="200" height="16" rx="4" fill="#f1f0ea" /><rect x="14" y="111" width="38" height="10" rx="3" fill="#fff" />{bar(60, 114, 30)}{bar(100, 114, 24)}{bar(134, 114, 24)}
        </>}
      </>) : (<>
        {bar(112, 12, 90, "#4a483b", 11)}{bar(112, 32, 96)}{bar(112, 41, 86)}{bar(112, 50, 92)}
        {o.showDownload !== false && <rect x="112" y="64" width="48" height="12" rx="3" fill="#fff" stroke="#cfcdbf" />}
        {o.showQuote !== false && <rect x="164" y="64" width="44" height="12" rx="3" fill="#d2ca13" />}
        {o.showCodes !== false && <><rect x="12" y="92" width="196" height="9" rx="2" fill="#faf9f5" stroke="#e8e7e0" /><rect x="12" y="105" width="196" height="9" rx="2" fill="#faf9f5" stroke="#e8e7e0" /></>}
      </>)}
    </svg>
  );
}
