import { Link } from "react-router-dom";
import { footerLogo, iconSocial, mapImg } from "../assets";
import { useContent } from "../hooks/useContent";

const nav = [
  ["Home", "/"],
  ["About Us", "/about"],
  ["Products", "/products"],
  ["Projects", "/projects"],
  ["Factory", "/about#factories"],
  ["Contact Us", "/contact"],
];

const siteDefaults = {
  phone: "+02 10 0123 4567", companyAddress: "90 North Street, Block No.181, Fifth Settlement, New Cairo, Egypt",
  factoryAddress: "10th of Ramadan city industries area, zone B3 Plot 10, Egypt.", copyright: "© 2026 EGYLUX. All rights reserved",
};

export default function Footer({ white = false }) {
  const s = useContent("site", siteDefaults);
  const social = [["Facebook", s.facebook], ["Instagram", s.instagram], ["LinkedIn", s.linkedin], ["YouTube", s.youtube]].filter(([, u]) => u);
  return (
    <footer className={`footer ${white ? "footer--white" : ""}`}>
      <div className="footer__top">
        <img className="footer__logo" src={footerLogo} alt="EGYLUX" />

        <ul className="footer__nav">
          {nav.map(([label, to]) => (
            <li key={label}><Link to={to}>{label}</Link></li>
          ))}
        </ul>

        <div className="footer__contact">
          <p>Reach Out to Us</p>
          <p>Phone No.:</p>
          <p className="phone">{s.phone}</p>
          <p>Social Media Accounts:</p>
          {social.length ? (
            <p style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>{social.map(([n, u]) => <a key={n} href={u} target="_blank" rel="noopener noreferrer">{n}</a>)}</p>
          ) : <img className="footer__social" src={iconSocial} alt="Social media" />}
        </div>

        <div className="footer__map">
          <img src={mapImg} alt="Map" />
          <p><span className="label">Company : </span>{s.companyAddress}</p>
          <p><span className="label">Factory : </span>{s.factoryAddress}</p>
        </div>
      </div>
      <p className="footer__bottom">{s.copyright}</p>
    </footer>
  );
}
