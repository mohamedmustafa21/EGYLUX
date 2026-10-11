import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Reveal, { CountUp } from "../components/Reveal";
import CtaBanner from "../components/CtaBanner";
import { heroes, about } from "../data/pages";

const factories = [
  { title: "Egylux Factory", image: about.factory1, text: "Egylux factory is a fully equipped production facility spanning a total built-up area of 20,000 m², including 4,000 m² of dedicated operational space. With a workforce of over 550 engineers, technicians, and specialists, the factory is designed to support high-capacity manufacturing, handling production demands of up to 100 tons while maintaining consistent quality and efficiency across all processes." },
  { title: "Emas Factory", image: about.factory2, text: "Emas Factory is a specialized manufacturing facility within the group, operating through advanced production lines designed for efficient, high-volume output. As a sister company to Egylux, it plays a key role in supporting streamlined manufacturing processes, enabling flexibility, scalability, and consistent quality across a wide range of lighting products and project requirements." },
];

const stats = [[550, "Manpower"], [500, "Clients"], [20000, "Projects"]];

export default function About() {
  return (
    <div className="page-cream">
      <PageHero title="About Us" image={heroes.about} />

      <main className="page-main">
        <section className="wrap about-us">
          <Reveal className="about-us__text">
            <p className="eyebrow">About Egylux</p>
            <h2 className="h2">Sustainable Lighting Technologies For <span className="gold">Brighter Future</span></h2>
            <p className="body">Established in 1996, EGYLUX has positioned itself as a leading Egyptian provider of cutting-edge lighting solutions for residential, industrial, commercial, and outdoor applications. With a strong foothold in the Egyptian market and an expanding presence across the MENA region, EGYLUX is recognized for its commitment to innovation and quality</p>
            <p className="body">The company offers a diverse range of products, with a primary focus on LED lighting solutions, including floodlights, high bay lights, streetlights, wall packs, and panel lights, designed to meet the evolving needs of its clients.</p>
            <p className="body">Our operations are supported by two state-of-the-art factories spanning a total area of 24,000 square meters. Within these facilities, a dedicated team of 525 engineers, administrators, and technicians works diligently to ensure the production of top-quality products that meet and exceed global standards.</p>
            <Link to="/contact" className="btn-outline-dark">Our Company Profile</Link>
          </Reveal>
          <Reveal className="about-us__img" delay={150}>
            <img src={about.main} alt="EGYLUX" />
          </Reveal>
        </section>

        <section className="wrap vm">
          <Reveal className="info-card">
            <h3>Our Vision</h3>
            <p className="body sm">EGYLUX is dedicated to addressing the diverse lighting needs of its markets by consistently enhancing its product portfolio and upholding the highest standards of quality throughout the manufacturing process.</p>
          </Reveal>
          <Reveal className="info-card" delay={120}>
            <h3>Our Mission</h3>
            <p className="body sm">EGYLUX aims to meet the lighting needs of diverse markets by continuously improving product offerings and ensuring the highest standards of quality in manufacturing.</p>
          </Reveal>
        </section>

        <section className="wrap" id="factories">
          <Reveal>
            <p className="eyebrow">Our Factories</p>
            <h2 className="h2 yellow">Large Scale Production Capacity</h2>
            <p className="body" style={{ marginTop: 16 }}>Our production facilities are designed to deliver consistent quality, flexibility, and efficiency across a wide range of lighting solutions.</p>
          </Reveal>
          <div className="two-col" style={{ marginTop: 44 }}>
            {factories.map((f, i) => (
              <Reveal key={f.title} className="info-card info-card--tall" delay={i * 120}>
                <div className="info-card__img"><img src={f.image} alt={f.title} /></div>
                <div className="info-card__title">
                  <h3>{f.title}</h3>
                  <span className="chip-loc">Location : 10th of ramadan</span>
                </div>
                <p className="body sm">{f.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="wrap">
          <Reveal>
            <h2 className="h2">Our <span className="yellow">Credentials</span></h2>
            <p className="body" style={{ marginTop: 8 }}>Driven by a skilled team, trusted by our clients, and proven across diverse projects, our work reflects a consistent commitment to quality and reliability.</p>
          </Reveal>
          <div className="stats">
            <div className="stats__row">
              {stats.map(([n, label]) => (
                <div key={label} className="stats__item">
                  <strong><CountUp to={n} suffix=" +" /></strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <img className="stats__deco" src={about.deco} alt="" />
          </div>
        </section>

        <section className="wrap">
          <Reveal><h2 className="h2">ISO certificates</h2></Reveal>
          <div className="certs">
            {about.certs.map((c, i) => (
              <Reveal key={i} delay={i * 120}><img src={c} alt="ISO certificate" /></Reveal>
            ))}
          </div>
        </section>

        <CtaBanner image={about.cta} align="right"
          title={<>Light Up Your Next Project with <span className="yellow-2">EGYLUX</span></>} />
      </main>

      <Footer />
    </div>
  );
}
