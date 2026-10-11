import Navbar from "./Navbar";

export default function PageHero({ title, image, navVariant = "overlay", logo }) {
  return (
    <section className={`page-hero page-hero--${navVariant}`}>
      <div className="page-hero__bg" style={{ backgroundImage: `url(${image})` }} />
      <div className="page-hero__shade" />
      <Navbar variant={navVariant} logo={logo} />
      <h1 className="page-hero__title">{title}</h1>
    </section>
  );
}
