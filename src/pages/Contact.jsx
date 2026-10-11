import { useState } from "react";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import { heroes, contact as contactDefaults } from "../data/pages";
import { api } from "../lib/api";
import { useContent } from "../hooks/useContent";

const empty = { name: "", email: "", phone: "", comment: "", website: "" };

export default function Contact() {
  const contact = { ...contactDefaults, ...useContent("contact", { offices: contactDefaults.offices }) };
  const [f, setF] = useState(empty);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api("/public/submit", { method: "POST", body: { type: "contact", name: f.name, email: f.email, phone: f.phone, message: f.comment, website: f.website, page_url: location.pathname } });
      setSent(true);
      setF(empty);
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };

  return (
    <div className="page-cream">
      <PageHero title="Contact Us" image={heroes.contact} />
      <main className="page-main">
        <section className="wrap contact">
          <Reveal className="contact__img"><img src={contact.image} alt="" /></Reveal>

          <Reveal className="contact__form" delay={120}>
            <div>
              <p className="eyebrow">Contact Us</p>
              <h2 className="h2"><span style={{ color: "#322701" }}>Feel Free to</span> <span style={{ color: "#a89700" }}>Reach Out</span></h2>
            </div>

            {sent ? (
              <div className="sent" role="status">
                <span className="sent__tick">✓</span>
                <h3>Thank you!</h3>
                <p className="body">We received your message and will get back to you soon.</p>
                <button className="btn-line" onClick={() => setSent(false)}>Send another message</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="row2">
                  <input required placeholder="Name *" value={f.name} onChange={set("name")} />
                  <input required type="email" placeholder="Email *" value={f.email} onChange={set("email")} />
                </div>
                <input required placeholder="Phone Number *" value={f.phone} onChange={set("phone")} />
                <textarea required rows="6" placeholder="Comment *" value={f.comment} onChange={set("comment")} />
                <input name="website" value={f.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
                {err && <p role="alert" style={{ color: "#b3261e", fontSize: 14 }}>{err}</p>}
                <div className="row2">
                  <button type="button" className="btn-line" onClick={() => setF(empty)}>Cancel</button>
                  <button type="submit" className="btn-primary btn-primary--lg" disabled={busy}>{busy ? "Sending…" : "Submit"}</button>
                </div>
              </form>
            )}
          </Reveal>
        </section>

        <section className="wrap offices">
          {contact.offices.map((o, i) => (
            <Reveal key={o.title} delay={i * 120} className="office">
              <h3>{o.title}</h3>
              <p><img src={contact.icons.phone} alt="" /> <a href={`tel:${o.phone.replace(/\s/g, "")}`}>{o.phone}</a></p>
              <p><img src={contact.icons.mail} alt="" /> <a href={`mailto:${o.email}`}>{o.email}</a></p>
              <p><img className="big" src={contact.icons.pin} alt="" /> <span>{o.address}</span></p>
            </Reveal>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
