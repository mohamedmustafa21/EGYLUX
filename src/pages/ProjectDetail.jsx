import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import CategoryCard from "../components/CategoryCard";
import ProjectsMap from "../components/ProjectsMap";
import { projects } from "../data/pages";
import { relatedProducts } from "../data/products";

function resolve(id) {
  if (projects.detail[id]) return projects.detail[id];
  const card = Object.entries(projects.items).flatMap(([cat, list]) => list.map((i) => ({ ...i, cat }))).find((i) => i.slug === id);
  if (!card) return null;
  const [first, ...rest] = card.title.split(" ");
  return { title: [`${first} `, rest.join(" ") || "Project"], heading: `${card.title} Lighting`, category: card.cat, image: card.image, location: "Location : 10th of ramadan", text: "Project details coming soon." };
}

export default function ProjectDetail() {
  const { region, id } = useParams();
  const p = resolve(id);

  if (!p) {
    return (
      <div className="page-cream"><Navbar variant="light" />
        <main className="container-lg"><h1 className="category__title">Project not found</h1><Link to="/projects">Back to projects</Link></main>
        <Footer white /></div>
    );
  }

  return (
    <div className="page-cream">
      <Navbar variant="light" />
      <main className="container-lg detail">
        <section>
          <p className="crumbs sm"><Link to="/projects">Projects</Link> &gt; <Link to={`/projects/${region}`}>Our Projects</Link> &gt; {p.category} &gt; <b>{p.title.join("")}</b></p>
          <h1 className="category__title" style={{ marginBottom: 24 }}>{p.title[0]}<span className="yellow">{p.title[1]}</span></h1>
          <Reveal className="project-hero"><img src={p.image} alt={p.heading} /></Reveal>
          <Reveal className="project-info" delay={80}>
            <div className="project-info__row">
              <h2>{p.heading}</h2>
              <span className="chip-loc">{p.location}</span>
            </div>
            <p className="body">{p.text}</p>
          </Reveal>
        </section>

        <section>
          <Reveal><h2 className="h3s">The Lights That Were Used</h2></Reveal>
          <div className="category__grid" style={{ marginTop: 24 }}>
            {relatedProducts.map((it, i) => <CategoryCard key={i} index={i} {...it} />)}
          </div>
        </section>

        <section>
          <Reveal><h2 className="h3s">See More Projects</h2></Reveal>
          <Reveal style={{ marginTop: 24 }} delay={80}><ProjectsMap /></Reveal>
        </section>
      </main>
      <Footer white />
    </div>
  );
}
