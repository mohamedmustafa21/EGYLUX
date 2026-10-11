import { useEffect, useState } from "react";
import { api } from "../lib/api";

const cache = {};

// محتوى قابل للتعديل من الداش بورد — بيرجع الـ fallback فورًا وبعدها يدمج اللي جاي من الـ API
export function useContent(key, fallback = {}) {
  const [data, setData] = useState(cache[key] || null);
  useEffect(() => {
    let alive = true;
    api(`/public/content/${key}`).then((d) => { cache[key] = d; alive && setData(d); }).catch(() => {});
    return () => { alive = false; };
  }, [key]);
  return { ...fallback, ...(data || {}) };
}
