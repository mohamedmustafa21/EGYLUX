import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PartnersMarquee from "../components/PartnersMarquee";
import ProductBanner from "../components/ProductBanner";
import Reveal from "../components/Reveal";
import { useContent } from "../hooks/useContent";
import { heroBg, heroIndoor, heroOutdoor, iconSun, catalogue, indoorBg, outdoorBg, ctaBg } from "../assets";

const homeDefaults = {
  heroTitle: "WE LIGHT YOUR LIFE", heroCta: "Get Quotation", aboutTitle: "About Us", aboutBtn: "Learn More",
  aboutText: "EGYLUX was established in 1996 as an Egyptian provider of the latest lighting solutions for residential, industrial, commercial and outdoor purposes with a strong presence in the Egyptian Market and the MENA region. EGYLUX offers wide range of products but the main focus is on LED floodlight, high bay light, streetlight, wall pack and panel light.",
  ctaTitle: "Bring Your Vision To Life", ctaBtn: "Contact Us",
};

export default function Home() {
  const c = useContent("home", homeDefaults);
  // الـ split (Indoor / Outdoor) بيظهر لما الماوس على لينك Products فقط
  const [split, setSplit] = useState(false);
  const timer = useRef();
  const show = () => { clearTimeout(timer.current); setSplit(true); };
  const hide = () => { timer.current = setTimeout(() => setSplit(false), 180); };

  return (
    <>
      <section className="hero" style={{ backgroundImage: `url(${heroBg})` }}>
        <Navbar dark={split} onProductsEnter={show} onProductsLeave={hide} />

        <div className="hero__content">
          <h1 className="hero__title">{c.heroTitle}</h1>
          <Link to="/contact" className="btn btn--outline hero__cta">{c.heroCta}</Link>
        </div>

        <div className={`hero__split ${split ? "is-open" : ""}`} onMouseEnter={show} onMouseLeave={hide}>
          <Link to="/products/indoor" className="hero__split-item" style={{ "--bg": `url(${heroIndoor})` }}>
            <span>Indoor Lighting Products</span>
          </Link>
          <Link to="/products/outdoor" className="hero__split-item hero__split-item--right" style={{ "--bg": `url(${heroOutdoor})` }}>
            <span>Outdoor Lighting Products</span>
          </Link>
        </div>

        <button className="hero__theme" aria-label="Toggle theme">
          <img src={iconSun} alt="" />
        </button>
      </section>

      <section className="about">
        <div className="about__inner">
          <Reveal className="about__text">
            <h2>{c.aboutTitle}</h2>
            <p>{c.aboutText}</p>
            <Link to="/about" className="btn btn--light">{c.aboutBtn}</Link>
          </Reveal>
          <Reveal className="about__book" delay={150}>
            <img src={catalogue} alt="EGYLUX Catalogue" />
          </Reveal>
        </div>
      </section>

      <PartnersMarquee />

      <ProductBanner title="Indoor Lighting Products" image={indoorBg} to="/products/indoor" />
      <ProductBanner title="Outdoor Lighting Products" image={outdoorBg} to="/products/outdoor" align="right" />

      <section className="cta">
        <Reveal className="cta__box" style={{ backgroundImage: `url(${ctaBg})` }}>
          <h2>{c.ctaTitle}</h2>
          <Link to="/contact" className="btn btn--outline-white">{c.ctaBtn}</Link>
        </Reveal>
      </section>

      <Footer />
    </>
  );
}
