import { useState } from "react";
import { Btn, Check, Field, IconBtn, Input, Select, Textarea, Toggle } from "../ui";
import { FIELD_PRESETS, blankField, blankTab, blankTech, gridCodes, patternKeys, slugKey } from "../../lib/tech";

const bulkText = (values, withCode) => values.map((v) => (withCode && v.code !== "" ? `${v.name} = ${v.code}` : v.name)).join("\n");
const parseBulk = (text, withCode) => text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
  const [name, ...rest] = l.split(/\s*[=\t]\s*/);
  return { name: name.trim(), code: withCode ? rest.join("=").trim() : "" };
});

// خانة واحدة: اسمها + قيمها (الاسم اللي العميل بيشوفه، والرمز اللي بيدخل في الكود)
function FieldEditor({ f, grid, inPattern, onChange, onKey, onRemove, onInsert }) {
  const [bulk, setBulk] = useState(null);
  const setVal = (i, patch) => onChange({ values: f.values.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  return (
    <div className="list-item">
      <IconBtn n="x" danger title="Remove this field" className="rm" onClick={onRemove} />
      <div className="grid g3" style={{ marginRight: 40 }}>
        <Field label="Field name (column title)"><Input sm value={f.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="e.g. Wattage" /></Field>
        {grid && <Field label="Key in pattern" hint={inPattern ? "" : "Not in the pattern yet"}><Input sm mono value={f.key} onChange={(e) => onKey(slugKey(e.target.value))} /></Field>}
        {grid && <Field label="Prefix before the code" hint="e.g. “-” or “-IP”"><Input sm mono value={f.prefix} onChange={(e) => onChange({ prefix: e.target.value })} placeholder="-" /></Field>}
      </div>
      <div style={{ margin: "2px 0 8px" }}>
        <Field label="Column on the site" hint="Fields set to “Chip / Driver” share one column and show as “Lumileds / Tridonic”">
          <Select value={f.group || ""} onChange={(e) => onChange({ group: e.target.value })}><option value="">Its own column</option><option value="chipdriver">Shared “Chip/ Driver” column</option></Select>
        </Field>
      </div>
      {grid && (
        <div className="row" style={{ gap: 10, flexWrap: "wrap", margin: "2px 0 8px" }}>
          <Check checked={f.optional} onChange={(v) => onChange({ optional: v })}>Optional — appears in the code only after the customer chooses it (otherwise shows **)</Check>
          {!inPattern && <Btn sm onClick={onInsert}>Add {`{${f.key}}`} to pattern</Btn>}
        </div>
      )}
      <div className="row awrap" style={{ justifyContent: "space-between", margin: "4px 0" }}>
        <b className="small">Values</b>
        <Btn sm onClick={() => setBulk(bulk === null ? bulkText(f.values, grid) : null)}>{bulk === null ? "Bulk edit" : "Done"}</Btn>
      </div>
      {bulk !== null ? (
        <>
          <Textarea className="textarea mono" rows={Math.min(Math.max(f.values.length + 1, 4), 12)} value={bulk} onChange={(e) => { setBulk(e.target.value); onChange({ values: parseBulk(e.target.value, grid) }); }}
            placeholder={grid ? "One per line:  name = code\n7W = 07\n10W = 10\nIP54 =" : "One value per line"} />
          <p className="muted small" style={{ margin: "4px 0 0" }}>{grid ? "Format: name = code. Leave the code empty if nothing should appear in the code (e.g. IP54)." : "One value per line."}</p>
        </>
      ) : (
        <>
          {f.values.length > 0 && grid && <div className="kv" style={{ gridTemplateColumns: "1fr 1fr 32px", gap: 8, fontSize: 12 }} aria-hidden="true"><span className="muted">Name shown to the customer</span><span className="muted">Code</span><span /></div>}
          {f.values.map((v, i) => (
            <div className="kv" key={i} style={{ gridTemplateColumns: grid ? "1fr 1fr 32px" : "1fr 32px", gap: 8 }}>
              <Input sm value={v.name} onChange={(e) => setVal(i, { name: e.target.value })} placeholder={f.key === "driver" ? "e.g. Tridonic" : "e.g. 10W"} />
              {grid && <Input sm mono value={v.code} onChange={(e) => setVal(i, { code: e.target.value })} placeholder="(empty)" />}
              <IconBtn n="x" danger title="Remove" onClick={() => onChange({ values: f.values.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <div><Btn sm icon="plus" onClick={() => onChange({ values: [...f.values, { name: "", code: "" }] })}>Add value</Btn></div>
        </>
      )}
    </div>
  );
}

// محرر "Technical Specs": تابات (LED Chip / Module، LED Lamp …) وكل تاب فيه خانات وقيم، والكود بيتبني من الاختيار
export default function TechEditor({ value, onChange, onImport }) {
  const [ti, setTi] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  if (!value) {
    return (
      <div>
        <p className="muted small" style={{ marginTop: 0 }}>The “Technical Specs” section: a code builder — the customer picks wattage, chip, driver, color… and the product code updates.</p>
        <Btn icon="plus" onClick={() => onChange(blankTech())}>Add technical specs</Btn>
      </div>
    );
  }
  const tabs = value.tabs;
  const i = Math.min(ti, Math.max(tabs.length - 1, 0));
  const tab = tabs[i];
  const grid = tab?.mode === "grid";
  const setTab = (patch) => onChange({ ...value, tabs: tabs.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const setField = (n, patch) => setTab({ fields: tab.fields.map((f, j) => (j === n ? { ...f, ...patch } : f)) });
  const addTab = () => { onChange({ ...value, tabs: [...tabs, blankTab("New tab")] }); setTi(tabs.length); };
  const delTab = () => { onChange({ ...value, tabs: tabs.filter((_, j) => j !== i) }); setTi(0); };

  const keys = tab ? new Set(tab.fields.map((f) => f.key)) : new Set();
  const uniqueKey = (base) => { let k = base || "field", n = 2; while (keys.has(k)) k = `${base || "field"}${n++}`; return k; };
  const addField = (preset) => {
    const f = preset ? blankField({ ...preset, key: uniqueKey(preset.key) }) : blankField({ key: uniqueKey("field"), label: "New field", prefix: grid ? "-" : "" });
    setTab({ fields: [...tab.fields, f], ...(grid ? { pattern: (tab.pattern || "") + `{${f.key}}` } : {}) });
  };
  const renameKey = (n, nk) => {
    const old = tab.fields[n].key;
    if (!nk || nk === old || keys.has(nk)) return;
    setTab({
      fields: tab.fields.map((f, j) => (j === n ? { ...f, key: nk } : f)),
      pattern: tab.pattern.split(`{${old}}`).join(`{${nk}}`),
      rows: tab.rows.map((r) => { const { [old]: v, ...rest } = r.vals; return { ...r, vals: { ...rest, [nk]: v || [] } }; }),
    });
  };
  const removeField = (n) => {
    const f = tab.fields[n];
    setTab({ fields: tab.fields.filter((_, j) => j !== n), pattern: tab.pattern.split(`{${f.key}}`).join(""), rows: tab.rows.map((r) => { const { [f.key]: _drop, ...rest } = r.vals; return { ...r, vals: rest }; }) });
  };
  const setMode = (mode) => setTab({ mode });

  const used = patternKeys(tab?.pattern);
  const unknown = used.filter((k) => !keys.has(k));
  const sample = grid ? gridCodes(tab, {}, 1).codes[0] : "";
  const firstSel = grid ? Object.fromEntries(tab.fields.map((f) => [f.key, f.values[0] ? [f.values[0].name] : []])) : {};
  const filled = grid ? gridCodes(tab, firstSel, 1).codes[0] : "";

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setNote(null);
    try {
      const { importXlsx } = await import("../../lib/techImport");
      const r = await importXlsx(file);
      onImport?.(r);
      setNote({ ok: true, text: `Imported ${r.count} codes → ${r.mode === "grid" ? `${r.tab.fields.length} fields built from the codes` : "plain list of variants"}.`, warnings: r.warnings });
      setTi(0);
    } catch (err) { setNote({ ok: false, text: err.message || "Couldn't read this file." }); }
    setBusy(false);
  };

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <Toggle checked={value.showScale} onChange={(v) => onChange({ ...value, showScale: v })} label="Show the color-temperature scale (2200 K → 6500 K)" />
        <div className="row" style={{ gap: 8 }}>
          <label className="btn" style={{ cursor: "pointer" }}>{busy ? "Reading…" : "Import from Excel"}<input type="file" hidden accept=".xlsx" onChange={pickFile} disabled={busy} /></label>
          <Btn sm variant="danger" onClick={() => onChange(null)}>Remove technical specs</Btn>
        </div>
      </div>
      {note && (
        <div className={`note ${note.ok ? "" : "warn"}`}>
          {note.text}
          {note.warnings?.map((w, n) => <div key={n} className="small" style={{ marginTop: 4 }}>• {w}</div>)}
          {note.ok && <div className="small" style={{ marginTop: 4 }}>Review everything, then press Save.</div>}
        </div>
      )}

      <div className="atabs" role="tablist" aria-label="Technical tabs">
        {tabs.map((t, j) => <button key={j} type="button" role="tab" aria-selected={j === i} className={j === i ? "on" : ""} onClick={() => setTi(j)}>{t.label || "Untitled"} <span className="muted small">({t.mode === "grid" ? t.fields.length + " fields" : t.rows.length + " rows"})</span></button>)}
        <button type="button" onClick={addTab}>+ Add tab</button>
      </div>

      {tab && (
        <>
          <div className="grid g3">
            <Field label="Tab name"><Input value={tab.label} onChange={(e) => setTab({ label: e.target.value })} placeholder="LED Chip / Module" /></Field>
            <Field label="Tab icon"><Select value={tab.icon} onChange={(e) => setTab({ icon: e.target.value })}><option value="chip">Chip</option><option value="bulb">Bulb</option></Select></Field>
            <Field label="Table type"><Select value={tab.mode} onChange={(e) => setMode(e.target.value)}><option value="grid">Code builder (recommended)</option><option value="rows">Fixed list of variants</option></Select></Field>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <p className="muted small" style={{ margin: 0 }}>Tabs with no content are hidden on the site. “LED Chip / Module” and “LED Lamp” show on the same page, each with its own lists and code.</p>
            {tabs.length > 1 && <Btn sm variant="danger" onClick={delTab}>Delete this tab</Btn>}
          </div>

          {grid && (
            <div className="list-item">
              <Field label="Code pattern" hint="Write the fixed text as it is and put each changing part in {braces} using the field key.">
                <Input mono value={tab.pattern} onChange={(e) => setTab({ pattern: e.target.value })} placeholder="BLK3021-{wattage}-{chip}-{driver}-{cct}" />
              </Field>
              {unknown.length > 0 && <div className="note warn" style={{ margin: "6px 0" }}>No field with the key {unknown.map((k) => `{${k}}`).join(", ")} — add it below or fix the pattern.</div>}
              {tab.pattern && unknown.length === 0 && (
                <p className="small" style={{ margin: "6px 0 0" }}>Nothing chosen: <code className="mono">{sample}</code> &nbsp;·&nbsp; first value of each: <code className="mono">{filled}</code></p>
              )}
            </div>
          )}

          {tab.fields.map((f, n) => (
            <FieldEditor key={n} f={f} grid={grid} inPattern={used.includes(f.key)} onChange={(p) => setField(n, p)} onKey={(k) => renameKey(n, k)} onRemove={() => removeField(n)} onInsert={() => setTab({ pattern: (tab.pattern || "") + `{${f.key}}` })} />
          ))}
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            <Btn sm icon="plus" onClick={() => addField()}>Add field</Btn>
            {FIELD_PRESETS.filter((p) => !keys.has(p.key)).map((p) => <Btn key={p.key} sm onClick={() => addField(p)}>+ {p.label}</Btn>)}
          </div>

          {!grid && (
            <>
              <p className="muted small" style={{ margin: "8px 0 0" }}>Variants: one row per code. Separate several values in a cell with commas (e.g. <code>3000K, 4000K</code>).</p>
              {tab.rows.map((r, n) => (
                <div className="list-item" key={n}>
                  <div className="row" style={{ position: "absolute", top: 8, right: 8, gap: 2 }}>
                    <IconBtn n="copy" title="Duplicate" onClick={() => setTab({ rows: [...tab.rows.slice(0, n + 1), { code: r.code, vals: { ...r.vals } }, ...tab.rows.slice(n + 1)] })} />
                    <IconBtn n="x" danger title="Remove" onClick={() => setTab({ rows: tab.rows.filter((_, j) => j !== n) })} />
                  </div>
                  <div className="grid g3" style={{ marginRight: 64 }}>
                    <Field label="Product code"><Input sm mono value={r.code} onChange={(e) => setTab({ rows: tab.rows.map((x, j) => (j === n ? { ...x, code: e.target.value } : x)) })} placeholder="BLK3021-10W-LM-TR-**" /></Field>
                    {tab.fields.map((f) => (
                      <Field key={f.key} label={f.label || f.key}>
                        <Input sm defaultValue={(r.vals[f.key] || []).join(", ")} key={(r.vals[f.key] || []).join("|")}
                          onBlur={(e) => {
                            const names = e.target.value.split(",").map((x) => x.trim()).filter(Boolean);
                            const known = new Set(f.values.map((v) => v.name));
                            setTab({
                              rows: tab.rows.map((x, j) => (j === n ? { ...x, vals: { ...x.vals, [f.key]: names } } : x)),
                              fields: tab.fields.map((g) => (g.key === f.key ? { ...g, values: [...g.values, ...names.filter((nm) => !known.has(nm)).map((name) => ({ name, code: "" }))] } : g)),
                            });
                          }} />
                      </Field>
                    ))}
                  </div>
                </div>
              ))}
              <div><Btn sm icon="plus" onClick={() => setTab({ rows: [...tab.rows, { code: "", vals: Object.fromEntries(tab.fields.map((f) => [f.key, []])) }] })}>Add variant</Btn></div>
            </>
          )}
        </>
      )}
    </div>
  );
}
