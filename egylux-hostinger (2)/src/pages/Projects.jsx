import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import ProjectsMap from "../components/ProjectsMap";
import { heroes } from "../data/pages";

export default function Projects() {
  return (
    <div className="page-cream">
      <PageHero title="Projects" image={heroes.projects} />
      <main className="page-main">
        <Reveal className="wrap intro">
          <div>
            <p className="eyebrow">Our Projects</p>
            <h2 className="h2"><span className="yellow-2">Powering</span> Commercial and Industrial <span className="yellow-2">Projects</span></h2>
          </div>
          <p className="body">Explore a selection of projects powered by EGYLUX lighting solutions across Egypt and the MENA region.</p>
        </Reveal>
        <Reveal className="wrap" delay={100}><ProjectsMap /></Reveal>
      </main>
      <Footer />
    </div>
  );
}
