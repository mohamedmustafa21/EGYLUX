import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import RouteEffects from "./lib/RouteEffects";
import Home from "./pages/Home";
import About from "./pages/About";
import ProductsRoute from "./pages/ProductsRoute";
import ProductPreview from "./pages/ProductPreview";
import Projects from "./pages/Projects";
import ProjectList from "./pages/ProjectList";
import ProjectDetail from "./pages/ProjectDetail";
import Careers from "./pages/Careers";
import EgyLabs from "./pages/EgyLabs";
import News from "./pages/News";
import Contact from "./pages/Contact";

// الداش بورد في bundle منفصل — زوار الموقع ما بيحملوهوش
const AdminApp = lazy(() => import("./admin/AdminApp"));

export default function App() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/admin")) {
    return <Suspense fallback={<div style={{ padding: 40, fontFamily: "system-ui" }}>Loading dashboard…</div>}><AdminApp /></Suspense>;
  }

  return (
    <>
      <ScrollToTop />
      <RouteEffects />
      {/* key = pathname → أنيميشن fade عند تغيير الصفحة */}
      <div key={pathname} className="page-anim">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />

          <Route path="/__preview/product" element={<ProductPreview />} />
          <Route path="/products" element={<ProductsRoute />} />
          <Route path="/products/:a" element={<ProductsRoute />} />
          <Route path="/products/:a/:b" element={<ProductsRoute />} />

          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:region" element={<ProjectList />} />
          <Route path="/projects/:region/:id" element={<ProjectDetail />} />

          <Route path="/careers" element={<Careers />} />
          <Route path="/egylabs" element={<EgyLabs />} />
          <Route path="/news" element={<News />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </>
  );
}
