import { useState } from "react";
import { IconChevron, IconDownload } from "./Icons";

// files = [{ label, url }] من الداش بورد (Product → Downloads)
export default function DownloadMenu({ files = [], label = "Download Files" }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState([]);
  const labels = files.map((f) => f.label || "File");
  const toggle = (o) => setSel(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
  const all = () => setSel(sel.length === files.length ? [] : files.map((_, i) => i));

  const go = () => {
    sel.forEach((i, n) => setTimeout(() => {
      const a = document.createElement("a");
      a.href = files[i].url; a.target = "_blank"; a.rel = "noopener"; a.download = "";
      document.body.appendChild(a); a.click(); a.remove();
    }, n * 350));
    setOpen(false);
  };

  return (
    <div className="dl">
      <button type="button" className="btn-ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
        <IconDownload />
        <span>{label}</span>
        <IconChevron dir={open ? "up" : "down"} />
      </button>
      {open && (
        <div className="dl__menu">
          {files.length > 1 && <label><input type="checkbox" checked={sel.length === files.length} onChange={all} /> Select All</label>}
          {labels.map((o, i) => (
            <label key={i}><input type="checkbox" checked={sel.includes(i)} onChange={() => toggle(i)} /> {o}</label>
          ))}
          <button className="dl__go" disabled={!sel.length} onClick={go}>
            <IconDownload size={20} /> Download
          </button>
        </div>
      )}
    </div>
  );
}
