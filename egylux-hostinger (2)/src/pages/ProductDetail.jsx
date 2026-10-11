import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Gallery from "../components/Gallery";
import DownloadMenu from "../components/DownloadMenu";
import QuotationModal from "../components/QuotationModal";
import TechSpecs from "../components/TechSpecs";
import LoopCarousel from "../components/LoopCarousel";
import { BadgeIcon, IconArrowRight, IconCE, IconCheck, IconDownload, IconInfo, IconUL } from "../components/Icons";
import { techFirstCode, techHasRows } from "../lib/tech";

// data = { product, breadcrumb, layout: { base, options }, related }
// الـ layout بييجي من السيرفر بعد ما يحل الأولوية: منتج ← كاتيجوري ← الافتراضي
// preview = true: بيتستخدم جوا الداش بورد (من غير فورم حقيقي ولا تنقل)
export default function ProductDetail({ data, preview = false }) {
  const { product: p, breadcrumb = [], layout, related = [] } = data;
  // كل المنتجات بنفس الشكل الجديد: أي Layout قديم (Panel) بيتعامل كـ Standard، وأي قسم فاضي بيختفي لوحده
  const o = { ...(layout.options || {}), ...(layout.base === "panel" ? { showBadges: true, showSpecs: true } : {}) };
  const [quote, setQuote] = useState(false);
  const [picked, setPicked] = useState([]); // الأكواد اللي العميل علّم عليها في الجدول
  const [help, setHelp] = useState(false);
  const defaultCode = p.codes?.[0]?.[1] || techFirstCode(p.tech);
  const images = (p.images || []).filter(Boolean);
  const extraFiles = (p.files || []).filter((f) => f.url);
  const hasFiles = o.showDownload !== false && extraFiles.length > 0;
  const hasDatasheet = o.showDownload !== false && !!p.datasheet;
  const dlName = `${(p.slug || p.title || "product").toString().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}-datasheet.pdf`;
  // الـ Product codes القديمة بتتنقل لصندوق الـ Specifications
  const specRows = [...(p.specs || []), ...(p.codes || [])].filter(([k, v]) => k && v);
  const badges = (p.badges || []).filter((b) => b.label);
  const quoteLabel = o.quoteLabel || "Get Quotation";
  const hasTable = o.showTech !== false && techHasRows(p.tech);
  const ready = !hasTable || picked.length > 0; // الزرار inactive لحد ما العميل يختار كود
  const openQuote = () => { if (preview) return; if (ready) setQuote(true); else setHelp(true); };
  const goToTable = () => { setHelp(false); document.getElementById("tech-specs")?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const Quote = ({ arrow }) => (
    <button type="button" className={`btn-yellow ${ready ? "" : "is-inactive"}`} aria-disabled={!ready} onClick={openQuote}>
      {quoteLabel}{!ready ? <IconInfo /> : arrow && <IconArrowRight />}
    </button>
  );

  return (
    <div className="page-cream" onClickCapture={preview ? (e) => e.target.closest("a") && e.preventDefault() : undefined}>
      <Navbar variant="light" />
      <main className="container-lg detail">
        <section className="detail__top">
          <div className="detail__left">
            <p className="crumbs">
              {breadcrumb.map((b) => <span key={b.to}><Link to={b.to}>{b.title}</Link>{"  >  "}</span>)}
              <b>{p.title || "Untitled product"}</b>
            </p>
            <Gallery images={images} alt={p.title} overview={o.galleryOverview !== false} />
          </div>
          <div className="detail__info">
            <h1>{p.title || "Untitled product"}</h1>
            {o.showBadges !== false && (badges.length > 0 || !!p.certified) && (
              <div className="badges">
                <div>{badges.map((b, i) => <span className="chip" key={i}><BadgeIcon name={b.icon} />{b.label}</span>)}</div>
                {!!p.certified && <span className="chip chip--cert"><IconUL /><IconCE />Certified<IconCheck /></span>}
              </div>
            )}
            {p.description && <p className="detail__desc">{p.description}</p>}
            <hr />
            <div className="detail__actions">
              {o.showQuote !== false && <Quote arrow />}
              {hasDatasheet && (
                <a className="btn-ghost btn-ghost--link" href={p.datasheet} download={dlName} target="_blank" rel="noopener">
                  <IconDownload /><span>Download Datasheet</span>
                </a>
              )}
              {hasFiles && <DownloadMenu files={extraFiles} label="Download Files" />}
            </div>
            {o.showSpecs !== false && specRows.length > 0 && (
              <div className="specbox">
                <h4>Specifications</h4>
                <dl>{specRows.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              </div>
            )}
          </div>
        </section>

        {hasTable && <TechSpecs tech={p.tech} showScale={o.showScale !== false} selected={picked} onSelect={setPicked} onQuote={openQuote} quoteLabel={quoteLabel} />}

        {o.showNotes !== false && p.notes?.length > 0 && (
          <section className="notes">
            <h2 className="tab">Note</h2>
            {p.notes.map((row, i) => <div key={i}>{row.map((n) => <span key={n}>{n}</span>)}</div>)}
          </section>
        )}

        {o.showRelated !== false && related.length > 0 && (
          <section className="related">
            <h2>{o.relatedTitle || "Related Products"}</h2>
            <LoopCarousel items={related} />
          </section>
        )}
      </main>
      <Footer white />
      <QuotationModal open={quote} onClose={() => setQuote(false)} product={p} productCode={defaultCode} items={hasTable ? picked : null} />
      {help && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="qhelp" onMouseDown={(e) => e.target === e.currentTarget && setHelp(false)}>
          <div className="modal__box qhelp">
            <button type="button" className="qhelp__x" aria-label="Close" onClick={() => setHelp(false)}>×</button>
            <IconInfo size={34} />
            <h3 id="qhelp">Select your products first</h3>
            <p>Check / select all the needed luminaires from the Technical Specs table, then press <b>{quoteLabel}</b>.</p>
            <button type="button" className="btn-yellow" onClick={goToTable}>Go to the table</button>
          </div>
        </div>
      )}
    </div>
  );
}
