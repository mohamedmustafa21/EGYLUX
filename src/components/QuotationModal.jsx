import { useEffect, useState } from "react";
import { api } from "../lib/api";

const empty = { name: "", email: "", company: "", phone: "", project: "", code: "", comment: "", website: "" };

// items = الأكواد اللي العميل اختارها من الجدول (كل كود له كمية). من غير items بيرجع للشكل القديم (كود واحد)
export default function QuotationModal({ open, onClose, product, productCode = "", items = null }) {
  const [f, setF] = useState({ ...empty, code: productCode });
  const [state, setState] = useState({ sending: false, error: "", done: false });
  const [qty, setQty] = useState({});
  const multi = Array.isArray(items);
  useEffect(() => { if (open) { setF({ ...empty, code: productCode }); setQty({}); setState({ sending: false, error: "", done: false }); } }, [open, productCode]);
  if (!open) return null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const q = (c) => Math.max(1, parseInt(qty[c], 10) || 1);
    const lines = multi ? items.map((c) => `${c}  ×  ${q(c)}`) : [];
    setState({ sending: true, error: "", done: false });
    try {
      await api("/public/submit", {
        method: "POST",
        body: {
          type: "quote", name: f.name, email: f.email, phone: f.phone, company: f.company, website: f.website,
          message: multi ? `Project: ${f.project}\n\nRequested codes (${items.length}):\n${lines.join("\n")}\n\n${f.comment}` : f.comment,
          product_id: product?.id, product_title: product?.title, product_code: multi ? (items.length > 1 ? `${items[0]} (+${items.length - 1} more)` : items[0]) : f.code, page_url: location.pathname,
        },
      });
      setState({ sending: false, error: "", done: true });
    } catch (err) {
      setState({ sending: false, error: err.message, done: false });
    }
  };

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      {state.done ? (
        <div className="modal__box sent" role="status">
          <span className="sent__tick">✓</span>
          <h3>Thank you!</h3>
          <p>Your quotation request was sent. Our sales team will contact you shortly.</p>
          <button type="button" className="btn-yellow" onClick={onClose}>Close</button>
        </div>
      ) : (
        <form className="modal__box" onSubmit={submit}>
          <h3>Get Quotation{product ? ` — ${product.title}` : ""}</h3>
          <div className="modal__row">
            <input required placeholder="Name *" value={f.name} onChange={set("name")} />
            <input required type="email" placeholder="Email *" value={f.email} onChange={set("email")} />
          </div>
          <input required placeholder="Company Name *" value={f.company} onChange={set("company")} />
          <input required placeholder="Phone Number *" value={f.phone} onChange={set("phone")} />
          {multi ? (
            <>
              <input required placeholder="Project name *" value={f.project} onChange={set("project")} />
              <div className="qlist" role="group" aria-label="Selected codes">
                <div className="qlist__head"><span>Selected codes ({items.length})</span><span>Quantity</span></div>
                {items.map((c) => (
                  <div className="qlist__row" key={c}>
                    <span className="mono">{c}</span>
                    <input type="number" min="1" inputMode="numeric" aria-label={`Quantity for ${c}`} value={qty[c] ?? 1} onChange={(e) => setQty({ ...qty, [c]: e.target.value })} />
                  </div>
                ))}
              </div>
            </>
          ) : <input required placeholder="Product code *" value={f.code} onChange={set("code")} />}
          <textarea required rows="6" placeholder="Comment *" value={f.comment} onChange={set("comment")} />
          {/* honeypot: البوتات بتملاه، البني آدمين لأ */}
          <input name="website" value={f.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
          {state.error && <p role="alert" style={{ color: "#b3261e", fontSize: 14 }}>{state.error}</p>}
          <div className="modal__row">
            <button type="button" className="btn-line" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-yellow" disabled={state.sending}>{state.sending ? "Sending…" : "Submit"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
