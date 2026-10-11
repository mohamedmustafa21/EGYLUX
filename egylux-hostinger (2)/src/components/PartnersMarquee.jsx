import { partners } from "../assets";

export default function PartnersMarquee() {
  const items = [...partners, ...partners];
  return (
    <section className="partners">
      <h2>Success Partners</h2>
      <div className="partners__track">
        {items.map((p, i) => (
          <img key={i} src={p.src} alt="" className={p.round ? "round" : ""} style={{ width: p.w }} />
        ))}
      </div>
    </section>
  );
}
