// طبقة الاتصال بالـ API (نفس الدومين، أو VITE_API_URL لو الـ API على دومين تاني)
const BASE = import.meta.env.VITE_API_URL || "/api";

export async function api(path, { method = "GET", body, form } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: form || (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw Object.assign(new Error("Can't reach the server. Check your connection."), { status: 0 });
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error || res.statusText), { status: res.status, data });
  return data;
}
