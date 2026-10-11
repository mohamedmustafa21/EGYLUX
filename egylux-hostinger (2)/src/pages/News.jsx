import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import { heroes, news as newsDefaults } from "../data/pages";
import { useContent } from "../hooks/useContent";

export default function News() {
  const news = useContent("news", newsDefaults);
  return (
    <div className="page-cream">
      <PageHero title="News" image={heroes.news} />
      <main className="page-main">
        <section className="wrap">
          <Reveal><h2 className="h2">{news.title || "Our News"}</h2></Reveal>
          <div className="grid3" style={{ marginTop: 24 }}>
            {news.list.map((n, i) => (
              <Reveal key={i} delay={i * 100} className="media-card">
                <div className="media-card__img media-card__img--contain"><img src={n.image || news.image} alt={n.title} /></div>
                <h3>{n.title}</h3>
                <p>{n.text}</p>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
