import { useEffect, useRef, useState } from "react";
import { IconChevron, IconInfo, IconShield, IconSunAngle, TECH_ICONS } from "./Icons";
import { SCALE, columnsOf, filterRows, gridCodes, normalizeTech, patternKeys, tabHasContent } from "../lib/tech";

function ColorScale() {
  return (
    <div className="cscale">
      <p className="cscale__title">Color Temperature (Kelvin)</p>
      <div className="cscale__bar">
        <div className="cscale__grad" />
        {SCALE.map((s) => (
          <div key={s.k} className="cscale__tick" style={{ left: `${s.at}%` }}>
            <i className="cscale__dot" /><i className="cscale__line" /><span>{s.k} K</span>
          </div>
        ))}
      </div>
      <div className="cscale__zones"><span className="warm">Warm White</span><span className="neutral">Neutral White</span><span className="cool">Cool Daylight</span></div>
    </div>
  );
}

// عمود له سهم: بيفتح list فيها checkboxes وزرار Clear. العمود المجمّع (Chip / Driver) فيه قسمين
function FilterHead({ label, sections, sel, onPick, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const k = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);
  const count = sections.reduce((n, s2) => n + (sel[s2.key]?.length || 0), 0);
  const toggle = (key, name) => { const cur = sel[key] || []; onPick(key, cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]); };
  return (
    <div className="fh" ref={ref}>
      <button type="button" className={`fh__btn ${count ? "on" : ""}`} onClick={() => setOpen(!open)} aria-haspopup="true" aria-expanded={open}>
        {label}{count > 0 && <span className="fh__count">{count}</span>}<IconChevron dir={open ? "up" : "down"} />
      </button>
      {open && (
        <div className="fh__menu" role="group" aria-label={label}>
          <div className="fh__top"><b>{label}</b><button type="button" className="fh__clear" disabled={!count} onClick={onClear}>Clear</button></div>
          {sections.map((s2) => (
            <div key={s2.key}>
              {sections.length > 1 && <p className="fh__sec">{s2.title}</p>}
              <ul>
                {s2.options.map((o) => (
                  <li key={o.name}><label><input type="checkbox" checked={(sel[s2.key] || []).includes(o.name)} onChange={() => toggle(s2.key, o.name)} /><span>{o.name}</span></label></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// خلية العمود: لو العمود فيه خانتين بتتكتب "Lumileds / Tridonic"
function Cell({ col, get }) {
  const parts = col.fields.map((f) => ({ f, ...get(f) }));
  if (col.fields.length > 1) return <span className="tech__vals">{parts.map((x) => (x.names.length ? x.names.join(", ") : x.none || "—")).join("/")}</span>;
  const { f, names, none = "—" } = parts[0];
  if (!names.length) return <span className="tech__none">{none}</span>;
  if (f.key === "ip") return <span className="tech__ip"><IconShield size={16} />{names.map((n) => n.replace(/^IP\s?/i, "")).join(", ")}</span>;
  if (f.key === "beam") return <span className="tech__beam"><IconSunAngle />{names.join(", ")}</span>;
  return <span className="tech__vals">{names.join(", ")}</span>;
}

// selected = أكواد العميل المختارة (بتتحفظ فوق في صفحة المنتج)، onQuote = ضغطة Get Quotation (فوق بتقرر تفتح الفورم ولا رسالة التنبيه)
export default function TechSpecs({ tech: raw, showScale = true, selected = [], onSelect, onQuote, quoteLabel = "Get Quotation" }) {
  const tech = normalizeTech(raw);
  const tabs = (tech?.tabs || []).filter(tabHasContent);
  const [ti, setTi] = useState(0);
  const [sels, setSels] = useState({});
  const allRef = useRef(null);
  if (!tabs.length) return null;
  const idx = Math.min(ti, tabs.length - 1);
  const tab = tabs[idx];
  const grid = tab.mode === "grid";
  const cols = columnsOf(tab);
  const sel = sels[idx] || {};
  const set = (k) => (v) => setSels((x) => ({ ...x, [idx]: { ...(x[idx] || {}), [k]: v } }));
  const picked = Object.values(sel).some((v) => v?.length);

  const g = grid ? gridCodes(tab, sel) : null;
  const inPattern = new Set(patternKeys(tab.pattern));
  const lines = grid
    ? g.items.map((it) => ({
      code: it.code, ok: it.complete,
      // خانة مش جزء من الكود (قيمة ثابتة للمنتج) بتظهر قيمتها في كل صف
      cells: (f) => (inPattern.has(f.key) ? { names: it.picks[f.key] ? [it.picks[f.key]] : [], none: f.optional ? "—" : "**" } : { names: f.values.map((v) => v.name) }),
    }))
    : filterRows(tab, sel).map((r) => ({ code: r.code, ok: !!r.code, cells: (f) => ({ names: r.vals[f.key] || [] }) }));
  const pickable = lines.filter((l) => l.ok).map((l) => l.code);
  const nSel = pickable.filter((c) => selected.includes(c)).length;
  const toggle = (c) => onSelect?.(selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c]);
  const toggleAll = () => onSelect?.(nSel === pickable.length ? selected.filter((c) => !pickable.includes(c)) : [...new Set([...selected, ...pickable])]);
  if (allRef.current) allRef.current.indeterminate = nSel > 0 && nSel < pickable.length;
  const ready = selected.length > 0;

  return (
    <section className="tech" id="tech-specs">
      <div className="tech__title"><h2>Technical Specs</h2></div>
      {showScale && tech.showScale && <ColorScale />}

      <div className="tech__table">
        <div className="tech__tabs">
          <div className="seg" role="tablist">
            {tabs.map((t, n) => {
              const I = TECH_ICONS[t.icon] || TECH_ICONS.chip;
              return <button type="button" role="tab" key={n} aria-selected={n === idx} className={n === idx ? "on" : ""} onClick={() => setTi(n)}><I size={n === idx ? 20 : 16} />{t.label}</button>;
            })}
          </div>
          <div className="tech__quote">
            <button type="button" className={`tech__q ${ready ? "" : "is-inactive"}`} aria-disabled={!ready} onClick={() => onQuote?.()}
              title={ready ? "" : "Tick the codes you need first"}>
              {quoteLabel}{!ready && <IconInfo />}{ready && <b className="tech__qn">{selected.length}</b>}
            </button>
          </div>
        </div>

        <div className="tech__scroll">
          <div className="tech__head" style={{ "--n": cols.length }}>
            <span className="tech__codehead">
              <input ref={allRef} type="checkbox" className="tech__chk" aria-label="Select all codes" disabled={!pickable.length} checked={pickable.length > 0 && nSel === pickable.length} onChange={toggleAll} />
              Product Code
            </span>
            {cols.map((c) => (
              <FilterHead key={c.id} label={c.label} sel={sel} sections={c.fields.map((f) => ({ key: f.key, title: f.label, options: f.values }))}
                onPick={(k, v) => set(k)(v)} onClear={() => setSels((x) => ({ ...x, [idx]: Object.fromEntries(Object.entries(x[idx] || {}).filter(([k]) => !c.fields.some((f) => f.key === k))) }))} />
            ))}
          </div>

          {lines.map((l) => {
            const on = selected.includes(l.code);
            return (
              <label className={`tech__row ${on ? "is-on" : ""} ${l.ok ? "" : "is-off"}`} key={l.code} style={{ "--n": cols.length }} title={l.ok ? "" : "Choose all the options in the columns above to complete this code"}>
                <span className="tech__codecell">
                  <input type="checkbox" className="tech__chk" disabled={!l.ok} checked={on} onChange={() => toggle(l.code)} aria-label={`Select ${l.code}`} />
                  <span className="mono">{l.code}</span>
                </span>
                {cols.map((c) => <Cell key={c.id} col={c} get={l.cells} />)}
              </label>
            );
          })}
          {grid && g.more > 0 && <p className="tech__more">+{g.more} more — narrow the columns above to pick them.</p>}
          {!lines.length && <p className="tech__empty">No variants match this selection. <button type="button" onClick={() => setSels((x) => ({ ...x, [idx]: {} }))}>Clear all</button></p>}
        </div>

        <div className="tech__tools">
          <span className="tech__hint">{ready ? <><b>{selected.length}</b> code{selected.length > 1 ? "s" : ""} selected</> : grid && !picked ? <>Choose from the columns above, then tick the codes you need.</> : "Tick the codes you need."}</span>
          <div className="tech__btns">
            {picked && <button type="button" className="tech__btn" onClick={() => setSels((x) => ({ ...x, [idx]: {} }))}>Clear columns</button>}
            {ready && <button type="button" className="tech__btn" onClick={() => onSelect?.([])}>Clear selection</button>}
          </div>
        </div>
      </div>
    </section>
  );
}
