// الصور محلية في public/img/figma (اتنزّلت من Figma بـ npm run localize-images)
const A = {
  indoor:  "/img/figma/3d8a1ea7-707b-45b4-9b31-1d9c55c3efdc",
  outdoor: "/img/figma/583f8135-da58-48ac-bade-2371f1c0d2e2",
  panels:  "/img/figma/bd427033-a49a-4ccb-87d0-11fdd9397b55",
  cyl:     "/img/figma/ca5a427c-c000-4ae8-a83f-32f0e6614bc6",
  detail:  "/img/figma/6b40c406-53a9-4fc2-8241-3da72d4e93c6",
};

export const arrowIcon = `${A.indoor}/fa5da.svg`;

export const icons = {
  zoom: `${A.detail}/62f77.svg`, next: `${A.detail}/5cb2e.svg`, prev: `${A.detail}/0edfa.svg`,
  ip: `${A.detail}/c198b.svg`, ik: `${A.detail}/4b06f.svg`, cri: `${A.detail}/0d77c.svg`, time: `${A.detail}/492d3.svg`,
  ul: `${A.detail}/819a2.svg`, ce: `${A.detail}/7a85c.svg`, check: `${A.detail}/df2db.svg`,
  arrowUp: `${A.detail}/97479.svg`, download: `${A.detail}/4e7aa.svg`, chevron: `${A.detail}/db462.svg`,
};

// ---------- صفحات الكاتيجوري ----------
export const categories = {
  indoor: {
    title: ["Indoor ", "Lighting ", "Categories"],
    items: [
      { title: "Cylinders", image: `${A.indoor}/a97dd.png`, to: "/products/cylinders" },
      { title: "Panels", image: `${A.indoor}/6b53e.png`, to: "/products/panels", contain: true },
      { title: "Downlights", image: `${A.indoor}/550c8.png` },
    ],
  },
  outdoor: {
    title: ["Outdoor ", "Lighting ", "Categories"],
    // Figma فيه Category 1/2/3 كـ placeholder — بدّل الأسماء والروابط
    items: [
      { title: "Category 1", image: `${A.outdoor}/da5c2.png`, to: "/products/outdoor/beta-group" },
      { title: "Category 3", image: `${A.outdoor}/ab8af.png` },
      { title: "Category 2", image: `${A.outdoor}/49415.png` },
      { title: "Category 1", image: `${A.outdoor}/da5c2.png` },
      { title: "Category 3", image: `${A.outdoor}/ab8af.png` },
      { title: "Category 2", image: `${A.outdoor}/49415.png` },
    ],
  },
  cylinders: {
    title: "Cylinders",
    items: [
      { title: "CL50", image: `${A.cyl}/41339.png`, to: "/products/cylinders/cl50" },
      { title: "CL60", image: `${A.cyl}/0ade2.png`, to: "/products/cylinders/cl60" },
    ],
  },
  panels: {
    title: "Panels",
    items: [
      { title: "Backlight Finger", image: `${A.panels}/6b53e.png`, to: "/products/panels/backlight-finger" },
      { title: "Panel - Slim", image: `${A.panels}/28bd9.png`, to: "/products/panels/panel-slim" },
      { title: "Panel EGYLUX Square", image: `${A.panels}/5c010.png`, to: "/products/panels/panel-egylux-square" },
      { title: "Panel Mirage Circular", image: `${A.panels}/75076.png`, to: "/products/panels/panel-mirage-circular" },
      { title: "Panel Slim Mirage", image: `${A.panels}/d4881.png`, to: "/products/panels/panel-slim-mirage" },
      { title: "Back Light - Mirage", image: `${A.panels}/5c010.png`, to: "/products/panels/back-light-mirage" },
    ],
  },
};

// ---------- صفحات تفاصيل المنتج ----------
const betaGroup = {
  title: "Beta Group",
  layout: "standard",
  breadcrumb: ["Products", "Outdoor Lighting", "Bulkhead"],
  images: [`${A.detail}/4e42a.png`, `${A.detail}/789d6.png`, `${A.detail}/35f07.png`],
  badges: [
    { icon: icons.ip, label: "IP 65" }, { icon: icons.ik, label: "IK 08" },
    { icon: icons.cri, label: "CRI 80" }, { icon: icons.time, label: "50,000 Hrs" },
  ],
  certified: true,
  description:
    "Durable LED bulkhead designed for corridors, staircases, utility rooms, and common indoor areas where reliability and impact resistance are essential.",
  specs: [["Mounting type", "Wall Mounted"], ["Material", "Die-Cast Aluminum"], ["Diffuser", "Opal"], ["Efficacy", "125 Lm/W"]],
  tech: {
    showScale: true,
    tabs: [
      {
        label: "LED Chip / Module", icon: "chip",
        rows: [{ code: "BLK3021-10W-LM-TR-**", wattage: "10W", chip: "Lumiled/Tridonic", ip: "65", beam: "100°", cct: ["5700K", "4000K", "3000K"] }],
      },
      { label: "LED Lamp", icon: "bulb", rows: [] },
    ],
  },
};

const backlightFinger = {
  title: "Backlight Finger",
  layout: "panel",
  images: [`${A.panels}/6b53e.png`],
  description:
    "Indoor LED panel luminaire designed for surface mounted or recessed installation, suitable for offices and other commercial indoor spaces. It is available in several dimensions and power ratings, with optional ingress protection levels depending on the application.",
  codes: [
    ["Product Code", "PNLF***-E1A12-O1-TCI/3K"], ["CCT", "3000k"], ["CRI", ">80"],
    ["IP", "65"], ["Wattage", "10 W"], ["Efficacy", "110 LM /W"],
  ],
  notes: [
    ["RG = Gold Reflector", "RW = White Reflector", "RB = Black Reflector", "RS = Silver Reflector", "R* = S,G,B,W"],
    ["1 = White Housing", "2 = Black Housing", "* = 1,2"],
  ],
};

const details = { "beta-group": betaGroup, "backlight-finger": backlightFinger };

export function getProduct(category, slug) {
  if (details[slug]) return details[slug];
  const card = categories[category]?.items.find((i) => i.to?.endsWith(`/${slug}`));
  if (!card) return null;
  // منتج لسه ملوش داتا في Figma → عرض بسيط بنفس تصميم الـ panel
  return { title: card.title, layout: "panel", images: [card.image], description: "Product details coming soon.", codes: [], notes: [] };
}

export const relatedProducts = categories.panels.items.slice(0, 3);
