import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CategoryPage from "./CategoryPage";
import ProductDetail from "./ProductDetail";
import { useApi } from "../hooks/useApi";

// /products  |  /products/:category  |  /products/:category/:slug
// السيرفر بيحدد لوحده الـ slug ده كاتيجوري ولا منتج (ومن غير ما نقلق على ترتيب الـ URL)
export default function ProductsRoute() {
  const { a, b } = useParams();
  const slug = b || a || "";
  const { data, error, loading } = useApi(`/public/entry/${encodeURIComponent(slug)}`);

  if (loading && !data) {
    return <div className="page-cream"><Navbar variant="light" /><main className="container-lg" style={{ minHeight: "60vh" }} /><Footer white /></div>;
  }
  if (error || !data) {
    return (
      <div className="page-cream">
        <Navbar variant="light" />
        <main className="container-lg" style={{ minHeight: "50vh" }}>
          <h1 className="category__title">{error?.status === 404 ? "Page not found" : "Something went wrong"}</h1>
          <Link to="/products">Back to products</Link>
        </main>
        <Footer white />
      </div>
    );
  }
  return data.type === "product" ? <ProductDetail data={data} /> : <CategoryPage data={data} />;
}
