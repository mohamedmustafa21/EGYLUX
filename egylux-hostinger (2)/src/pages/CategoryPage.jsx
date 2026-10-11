import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CategoryCard from "../components/CategoryCard";

export default function CategoryPage({ data }) {
  const { category, items } = data;
  const heading = category.heading || category.title;
  const words = heading.split(" ").filter(Boolean);

  return (
    <div className="page-cream">
      <Navbar variant="light" />
      <main className="category container-lg">
        {words.length === 3 ? (
          <h1 className="category__title category__title--sm">
            <span>{words[0]} </span>
            <span style={{ color: "#a89700" }}>{words[1]} </span>
            <span style={{ color: "#322701" }}>{words[2]}</span>
          </h1>
        ) : (
          <h1 className="category__title">{heading}</h1>
        )}
        {category.description && <p className="detail__desc" style={{ marginBottom: 24 }}>{category.description}</p>}
        {items.length ? (
          <div className="category__grid">
            {items.map((it, i) => <CategoryCard key={it.to} index={i} {...it} />)}
          </div>
        ) : (
          <p className="tech__empty">Products are coming soon to this category.</p>
        )}
      </main>
      <Footer white />
    </div>
  );
}
