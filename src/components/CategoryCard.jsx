import { Link } from "react-router-dom";
import { arrowIcon } from "../data/products";
import Reveal from "./Reveal";

export default function CategoryCard({ title, image, to, contain, index = 0 }) {
  const body = (
    <>
      <div className="card__img">
        <img src={image} alt={title} style={{ objectFit: contain ? "contain" : "cover" }} />
      </div>
      <div className="card__row">
        <p>{title}</p>
        <img className="card__arrow" src={arrowIcon} alt="" width="21" height="43" />
      </div>
    </>
  );
  return (
    <Reveal delay={(index % 3) * 100}>
      {to ? <Link to={to} className="card">{body}</Link> : <div className="card">{body}</div>}
    </Reveal>
  );
}
