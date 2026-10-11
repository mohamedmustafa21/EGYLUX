import { useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { arrowIcon } from "../data/products";

const COPIES = 5; // نسخ متطابقة؛ بنقعد في النص ونرجّع المكان بعد ما الـ scroll يقف، فمفيش نهاية

// Related Products: شريط أفقي بيلف بلا نهاية (سحب باللمس/التراك باد + أسهم)
export default function LoopCarousel({ items = [] }) {
  const ref = useRef(null);
  const timer = useRef(0);
  const loop = items.length > 1;

  const metrics = useCallback(() => {
    const el = ref.current, kids = el?.children;
    if (!el || !kids || kids.length < 2) return null;
    const step = kids[1].offsetLeft - kids[0].offsetLeft;
    return { el, step, set: step * items.length };
  }, [items.length]);

  // ابدأ من النسخة اللي في النص
  useEffect(() => {
    if (!loop) return;
    const place = () => { const m = metrics(); if (m) m.el.scrollLeft = m.set * Math.floor(COPIES / 2); };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [loop, metrics, items]);

  const settle = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const m = metrics();
      if (!m) return;
      const mid = m.set * Math.floor(COPIES / 2);
      const off = ((m.el.scrollLeft - mid) % m.set + m.set) % m.set; // نفس الموضع جوا النسخة اللي في النص
      const target = mid + off;
      if (Math.abs(target - m.el.scrollLeft) > 1) m.el.scrollLeft = target;
    }, 140);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (dir) => {
    const m = metrics();
    if (!m) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    m.el.scrollBy({ left: dir * m.step, behavior: reduce ? "auto" : "smooth" });
  };

  const list = loop ? Array.from({ length: COPIES }, () => items).flat() : items;

  return (
    <div className="loopc" role="region" aria-roledescription="carousel" aria-label="Related products">
      {loop && <button type="button" className="loopc__nav loopc__nav--prev" aria-label="Previous" onClick={() => go(-1)}>‹</button>}
      <div className="loopc__track" ref={ref} onScroll={loop ? settle : undefined} tabIndex={0}
        onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } }}>
        {list.map((it, i) => (
          <div className="loopc__item" key={i}>
            <Link to={it.to} className="card" draggable={false}>
              <div className="card__img"><img src={it.image} alt={it.title} draggable={false} style={{ objectFit: it.contain ? "contain" : "cover" }} /></div>
              <div className="card__row"><p>{it.title}</p><img className="card__arrow" src={arrowIcon} alt="" width="21" height="43" /></div>
            </Link>
          </div>
        ))}
      </div>
      {loop && <button type="button" className="loopc__nav loopc__nav--next" aria-label="Next" onClick={() => go(1)}>›</button>}
    </div>
  );
}
