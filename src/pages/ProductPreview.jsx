import { useEffect, useState } from "react";
import ProductDetail from "./ProductDetail";

// صفحة داخل iframe في الداش بورد (Product → Preview): بتستقبل بيانات المنتج وهو لسه بيتعدّل
// وبتعرضها بنفس كومبوننت صفحة الموقع بالظبط. مفيش حفظ ولا تتبع زيارات هنا.
export default function ProductPreview() {
  const [data, setData] = useState(null);
  useEffect(() => {
    const h = (e) => {
      if (e.origin !== window.location.origin || e.data?.type !== "egx-preview") return;
      setData(e.data.payload);
    };
    window.addEventListener("message", h);
    window.parent?.postMessage({ type: "egx-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", h);
  }, []);
  if (!data) return <p style={{ padding: 40, fontFamily: "system-ui", color: "#777" }}>Loading preview…</p>;
  return <ProductDetail data={data} preview />;
}
