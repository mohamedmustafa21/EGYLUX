// جدول الـ Technical Specs — شكل البيانات + مولّد الأكواد (مشترك بين الموقع والداش بورد)
//
// tech = { showScale, tabs: [ tab ] }
//
// tab (mode "grid" — الكود بيتبني من اختيارات العميل):
//   { label, icon: "chip"|"bulb", mode: "grid",
//     pattern: "DOW{wattage}45{cct}CRLED{driver}{ip}",
//     fields: [ { key, label, optional, prefix, values: [ { name, code } ] } ],
//     rows: [] }
//   - name  = الاسم اللي العميل بيشوفه (7W / Tridonic / 3000K)
//   - code  = الرمز اللي بيدخل في الكود (07 / TR / 30)
//   - prefix = بيتكتب قبل الرمز (مثلاً "-" أو "-IP")، ومبيظهرش لو الرمز فاضي (زي IP54)
//   - optional = الخانة مبتظهرش في الكود إلا لما العميل يختار منها. غير كده بتظهر ** لحد ما يختار
//
// tab (mode "rows" — قايمة variants جاهزة، العميل بيفلتر عليها):
//   { ..., mode: "rows", fields: [ { key, label, values: [ { name } ] } ], rows: [ { code, vals: { [key]: [name] } } ] }
//
// الشكل القديم { tabs: [ { rows: [ { code, wattage, chip, ip, beam, cct } ] } ] } وقبله { cctList, chips, rows }
// بيتحوّلوا تلقائيًا (normalizeTech) لـ mode "rows" من غير ما تحتاج تعدّل الداتا.

export const CCT_OPTIONS = ["2200K", "3000K", "4000K", "5700K", "6000K", "6500K"];

const DOT = { "2200K": "#ff8a1f", "2700K": "#ff9f2e", "3000K": "#ffb340", "3500K": "#ffd27a", "4000K": "#ffe6a6", "4500K": "#fff0c4", "5000K": "#fff6de", "5700K": "#ffffff", "6000K": "#eef4ff", "6500K": "#cfe0ff" };
export const cctColor = (k) => DOT[String(k).toUpperCase().replace(/\s/g, "")] || "#e6e6e6";
export const isCctName = (n) => /^\d{4}\s?K$/i.test(String(n).trim());

// مواضع العلامات على الشريط (% من العرض) زي ما هي في Figma
export const SCALE = [
  { k: "2200", at: 6 }, { k: "3000", at: 24 }, { k: "4000", at: 42 },
  { k: "5700", at: 62.4 }, { k: "6000", at: 80.4 }, { k: "6500", at: 93.3 },
];

export const NONE = "**";
export const MAX_LINES = 12;

export const slugKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export const blankField = (o = {}) => ({ key: "", label: "", optional: false, prefix: "", group: "", values: [], ...o });
export const blankTab = (label = "LED Chip / Module", icon = "chip") => ({ label, icon, mode: "grid", pattern: "", fields: [], rows: [] });
export const blankTech = () => ({ showScale: true, tabs: [blankTab(), blankTab("LED Lamp", "bulb")] });

// حقول جاهزة للإضافة بضغطة
export const FIELD_PRESETS = [
  { key: "wattage", label: "Wattage", optional: false, prefix: "" },
  { key: "chip", label: "LED Chip / Module", optional: false, prefix: "-", group: "chipdriver" },
  { key: "driver", label: "Driver", optional: false, prefix: "-", group: "chipdriver" },
  { key: "cct", label: "CCT", optional: false, prefix: "" },
  { key: "ip", label: "IP", optional: true, prefix: "-IP" },
  { key: "beam", label: "Beam Angle", optional: true, prefix: "-" },
];

const val = (v) => (typeof v === "string" ? { name: v, code: "" } : { name: String(v?.name ?? ""), code: String(v?.code ?? "") });
// group: خانات بتتعرض في عمود واحد (Chip + Driver ← "Chip / Driver" وفي الصف "Lumileds / Tridonic")
export const GROUPS = { chipdriver: "Chip/ Driver" };
const field = (f) => {
  const key = f.key || slugKey(f.label) || "field";
  return { key, label: f.label || "", optional: !!f.optional, prefix: f.prefix || "", group: f.group ?? (key === "chip" || key === "driver" ? "chipdriver" : ""), values: (f.values || []).map(val) };
};

// أعمدة الجدول: كل خانة عمود، إلا الخانات اللي ليها نفس الـ group فبتتجمع في عمود واحد (في مكان أول واحدة)
export function columnsOf(tab) {
  const cols = [];
  for (const f of tab.fields) {
    const at = f.group ? cols.find((c) => c.group === f.group) : null;
    if (at) at.fields.push(f); else cols.push({ id: f.group || f.key, group: f.group || "", fields: [f] });
  }
  return cols.map((c) => ({ ...c, label: c.fields.length > 1 ? GROUPS[c.group] || c.fields.map((f) => f.label).join(" / ") : c.fields[0].label }));
}
const arr = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean) : v ? [String(v)] : []);

const LEGACY = [["wattage", "Wattage"], ["chip", "Chip / Driver"], ["ip", "IP"], ["beam", "Beam Angle"], ["cct", "CCT"]];

function fromLegacyRows(label, icon, rows = []) {
  const fields = LEGACY.map(([key, l]) => ({ key, label: l, optional: false, prefix: "", group: "", values: [...new Set(rows.flatMap((r) => arr(r[key])))].map((name) => ({ name, code: "" })) })).filter((f) => f.values.length);
  return { label, icon, mode: "rows", pattern: "", fields, rows: rows.map((r) => ({ code: r.code || "", vals: Object.fromEntries(fields.map((f) => [f.key, arr(r[f.key])])) })) };
}

function normalizeTab(x) {
  const icon = x.icon === "bulb" ? "bulb" : "chip";
  if (x.mode === "grid" || x.mode === "rows") {
    const fields = (x.fields || []).map(field);
    return {
      label: x.label || "", icon, mode: x.mode, pattern: x.pattern || "", fields,
      rows: (x.rows || []).map((r) => ({ code: r.code || "", vals: Object.fromEntries(fields.map((f) => [f.key, arr(r.vals?.[f.key])])) })),
    };
  }
  return fromLegacyRows(x.label || "", icon, x.rows || []);
}

export function normalizeTech(t) {
  if (!t || typeof t !== "object") return null;
  if (Array.isArray(t.tabs)) return { showScale: t.showScale !== false, tabs: t.tabs.map(normalizeTab) };
  // الشكل القديم جدًا
  const chips = t.chips?.length ? t.chips : ["LED Chip / Module"];
  return {
    showScale: true,
    tabs: chips.map((label, i) => fromLegacyRows(label, /lamp|bulb/i.test(label) ? "bulb" : "chip", i === 0 ? t.rows || [] : [])),
  };
}

export const tabHasContent = (t) => (t.mode === "grid" ? !!t.pattern.trim() && t.fields.length > 0 : t.rows.length > 0);
export const techHasRows = (t) => !!normalizeTech(t)?.tabs.some(tabHasContent);

const TOKEN = /\{([a-z0-9_]+)\}/gi;
export const patternKeys = (pattern) => [...new Set([...String(pattern || "").matchAll(TOKEN)].map((m) => m[1]))];

// sel = { [key]: [name, …] } → الأكواد الناتجة (سطر لكل تركيبة)، لحد limit
export function gridCodes(tab, sel = {}, limit = MAX_LINES) {
  const byKey = Object.fromEntries(tab.fields.map((f) => [f.key, f]));
  const keys = patternKeys(tab.pattern).filter((k) => byKey[k]);
  const choices = keys.map((k) => {
    const chosen = (sel[k] || []).map((n) => byKey[k].values.find((v) => v.name === n)).filter(Boolean);
    // خانة إجبارية ليها قيمة واحدة بس (زي Cree) بتتحط لوحدها من غير اختيار
    return chosen.length ? chosen : byKey[k].values.length === 1 && !byKey[k].optional ? [byKey[k].values[0]] : [null];
  });
  const total = choices.reduce((n, c) => n * c.length, 1);
  const out = [], items = [], seen = new Set();
  for (let n = 0; n < total && out.length < limit; n++) {
    let rem = n;
    const pick = {};
    for (let i = keys.length - 1; i >= 0; i--) { pick[keys[i]] = choices[i][rem % choices[i].length]; rem = Math.floor(rem / choices[i].length); }
    const code = tab.pattern.replace(TOKEN, (_, k) => {
      const f = byKey[k];
      if (!f) return "";
      const v = pick[k];
      if (!v) return f.optional ? "" : f.prefix + NONE;
      return v.code === "" ? "" : f.prefix + v.code;
    });
    if (!seen.has(code)) {
      seen.add(code);
      out.push(code);
      items.push({ code, complete: !code.includes(NONE), picks: Object.fromEntries(keys.map((k) => [k, pick[k]?.name || ""])) });
    }
  }
  return { codes: out, items, total, more: Math.max(total - out.length, 0) };
}

export function filterRows(tab, sel = {}) {
  return tab.rows.filter((r) => tab.fields.every((f) => !sel[f.key]?.length || (r.vals[f.key] || []).some((n) => sel[f.key].includes(n))));
}

export function techFirstCode(t) {
  const tab = normalizeTech(t)?.tabs.find(tabHasContent);
  if (!tab) return "";
  return tab.mode === "grid" ? gridCodes(tab, {}, 1).codes[0] || "" : tab.rows.find((r) => r.code)?.code || "";
}
