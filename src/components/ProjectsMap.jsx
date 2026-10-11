import { Link } from "react-router-dom";
import { map } from "../data/pages";

const W = 1280, H = 468;

export default function ProjectsMap() {
  return (
    <div className="map" style={{ backgroundImage: `url(${map.image})` }}>
      {map.pins.map((p, i) => {
        const style = { left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%`, "--i": i };
        const img = <img src={p.active ? map.pinActive : map.pin} alt="" />;
        const tip = p.label && (
          <span className="map__tip"><b>{p.label}</b><small>{p.count}</small></span>
        );
        return p.to ? (
          <Link key={i} to={p.to} className="map__pin map__pin--link" style={style} aria-label={`${p.label} projects`}>{img}{tip}</Link>
        ) : (
          <span key={i} className="map__pin" style={style}>{img}{tip}</span>
        );
      })}
    </div>
  );
}
