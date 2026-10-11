import { Link } from "react-router-dom";
import Reveal from "./Reveal";

// بانر الصورة الكبير (Frame 101). بدون title = صورة فقط
export default function CtaBanner({ image, title, align = "right" }) {
  return (
    <Reveal className="wrap">
      <div className={`ctabanner ctabanner--${title ? align : "plain"}`} style={{ backgroundImage: `url(${image})` }}>
        {title && (
          <div className="ctabanner__box">
            <h2>{title}</h2>
            <Link to="/contact" className="btn btn--outline-white">Contact Us</Link>
          </div>
        )}
      </div>
    </Reveal>
  );
}
