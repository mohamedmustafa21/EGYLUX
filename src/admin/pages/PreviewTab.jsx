import { useEffect, useMemo, useRef, useState } from "react";
import { Btn } from "../ui";

// معاينة حيّة: iframe بيعرض صفحة المنتج الحقيقية (/__preview/product) بالبيانات اللي لسه بتتعدّل
export default function PreviewTab({ product, breadcrumb, layout, related }) {
  const frame = useRef(null);
  const box = useRef(null);
  const [device, setDevice] = useState("desktop");
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);
  const W = device === "mobile" ? 390 : 1280;
  const H = Math.max(520, Math.round(window.innerHeight * 0.76));
  const payload = useMemo(() => ({ product, breadcrumb, layout, related }), [product, breadcrumb, layout, related]);

  useEffect(() => {
    const h = (e) => { if (e.origin === window.location.origin && e.data?.type === "egx-preview-ready") setReady(true); };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => frame.current?.contentWindow?.postMessage({ type: "egx-preview", payload }, window.location.origin), 150);
    return () => clearTimeout(t);
  }, [ready, payload]);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, (el.clientWidth - 2) / W)));
    ro.observe(el); return () => ro.disconnect();
  }, [W]);

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <span className="muted small">Live preview of the real product page — updates as you type, nothing is saved or sent.</span>
        <span className="row" style={{ gap: 6 }}>
          <Btn sm variant={device === "desktop" ? "primary" : undefined} onClick={() => setDevice("desktop")}>Desktop</Btn>
          <Btn sm variant={device === "mobile" ? "primary" : undefined} onClick={() => setDevice("mobile")}>Mobile</Btn>
        </span>
      </div>
      <div ref={box} style={{ display: "flex", justifyContent: "center", background: "#e9e8e0", border: "1px solid #d9d7ca", borderRadius: 12, padding: 0, overflow: "hidden" }}>
        <div style={{ width: W * scale, height: H, overflow: "hidden", background: "#fff" }}>
          <iframe ref={frame} src="/__preview/product" title="Product page preview" style={{ width: W, height: H / scale, border: 0, display: "block", transform: `scale(${scale})`, transformOrigin: "0 0" }} />
        </div>
      </div>
    </div>
  );
}
