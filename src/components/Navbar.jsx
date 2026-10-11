import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { logo as defaultLogo, iconSearch } from "../assets";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/products", label: "Products", products: true },
  { to: "/projects", label: "Projects" },
  { to: "/careers", label: "Careers" },
  { to: "/egylabs", label: "Egy Labs" },
  { to: "/news", label: "News" },
  { to: "/contact", label: "Contact Us" },
];

/**
 * variant: "overlay" (فوق الهيرو، شفاف) | "light" (أبيض) | "solid" (غامق)
 * dark: يجبر الخلفية الغامقة (بيستخدمها الهوم وقت الـ hover)
 * onProductsEnter / onProductsLeave: hover على لينك Products
 */
export default function Navbar({ variant = "overlay", dark = false, logo = defaultLogo, onProductsEnter, onProductsLeave }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (variant !== "overlay") return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  const cls = ["navbar", `navbar--${variant}`, open && "navbar--open", (dark || scrolled) && "is-dark", scrolled && "is-scrolled"]
    .filter(Boolean).join(" ");

  return (
    <header className={cls}>
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo">
          <img src={logo} alt="EGYLUX" />
        </Link>

        <ul className="navbar__links">
          {links.map((l) => (
            <li
              key={l.to}
              onMouseEnter={l.products ? onProductsEnter : undefined}
              onMouseLeave={l.products ? onProductsLeave : undefined}
              onFocus={l.products ? onProductsEnter : undefined}
            >
              <NavLink to={l.to} end={l.to === "/"} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <label className="navbar__search">
          <img src={iconSearch} alt="" width="10" height="10" />
          <input type="search" placeholder="Search..." />
        </label>

        <button className="navbar__toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">☰</button>
      </div>
    </header>
  );
}
