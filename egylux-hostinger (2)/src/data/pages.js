// الصور محلية في public/img/figma (اتنزّلت من Figma بـ npm run localize-images)
const F = (id, file) => `/img/figma/${id}/${file}`;
const ABOUT = "cd972786-df3a-4eed-a684-3fa4e19c6ce7";
const LABS = "16d03ccb-ac32-4e54-9d55-6659bb7969eb";

export const heroes = {
  about: F(ABOUT, "42744.png"),
  careers: F("fe8b6465-45ba-498f-a671-3bfb9b19f915", "d1489.png"),
  egylabs: F("878be083-1b10-4ab9-8828-df6c2fa09c4c", "89111.png"),
  news: F("be3049aa-fb2f-44d0-8e5d-92ea2e986bb2", "38aad.png"),
  contact: F("81fd6b8f-adaa-4253-84c9-ae4d5eb6e356", "f8993.png"),
  projects: F("f0c5599a-b209-4e69-8fae-9f3e9242cef6", "6c2ad.png"),
};

export const about = {
  main: F(ABOUT, "eea7e.png"),
  factory1: F(ABOUT, "35e63.png"),
  factory2: F(ABOUT, "18592.png"),
  cta: F(ABOUT, "18592.png"),
  deco: F(ABOUT, "fdb30.svg"),
  certs: [F(ABOUT, "0420f.png"), F(ABOUT, "6dd2f.png"), F(ABOUT, "f4f53.png")],
};

export const labs = {
  logo: F("878be083-1b10-4ab9-8828-df6c2fa09c4c", "8c6b9.png"),
  banner: F(LABS, "18592.png"),
  gallery: [F(LABS, "97b28.png"), F(LABS, "18592.png"), F(LABS, "38aad.png")],
  cert: F("c1a1ff9b-87fc-497c-b169-84b880a8f0f6", "55f00.png"),
};

export const jobs = {
  image: F("4fb9dc91-1a06-420b-855e-6a8404666bfa", "8a4b4.png"),
  // placeholder من Figma — بدّل بالوظايف الحقيقية
  list: Array.from({ length: 3 }, () => ({
    title: "UI / UX designer",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
  })),
};

export const news = {
  image: F("d0860508-81f7-4e5a-b585-f3e3f21da78c", "4a8b6.png"),
  list: Array.from({ length: 3 }, () => ({
    title: "Iso Craftation",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,",
  })),
};

const C = "277a277b-d4fb-4e9f-8e27-6812074f9d20";
export const contact = {
  image: F("28da951c-42fa-4b5b-be81-0f5a66ceef4f", "49783.png"),
  icons: { phone: F(C, "ff42d.svg"), mail: F(C, "4397f.svg"), pin: F(C, "99290.svg") },
  // TODO: بيانات Figma placeholder — حط الأرقام والإيميلات الحقيقية
  offices: [
    { title: "Head Office", phone: "064-21658-55577-12358", email: "EgyluxElsewedy@gmail.com", address: "90 North Street, Block No.181, Fifth Settlement, New Cairo, Egypt" },
    { title: "Factory", phone: "064-21658-55577-12358", email: "EgyluxElsewedy@gmail.com", address: "10th of Ramadan city industries area, zone B3 Plot 10, Egypt." },
  ],
};

const M = "3f63ba85-67f0-442a-845a-1a3a5a1da657";
export const map = {
  image: F(M, "ea06e.png"),
  pin: F(M, "59e6c.svg"),
  pinActive: F(M, "ac247.svg"),
  // المواقع بالـ px على خريطة 1280×468 (من Figma)
  pins: [
    { x: 883, y: 190 }, { x: 813, y: 145 }, { x: 1046, y: 87 }, { x: 743, y: 100, active: true },
    { x: 174, y: 112 }, { x: 324, y: 386 }, { x: 611, y: 241 }, { x: 554, y: 268 },
    { x: 633, y: 295, label: "Egypt", count: "20+ Projects", to: "/projects/cairo" },
  ],
};

const P = "7748b58a-83ba-4f25-9b27-4f111e0b5d5a";
export const projects = {
  region: { slug: "cairo", title: ["Cairo ", "Projects"], crumb: "Cairo" },
  tabs: ["Hotels", "Homes", "Malls", "Factories"],
  items: {
    Hotels: [
      { slug: "sheraton", title: "Sheraton", image: F(P, "fffac.png") },
      { slug: "mariot", title: "Mariot", image: F(P, "3d9c9.png") },
      { slug: "four-seasons", title: "Four Seasons", image: F(P, "f8993.png") },
      { slug: "mariot", title: "Mariot", image: F(P, "3d9c9.png") },
      { slug: "four-seasons", title: "Four Seasons", image: F(P, "f8993.png") },
      { slug: "sheraton", title: "Sheraton", image: F(P, "fffac.png") },
    ],
  },
  detail: {
    sheraton: {
      title: ["Sheraton ", "Hotel"],
      heading: "Sheraton Hotel Lighting",
      category: "Hotels",
      image: F("b5d28aa2-ea79-495f-a8f0-90bf970e5063", "c76ae.png"),
      location: "Location : 10th of ramadan",
      text: "All lighting fixtures were selected in alignment with the overall interior concept, combining performance with aesthetic harmony. We integrated downlights to provide focused and ambient illumination, along with LED linear lights to emphasize clean lines and add a contemporary touch. The result is a cohesive lighting design that enhances the space while maintaining efficiency and modern elegance.",
    },
  },
};
