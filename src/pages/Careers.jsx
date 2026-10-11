import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import { heroes, jobs as jobsDefaults } from "../data/pages";
import { useContent } from "../hooks/useContent";

export default function Careers() {
  const jobs = useContent("careers", jobsDefaults);
  return (
    <div className="page-cream">
      <PageHero title="Careers" image={heroes.careers} />
      <main className="page-main">
        <section className="wrap">
          <Reveal><h2 className="h2">{jobs.title || "Careers"}</h2></Reveal>
          <div className="grid3" style={{ marginTop: 24 }}>
            {jobs.list.map((j, i) => (
              <Reveal key={i} delay={i * 100} className="media-card media-card--job">
                <div className="media-card__img"><img src={j.image || jobs.image} alt={j.title} /></div>
                <h3>{j.title}</h3>
                <p>{j.text}</p>
                <Link to="/contact" className="btn-primary">Apply Now</Link>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
