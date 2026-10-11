// استيراد منتج من ملف Excel: الاسم + Brief + جدول الأكواد (+ Notes)
// الخانات الستة المعروفة (Wattage / Chip / Driver / IP / Beam Angle / CCT) بتتعرف عليها من اسم العمود
// وبتتحول لفلاتر دايمًا، حتى لو فيها قيمة واحدة. أي عمود تاني بيتغير بيبقى فلتر برضه، والثابت بيروح Specifications.
// بنستنتج "شكل الكود" وبنتأكد بإعادة توليد كل كود ومقارنته بالأصلي؛ لو مفيش شكل واحد بيطلّعهم، بيتستوردوا كصفوف عادية.

import { blankTab, columnsOf, gridCodes, slugKey } from "./tech";

const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());
const digitsOf = (v) => String(v).match(/\d+(?:\.\d+)?/)?.[0] || "";
const num = (v) => parseFloat(digitsOf(v)) || 0;
const nice = (h) => { const t = clean(h); return t.length <= 3 ? t.toUpperCase() : t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); };
const tight = (v) => clean(v).replace(/^(\d+(?:\.\d+)?)\s+([A-Za-z°]+)$/, "$1$2");

const LABELS = /^(brief|specs?\s*table|notes?)$/i;

// الخانات المعروفة، بترتيب ظهورها في الفلاتر. test على اسم العمود، norm بتوحّد شكل القيمة
export const CANON = [
  { key: "wattage", label: "Wattage", test: /watt|^power|^w$/i, norm: (v) => (/^\d+(\.\d+)?$/.test(v) ? v + "W" : tight(v).replace(/w$/, "W")) },
  { key: "chip", label: "LED Chip / Module", test: /chip|module|source/i, norm: tight },
  { key: "driver", label: "Driver", test: /driver|ballast/i, norm: tight },
  { key: "ip", label: "IP", test: /^ip\b|^ip\d|ingress|protection/i, norm: (v) => (/^\d+$/.test(v) ? "IP" + v : /^ip\s?\d+$/i.test(v) ? v.toUpperCase().replace(/\s/g, "") : v) },
  { key: "beam", label: "Beam Angle", test: /beam|angle/i, norm: (v) => (/^\d+(\.\d+)?$/.test(v) ? v + "°" : tight(v).replace(/\s?(deg|degrees?)$/i, "°")) },
  { key: "cct", label: "CCT", test: /cct|colou?r\s*temp|kelvin|^k$|temperature/i, norm: (v) => (/^\d{4}$/.test(v) ? v + "K" : tight(v).replace(/k$/, "K")) },
];
const canonIndex = (key) => { const i = CANON.findIndex((c) => c.key === key); return i < 0 ? 99 : i; };

const related = (code, value) => {
  const d = digitsOf(value);
  return !!d && (code === d || code === d.padStart(code.length, "0") || d.startsWith(code));
};

// موضع ثابت (start, len) في الكود بيتحدد بيه قيمة العمود (علاقة 1-1)، من غير شرطة جواه
function findSpan(codes, values, taken) {
  const minLen = Math.min(...codes.map((c) => c.length));
  let best = null;
  for (const len of [2, 1, 3, 4]) {
    for (let s = 0; s + len <= minLen; s++) {
      if (taken.some(([a, b]) => s < b && s + len > a)) continue;
      const map = new Map(), rev = new Map();
      let ok = true;
      for (let i = 0; i < codes.length && ok; i++) {
        const sub = codes[i].substr(s, len), v = values[i];
        if (sub.includes("-")) { ok = false; break; }
        if (map.has(sub) && map.get(sub) !== v) ok = false; else map.set(sub, v);
        if (rev.has(v) && rev.get(v) !== sub) ok = false; else rev.set(v, sub);
      }
      if (!ok) continue;
      let score = 0;
      for (const [sub, v] of map) if (related(sub, v)) score++;
      if (!best || score > best.score) best = { s, len, score, map };
    }
  }
  return best;
}

const byNumber = (a, b) => num(a) - num(b) || a.localeCompare(b);
const SEG = /^([A-Za-z]*)(\d+(?:\.\d+)?)([A-Za-z°]*)$/;

// rows: [{ code, attrs }]، cols: [{ key, label }] (كل الأعمدة اللي هتبقى خانات)
function infer(rows, cols) {
  const codes = rows.map((r) => r.code);
  const distinct = (c) => new Set(rows.map((r) => r.attrs[c.key])).size;
  const hasDigits = (c) => rows.every((r) => /\d/.test(r.attrs[c.key]));
  const staticCols = [];
  const taken = [], spans = {};
  for (const c of cols) {
    if (distinct(c) < 2 || !hasDigits(c)) continue;
    const best = findSpan(codes, rows.map((r) => r.attrs[c.key]), taken);
    if (best) { spans[c.key] = best; taken.push([best.s, best.s + best.len]); }
  }
  let spanCols = cols.filter((c) => spans[c.key]).sort((a, b) => spans[a.key].s - spans[b.key].s);
  let end = 0, head0 = "";
  const headOf = (code) => {
    let out = "", pos = 0;
    for (const c of spanCols) { const sp = spans[c.key]; out += code.slice(pos, sp.s) + `{${c.key}}`; pos = sp.s + sp.len; }
    return out + code.slice(pos, end);
  };
  // لو بين المواضع الثابتة جزء بيتغير (LM / CR) نرجّع آخر موضع للذيل ونحاول تاني
  for (;;) {
    end = spanCols.length ? Math.max(...spanCols.map((c) => spans[c.key].s + spans[c.key].len)) : 0;
    head0 = headOf(codes[0]);
    if (!codes.some((c) => headOf(c) !== head0)) break;
    spanCols = spanCols.slice(0, -1);
  }
  const tailCols = cols.filter((c) => !spanCols.includes(c));

  const rawTails = codes.map((c) => c.slice(end));
  let lcp = rawTails[0];
  for (const t of rawTails) while (!t.startsWith(lcp)) lcp = lcp.slice(0, -1);
  const cut = rawTails.every((t) => t === rawTails[0]) ? rawTails[0].length : Math.max(lcp.lastIndexOf("-"), 0);
  const tails = rawTails.map((t) => t.slice(cut));
  if (tails.some((t) => t && !t.startsWith("-"))) return null;
  const segsOf = tails.map((t) => (t ? t.slice(1).split("-") : []));
  const used = segsOf.map(() => new Set());

  const slots = [];
  // 1) أعمدة فيها أرقام (10W / IP65 / 100° / 3000K): الرمز = الرقم + اللي بعده، والبادئة = الحروف اللي قبله
  const numeric = tailCols.filter(hasDigits), textCols = tailCols.filter((c) => !hasDigits(c));
  // رقم في الشيت مش هو نفس رقم الكود (3000K ← 30): بيتربط بالطريقة النصية تحت
  const deferred = [];
  for (const c of numeric) {
    const prefixes = new Set(), codeOf = new Map(), picked = [];
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      const v = rows[i].attrs[c.key], d = digitsOf(v);
      let at = -1, m = null;
      segsOf[i].forEach((sg, k) => { const mm = at < 0 && !used[i].has(k) && sg.match(SEG); if (mm && mm[2] === d) { at = k; m = mm; } });
      const got = m ? m[2] + m[3] : "";
      if (codeOf.has(v) && codeOf.get(v) !== got) return null;
      codeOf.set(v, got);
      if (m) { used[i].add(at); prefixes.add(m[1]); picked.push(at); found = true; }
    }
    if (!found) { deferred.push(c); continue; }
    if (prefixes.size !== 1) return null;
    slots.push({ key: c.key, label: c.label, prefix: "-" + [...prefixes][0], meanIdx: picked.reduce((a, b) => a + b, 0) / picked.length, values: [...codeOf.keys()].sort(byNumber).map((name) => ({ name, code: codeOf.get(name) })), optional: [...codeOf.values()].some((x) => x === "") });
  }

  // 2) أعمدة نصية (Tridonic ↔ TR): بنربط كل اسم برمز من الأجزاء اللي فاضلة في الكود، لو العلاقة 1-1
  const rest = () => segsOf.map((sg, i) => sg.map((s, k) => ({ s, k })).filter((x) => !used[i].has(x.k)));
  for (const c of [...textCols, ...deferred]) {
    const r = rest();
    const n = r[0]?.length || 0;
    if (r.some((x) => x.length !== n)) return null;
    let hit = -1, map = null;
    for (let k = 0; k < n && hit < 0; k++) {
      const m = new Map(), rev = new Map();
      let ok = true;
      for (let i = 0; i < rows.length && ok; i++) {
        const v = rows[i].attrs[c.key], sg = r[i][k].s;
        if (m.has(v) && m.get(v) !== sg) ok = false; else m.set(v, sg);
        if (rev.has(sg) && rev.get(sg) !== v) ok = false; else rev.set(sg, v);
      }
      if (ok) { hit = k; map = m; }
    }
    if (hit < 0) { if (distinct(c) < 2) { staticCols.push(c); continue; } return null; }
    const idx = [];
    for (let i = 0; i < rows.length; i++) { used[i].add(r[i][hit].k); idx.push(r[i][hit].k); }
    slots.push({ key: c.key, label: c.label, prefix: "-", meanIdx: idx.reduce((a, b) => a + b, 0) / idx.length, values: [...map].map(([name, code]) => ({ name, code })), optional: false });
  }

  // 3) اللي لسه فاضل في الكود من غير عمود في الشيت (زي TR / TCI): اسمه بييجي من الكود نفسه
  const r = rest();
  const nRest = r[0]?.length || 0;
  if (r.some((x) => x.length !== nRest)) return null;
  const extras = [];
  for (let k = 0; k < nRest; k++) {
    const names = [...new Set(r.map((x) => x[k].s))];
    const key = !slots.some((s) => s.key === "driver") && nRest === 1 ? "driver" : `option${k + 1}`;
    extras.push({ key, label: key === "driver" ? "Driver" : `Option ${k + 1}`, prefix: "-", meanIdx: r.reduce((a, x) => a + x[k].k, 0) / r.length, values: names.map((n) => ({ name: n, code: n })), perRow: r.map((x) => x[k].s), extra: true, optional: false });
  }

  const tail = [...slots, ...extras].sort((a, b) => a.meanIdx - b.meanIdx);
  const fields = [
    ...spanCols.map((c) => ({ key: c.key, label: c.label, optional: false, prefix: "", values: [...spans[c.key].map].map(([code, name]) => ({ name, code })).sort((a, b) => byNumber(a.name, b.name)) })),
    ...tail.map((t) => ({ key: t.key, label: t.label, optional: t.optional, prefix: t.prefix, values: t.values })),
    // خانات ثابتة مش جزء من الكود: بتظهر كفلتر وقيمتها في كل صف
    ...staticCols.map((c) => ({ key: c.key, label: c.label, optional: true, prefix: "", values: [...new Set(rows.map((r2) => r2.attrs[c.key]))].map((name) => ({ name, code: "" })) })),
  ];
  const tab = { ...blankTab(), mode: "grid", pattern: head0 + rawTails[0].slice(0, cut) + tail.map((t) => `{${t.key}}`).join(""), fields };

  for (let i = 0; i < rows.length; i++) {
    const sel = {};
    for (const f of fields) sel[f.key] = [f.key in rows[i].attrs ? rows[i].attrs[f.key] : extras.find((e) => e.key === f.key).perRow[i]];
    if (gridCodes(tab, sel).codes[0] !== rows[i].code) return null;
  }
  tab.fields.sort((a, b) => canonIndex(a.key) - canonIndex(b.key));
  return tab;
}

export function parseSheet(grid) {
  const g = grid.map((r) => (r || []).map(clean));
  const h = g.findIndex((r) => r.filter(Boolean).length >= 2 && r.some((c) => /^(product\s*)?code$/i.test(c)));
  if (h < 0) throw new Error("Couldn't find a table with a “Code” column in this file.");
  const head = g[h];
  const codeCol = head.findIndex((c) => /^(product\s*)?code$/i.test(c));
  const colIdx = head.map((c, i) => (c && i !== codeCol ? i : -1)).filter((i) => i >= 0);

  const data = [];
  for (let r = h + 1; r < g.length; r++) {
    const code = g[r][codeCol];
    if (!code) break;
    data.push({ code, cells: g[r] });
  }
  if (!data.length) throw new Error("The table has no product codes.");
  const tableEnd = h + data.length;
  const minC = Math.min(codeCol, ...colIdx), maxC = Math.max(codeCol, ...colIdx);

  const outside = [];
  g.forEach((row, r) => row.forEach((c, i) => { if (c && !(r >= h && r <= tableEnd && i >= minC && i <= maxC)) outside.push(c); }));
  const bi = outside.findIndex((c) => /^brief$/i.test(c));
  const ni = outside.findIndex((c) => /^notes?$/i.test(c));
  const title = outside.find((c) => !LABELS.test(c)) || "";
  let brief = "";
  if (bi >= 0) { const nx = outside[bi + 1]; if (nx && !LABELS.test(nx)) brief = nx; }
  const notes = ni >= 0 ? outside.slice(ni + 1).filter((c) => !LABELS.test(c)).map((n) => [n]) : [];

  const warnings = [];
  const cols = [], specs = [], usedKeys = new Set(), found = [];
  for (const i of colIdx) {
    const title2 = head[i];
    const raw = data.map((d) => d.cells[i] || "");
    if (!raw.some(Boolean)) continue;
    const canon = CANON.find((c) => !usedKeys.has(c.key) && c.test.test(title2));
    if (canon) {
      usedKeys.add(canon.key);
      found.push(canon.label);
      cols.push({ i, key: canon.key, label: canon.label, norm: canon.norm });
      continue;
    }
    let key = slugKey(title2) || `col${i}`;
    while (usedKeys.has(key)) key += "_";
    usedKeys.add(key);
    const distinctVals = [...new Set(raw.map(tight))].filter(Boolean);
    if (distinctVals.length > 1) cols.push({ i, key, label: nice(title2), norm: tight });
    else if (distinctVals.length === 1) specs.push([nice(title2), distinctVals[0]]);
  }
  const rows = data.map((d) => ({ code: d.code, attrs: Object.fromEntries(cols.map((c) => [c.key, c.norm(tight(d.cells[c.i] || ""))])) }));

  let tab = infer(rows, cols);
  let mode = "grid";
  if (tab) {
    if (tab.fields.some((f) => f.key === "driver" && !cols.some((c) => c.key === "driver")))
      warnings.push("The driver names (TR, TCI…) were taken from the codes — replace them with full names in the Technical specs tab.");
  } else {
    mode = "rows";
    warnings.push("The codes don't follow one pattern, so they were imported as a plain list of variants.");
    tab = {
      ...blankTab(), mode: "rows",
      fields: cols.map((c) => ({ key: c.key, label: c.label, optional: false, prefix: "", values: [...new Set(rows.map((r) => r.attrs[c.key]))].filter(Boolean).sort(byNumber).map((name) => ({ name, code: "" })) })).sort((a, b) => canonIndex(a.key) - canonIndex(b.key)),
      rows: rows.map((r) => ({ code: r.code, vals: Object.fromEntries(cols.map((c) => [c.key, r.attrs[c.key] ? [r.attrs[c.key]] : []])) })),
    };
  }
  for (const f of tab.fields) if (f.key === "chip" || f.key === "driver") f.group = "chipdriver";
  const missing = CANON.filter((c) => !tab.fields.some((f) => f.key === c.key)).map((c) => c.label);
  if (missing.length) warnings.push(`Not found in the sheet: ${missing.join(", ")}. Add them in the Technical specs tab if this product has them.`);
  return { title, brief, tab, specs, notes, mode, warnings, count: data.length, filters: columnsOf(tab).map((c) => c.label) };
}

export async function importXlsx(file) {
  const { readSheet } = await import("read-excel-file/browser");
  return parseSheet(await readSheet(file));
}
