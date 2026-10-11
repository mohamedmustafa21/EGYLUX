// أيقونات صفحة المنتج كـ inline SVG — مفيش روابط Figma بتنتهي ولا ملفات خارجية.
const S = ({ size = 16, children, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...p}>{children}</svg>
);

export const IconShield = (p) => <S fill="currentColor" {...p}><path d="M12 2l8 3v6c0 5-3.3 9.2-8 11-4.7-1.8-8-6-8-11V5l8-3z" /><path d="M8.3 12.2l2.6 2.6 4.8-5.2" stroke="var(--icon-cut,#f5f5f5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></S>;
export const IconHammer = (p) => <S fill="currentColor" {...p}><path d="M13.5 3.5l7 7-2.8 2.8-1.4-1.4-1.4 1.4L20 17.5l-2.5 2.5-4.7-4.7L5.6 22.5 2 18.9l7.7-7.2-4.7-4.7L7.5 4.5l4.8 4.8 1.4-1.4-1.4-1.4 1.2-3z" /></S>;
export const IconColorWheel = (p) => <S {...p}><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M12 2v10l8.7 5M12 12l-8.7 5" stroke="var(--icon-cut,#f5f5f5)" strokeWidth="1.6" strokeLinecap="round" /></S>;
export const IconClock = (p) => <S {...p}><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M12 6.5V12l3.6 2.2" stroke="var(--icon-cut,#f5f5f5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></S>;
export const IconUL = (p) => <S size={20} {...p}><rect x="2" y="3" width="20" height="18" rx="9" stroke="#222" strokeWidth="1.6" /><text x="12" y="15.4" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#222" fontFamily="Arial,sans-serif">UL</text></S>;
export const IconCE = (p) => <S size={20} {...p}><text x="12" y="16.5" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#222" fontFamily="Arial,sans-serif">CE</text></S>;
export const IconCheck = (p) => <S size={20} {...p}><circle cx="12" cy="12" r="10" fill="#8bd700" /><path d="M7.5 12.4l3 3 6-6.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></S>;
export const IconDownload = (p) => <S size={24} {...p}><path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></S>;
export const IconArrowRight = (p) => <S size={20} {...p}><path d="M4 12h15m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></S>;
export const IconChevron = ({ dir = "down", ...p }) => <S size={20} {...p} style={{ transform: `rotate(${{ down: 0, up: 180, left: 90, right: -90 }[dir]}deg)`, transition: "transform .2s", ...p.style }}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></S>;
export const IconZoom = (p) => <S size={26} {...p}><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" /><path d="M15.5 15.5L21 21M10.5 8v5M8 10.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></S>;
export const IconChip = (p) => <S size={20} {...p}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="var(--icon-cut,#fff)" /><path d="M9 2.5v3M15 2.5v3M9 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></S>;
export const IconBulb = (p) => <S size={18} {...p}><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" fill="currentColor" /><path d="M9 20h6M10 22h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></S>;
export const IconSunAngle = (p) => <S size={20} {...p}><path d="M3 20h18M4.5 20L19 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M9 20a6 6 0 00-1.2-3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="17.5" cy="6" r="2.2" fill="currentColor" /></S>;
export const IconDot = ({ color = "#fff", size = 20 }) => <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill={color} stroke="rgba(0,0,0,.18)" strokeWidth="1" /></svg>;
export const IconSearch = (p) => <S size={18} {...p}><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" /><path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></S>;

// أيقونات الـ badges: بنختارها من الداش بورد بالمفتاح
export const BADGE_ICONS = { ip: IconShield, ik: IconHammer, cri: IconColorWheel, time: IconClock };
export function BadgeIcon({ name }) {
  if (!name) return null;
  if (/^(https?:)?\//.test(name)) return <img src={name} alt="" width="16" height="16" />; // روابط قديمة
  const C = BADGE_ICONS[name];
  return C ? <C /> : null;
}
export const TECH_ICONS = { chip: IconChip, bulb: IconBulb };

export const IconInfo = (p) => <S size={18} {...p}><circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.8" fill="none" /><path d="M12 11v5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="7.6" r="1.2" fill="currentColor" /></S>;
