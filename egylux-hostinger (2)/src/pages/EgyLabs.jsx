import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import CtaBanner from "../components/CtaBanner";
import { heroes, labs } from "../data/pages";

const services = ["Service 1", "Service 2"];
const lorem = "EGYLUX always aim to expand the business locally and throughout the MENA region by exporting our products to Libya, Sudan, Algeria, UAE, Saudi Arabia and many more.";

export default function EgyLabs() {
  return (
    <div className="page-cream">
      <PageHero title="Egy Labs" image={heroes.egylabs} navVariant="light" logo={labs.logo} />
      <main className="page-main">
        <Reveal className="wrap intro">
          <div>
            <p className="eyebrow">Egy Labs</p>
            <h2 className="h2"><span style={{ color: "#322701" }}>About</span> <span className="yellow">Egy Labs</span></h2>
          </div>
          {/* TODO: نص Figma placeholder */}
          <p className="body">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,</p>
        </Reveal>

        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: -56 }}>
          <CtaBanner image={labs.banner} />
          <div className="grid3 grid3--tight">
            {labs.gallery.map((g, i) => (
              <Reveal key={i} delay={i * 100} className="gallery-tile"><img src={g} alt="" /></Reveal>
            ))}
          </div>
        </div>

        <section className="wrap">
          <Reveal><h2 className="h2">Our Services</h2></Reveal>
          <div className="two-col" style={{ marginTop: 24 }}>
            {services.map((s, i) => (
              <Reveal key={s} className="info-card" delay={i * 120}>
                <h3>{s}</h3>
                <p className="body sm">{lorem}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="wrap">
          <Reveal><h2 className="h2">Certificates</h2></Reveal>
          <div className="certs">
            {[0, 1, 2].map((i) => <Reveal key={i} delay={i * 120}><img src={labs.cert} alt="Certificate" /></Reveal>)}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
