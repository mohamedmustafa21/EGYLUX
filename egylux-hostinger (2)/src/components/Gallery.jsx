import { useEffect, useRef, useState } from "react";
import { IconChevron, IconZoom } from "./Icons";

// أول view = "overview" بيعرض كل الصور جنب بعض (زي التصميم)، بعده كل صورة لوحدها.
export default function Gallery({ images, alt, overview = true }) {
  const list = images.filter(Boolean);
  const hasOverview = overview && list.length > 1;
  const views = hasOverview ? ["all", ...list] : list;
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(null); // index داخل list
  const v = Math.min(i, Math.max(views.length - 1, 0));
  const go = (d) => setI((v + d + views.length) % views.length);
  const many = views.length > 1;
  const strip = list.slice(0, 3);
  const zoomAt = () => setZoom(views[v] === "all" ? 0 : list.indexOf(views[v]));

  if (!list.length) return <div className="gallery"><div className="gallery__main gallery__main--empty">No image</div></div>;

  return (
    <div className="gallery">
      <div className="gallery__main">
        {many && <button type="button" className="gallery__arrow gallery__arrow--prev" onClick={() => go(-1)} aria-label="Previous image"><IconChevron dir="left" /></button>}
        {views[v] === "all"
          ? <div className="gallery__all">{strip.map((s, n) => <img key={n} src={s} alt={n === 0 ? alt : ""} />)}</div>
          : <img className="gallery__img" src={views[v]} alt={alt} />}
        {many && <button type="button" className="gallery__arrow gallery__arrow--next" onClick={() => go(1)} aria-label="Next image"><IconChevron dir="right" /></button>}
        <button type="button" className="gallery__zoom" onClick={zoomAt} aria-label="Zoom image"><IconZoom /></button>
      </div>

      {many && (
        <div className="gallery__thumbs">
          {views.map((src, n) => (
            <button type="button" key={n} className={`${n === v ? "active" : ""} ${src === "all" ? "gallery__thumb-all" : ""}`} onClick={() => setI(n)} aria-label={src === "all" ? "All images" : `Image ${n + (hasOverview ? 0 : 1)}`}>
              {src === "all" ? strip.map((s, k) => <img key={k} src={s} alt="" loading="lazy" />) : <img src={src} alt="" loading="lazy" />}
            </button>
          ))}
        </div>
      )}
      {zoom !== null && <Lightbox list={list} start={zoom} alt={alt} onClose={() => setZoom(null)} />}
    </div>
  );
}

function Lightbox({ list, start, alt, onClose }) {
  const [n, setN] = useState(start);
  const ref = useRef(null);
  const step = (d) => setN((x) => (x + d + list.length) % list.length);
  useEffect(() => {
    ref.current?.focus();
    const k = (e) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); };
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, []); // eslint-disable-line
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button ref={ref} type="button" className="lightbox__x" onClick={onClose} aria-label="Close">×</button>
      {list.length > 1 && <button type="button" className="lightbox__nav lightbox__nav--l" onClick={() => step(-1)} aria-label="Previous"><IconChevron dir="left" size={32} /></button>}
      <img src={list[n]} alt={alt} />
      {list.length > 1 && <button type="button" className="lightbox__nav lightbox__nav--r" onClick={() => step(1)} aria-label="Next"><IconChevron dir="right" size={32} /></button>}
    </div>
  );
}
