import { Link } from "react-router-dom";
import Reveal from "./Reveal";

export default function ProductBanner({ title, image, to, align = "left" }) {
  return (
    <section className={`banner banner--${align}`} style={{ backgroundImage: `url(${image})` }}>
      <Reveal className="banner__inner">
        <h2>{title}</h2>
        <Link to={to} className="btn btn--light">View All</Link>
      </Reveal>
    </section>
  );
}
