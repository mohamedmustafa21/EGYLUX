import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CategoryCard from "../components/CategoryCard";
import { projects } from "../data/pages";

export default function ProjectList() {
  const [tab, setTab] = useState(projects.tabs[0]);
  const items = projects.items[tab] || [];
  const [a, b] = projects.region.title;

  return (
    <div className="page-cream">
      <Navbar variant="light" />
      <main className="container-lg">
        <p className="crumbs sm">
          <Link to="/projects">Projects</Link> &gt; <Link to="/projects">Our Projects</Link> &gt; <b>{projects.region.crumb}</b>
        </p>
        <h1 className="category__title" style={{ marginBottom: 24 }}>{a}<span className="yellow">{b}</span></h1>

        <div className="tabs" role="tablist">
          {projects.tabs.map((t) => (
            <button key={t} role="tab" aria-selected={t === tab} className={t === tab ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {items.length ? (
          <div className="category__grid" key={tab}>
            {items.map((it, i) => (
              <CategoryCard key={i} index={i} title={it.title} image={it.image} to={`/projects/${projects.region.slug}/${it.slug}`} />
            ))}
          </div>
        ) : (
          <p className="empty">No {tab.toLowerCase()} projects yet.</p>
        )}
      </main>
      <Footer white />
    </div>
  );
}
