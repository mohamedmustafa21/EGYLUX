# EGYLUX — Website + Admin Dashboard

موقع React (Vite) + Backend (Express + SQLite) + داش بورد كاملة على `/admin`.

## التشغيل

    npm install
    cp .env.example .env        # اختياري في التطوير
    npm run dev                 # الموقع http://localhost:5173  |  API :4000

أول تشغيل بيعمل قاعدة البيانات ويملاها من بيانات الموقع الحالية (المنتجات/الكاتيجوري/النصوص)،
وبيطبع إيميل وباسورد الأدمن في الـ console. ادخل على `/admin` وغيّر الباسورد.

## للنشر (Production)

    npm run build
    npm start                   # بيخدم الموقع + الـ API + /admin على بورت واحد

- محتاج **Node 22.13+** (بنستخدم `node:sqlite` المدمج — مفيش native modules).
- محتاج استضافة بتشغّل Node (VPS / Render / Railway / Fly …) — **استضافة cPanel العادية مش هتنفع**.
- `DATA_DIR` (قاعدة البيانات + الصور المرفوعة) لازم على disk دايم. النسخ الاحتياطي = انسخ فولدر `server/data`.
- ورا Nginx/Cloudflare: الـ `trust proxy` شغّال. Cloudflare بيبعت `cf-ipcountry` فتظهر الدول في Analytics.

## اللي في الداش بورد

| القسم | بيعمل إيه |
|---|---|
| **Dashboard** | زيارات، فورمز جديدة، أكتر صفحات/منتجات مشاهدة، صحة الـ SEO |
| **Submissions** | كل بيانات فورم Contact و **Get Quotation** (الاسم، الإيميل، الشركة، التليفون، المنتج، الكود، الرسالة) — حالة، تعيين لموظف، ملاحظات داخلية، بحث، Export CSV، عدّاد إشعارات |
| **Analytics** | زيارات يومية، زوار، مصادر، أجهزة، دول، أكتر المنتجات مشاهدة (بدون cookies ولا IP) |
| **Products** | إضافة/تعديل/نسخ/حذف، صور متعددة، specs، badges، codes، جدول technical، ملفات تحميل (PDF)، مسودة/منشور، تعديل جماعي |
| **Categories** | شجرة كاتيجوري بأي عمق (Indoor ← Panels ← …)، صورة، ترتيب، إخفاء |
| **Layout templates** | قوالب صفحة المنتج (Standard / Panel + أي قالب جديد بتعمله وتختار الأقسام الظاهرة) |
| **Page content** | تعديل نصوص وصور Home / Contact / News / Careers / Footer |
| **Media** | رفع صور وملفات (15MB) |
| **SEO** | Audit بدرجة لكل صفحة، عناوين/وصف/صورة مشاركة لكل منتج وكاتيجوري وصفحة، sitemap.xml و robots.txt تلقائي، Google Analytics / Search Console |
| **Users & roles** | يوزرات + أدوار بصلاحيات مفصّلة (Super Admin / Content Editor / Sales / SEO) وتعمل أدوار جديدة |
| **Settings** | إيميل الإشعارات (أكتر من إيميل) + SMTP + زرار Test |

## نظام الـ Layout (3 مستويات)

الأولوية: **المنتج ← الكاتيجوري (وأبوها) ← الافتراضي للموقع**

- عايز **كل الموقع** نفس الـ layout؟ ← Layout templates ← **Apply to all**
- **لكل كاتيجوري** layout؟ ← Categories ← Edit ← تبويب Layout (ومعاه خيار يطبّقه على الأبناء)
- **منتج بعينه**؟ ← Product ← تبويب Layout

## صفحة المنتج (تصميم Figma "Beta Group")

الـ Standard layout بقى بالتصميم الجديد:

- **Gallery:** أول عرض بيجمع كل الصور جنب بعض + thumbnails (الأولى "كل الصور")، أسهم، و zoom (lightbox بالكيبورد).
- **Technical Specs:** مقياس الـ Kelvin (2200K → 6500K) + جدول بتابات (LED Chip / Module ، LED Lamp …)، وكل عمود (Wattage / Chip / IP / Beam / CCT) فيه فلتر، والـ CCT بيظهر في كبسولة غامقة.
- كل الأيقونات inline SVG (مفيش روابط Figma بتنتهي).

### من الداش بورد (Products ← منتج جديد)

- **Specs & technical:** Specifications (key/value) + **Technical specs**: ضيف تابات، وفي كل تاب variants (كود، Wattage، Chip/Driver، IP، Beam، واختيار CCT بضغطة).
- **General:** Badges بزراير سريعة (IP 65 / IK 08 / CRI 80 / 50,000 Hrs) + Certified (UL/CE).
- **Images & files:** الصور (الأولى هي الرئيسية) + ملفات التحميل (بتظهر زرار "Download Files").
- **Preview:** معاينة حيّة بنفس كومبوننت الموقع (Desktop / Mobile) وإنت لسه بتكتب — من غير ما تحفظ.
- **Layout templates:** تقدر تقفل/تفتح أي قسم (Gallery overview، Color scale، Technical specs…) لكل الموقع أو كاتيجوري أو منتج.
- المنتجات القديمة (اللي جدولها بالشكل القديم) بتتحوّل تلقائيًا للشكل الجديد من غير ما تعدّل حاجة.

## الإيميلات

Settings & email ← حط SMTP (Gmail: `smtp.gmail.com` / 587 / App Password) ← Send test email.
كل Submission جديد بيوصل إيميل للأدمن (Reply-To = إيميل العميل). لو الإيميل فشل بيظهر "Email failed" في الـ Submission ومش بتضيع البيانات.

## الأمان

JWT في httpOnly cookie، bcrypt للباسوردات، rate-limit على login والفورمز، honeypot ضد البوتات،
CSP على الملفات المرفوعة، صلاحيات بتتفحص في السيرفر (مش بس في الواجهة)، ولا يمكن حذف/تنزيل آخر Super Admin.

## إضافة صفحة جديدة قابلة للتعديل

1. `server/seedContent.js`: ضيف key بالقيم الافتراضية.
2. `src/admin/pages/Content.jsx`: ضيف schema بالحقول.
3. في الصفحة: `const c = useContent("key", defaults)` واستخدم `c.field`.

## ملاحظات

- صور Figma في `src/assets.js` و `src/data/*` بتنتهي صلاحيتها — ارفع صورك من **Media** وغيّرها من الداش بورد (المنتجات والكاتيجوري بتتعدل كلها من هناك).
- صفحات About / Projects / Egy Labs لسه نصوصها في الكود؛ نفس خطوات "صفحة جديدة" تخليها قابلة للتعديل.
- SEO للـ crawlers: السيرفر بيحقن الـ title/description/OG/JSON-LD في الـ HTML نفسه قبل ما يوصل للمتصفح (مهم لمعاينة واتساب/فيسبوك).


## Product page: datasheet + code configurator

- **Datasheet (PDF)**: Product → *Images & files* → “Datasheet (PDF)”. The product page shows a single *Download Datasheet* button. Extra files (IES, drawings…) stay optional under “More files”.
- **All products use one layout.** Old “Panel” products render in the same look; sections without data are hidden. Old *Product codes* now appear inside the Specifications box.
- **Technical specs → Code builder**: define a pattern such as `DOW{wattage}45{cct}CRLED{driver}{ip}` and, per field, each value’s *name* (shown to the customer, e.g. Tridonic) and *code* (e.g. TR). Fields marked *Optional* (IP, beam angle) appear in the code only after the customer chooses them; others show `**` until chosen. Several chosen values → one code line each (up to 12, then “+N more”).
- **Import from Excel** (Technical specs card): reads name, Brief, the code table and Notes, infers the pattern/values and verifies it by regenerating every code. Codes that don’t follow a pattern are imported as a plain variants list.
- Old variant data is converted automatically (no migration needed). The `datasheet` column is added to the database automatically on start.
- After pulling these changes run `npm install` (new dependency: `read-excel-file`).

## Quotation flow (v2)

- Each code in the Technical Specs table has a checkbox (header checkbox = select all visible codes). Incomplete codes (still showing `**`) can't be ticked.
- **Get Quotation** (top button and table button) is inactive until at least one code is ticked. Pressing it while inactive opens a window explaining what to do.
- When active, the form lists the selected codes with a quantity each and requires a **Project name**. The full list is sent in the message; the submissions list shows the first code + "(+N more)".
- Related Products is a looping carousel (arrows, swipe, ← → keys); the API now returns up to 12 related products.

## Standard filters + Excel import

The table's filters are **Wattage, LED Chip / Module, Driver, IP, Beam Angle, CCT**. On *Import from Excel* these are recognised from the column header (e.g. “Power”, “Chip”, “IP Rating”, “Beam”, “Color Temp”) and always become filters, even if a column holds a single value. Values are normalised (`8` → `8W`, `65` → `IP65`, `60` → `60°`, `3000` → `3000K`). Any other column that varies also becomes a filter; constant ones (CRI, Efficacy…) go to Specifications. Driver/chip names in the sheet are mapped to their code letters found in the product code (Tridonic ↔ TR). Anything not found in the sheet is listed after the import so you can add it by hand.

## Columns + reading the datasheet PDF

- Table columns: **Product Code | Wattage | Chip / Driver | IP | Beam Angle | CCT**. “Chip / Driver” is one column whose dropdown has two sections (Chip, Driver) and whose cell reads “Cree / Tridonic”. A field joins that column via *Column on the site* in Technical specs.
- **Fill the code table from this datasheet** (Product → Images & files → Datasheet): uploads are read on the server (`server/datasheet.js`, uses `pdf-parse`). It reads the code lines (`DOW0745**CRLED-^^`), the decode note at the bottom (30/40/60 → CCT, TR → Tridonic, -IP65), Light Source (chip), IP Rating and Beam Angle. Built for the EGYLUX datasheet template; anything it can't find is listed so you can add it by hand. Review, then Save.
- Run `npm install` after pulling (new dependencies: `read-excel-file`, `pdf-parse`).

## Beta Group (Figma) checklist — product page ↔ dashboard

| Figma element | Product page | Dashboard (Product editor) |
|---|---|---|
| Menu / Footer | Navbar, Footer | Page content |
| Breadcrumb (Products > Outdoor Lighting > Bulkhead > Beta Group) | automatic | Category + Title |
| Gallery: main image, ‹ › arrows, zoom, “all images” thumb + thumbs | Gallery | Images & files → Product images; Layout → overview |
| Title | h1 | General → Title |
| Badges IP 65 / IK 08 / CRI 80 / 50,000 Hrs (+ icons) | badges row | Specs & technical → Badges (icon + label) |
| Certified (UL, CE, ✓) | chip | Certified toggle |
| Description | paragraph | General → Description |
| Get Quotation (+ arrow) | yellow button | Layout → button label |
| Download Files (+ chevron) | menu button | Images & files → Download Files; Datasheet (PDF) → “Download Datasheet” button |
| Specifications box (Mounting type, Material, Diffuser, Efficacy…) | box with separators | Specs & technical → Specifications rows |
| Technical Specs: title, Kelvin scale, LED Chip / Module + LED Lamp tabs | TechSpecs | Technical specs card |
| Table: Product Code, Wattage, Chip/ Driver, IP, Beam Angle, CCT | filters + codes | Fields / values / pattern, Excel + PDF import |
| Related Products (3 cards) | looping carousel | automatic (same category) |

Deliberate differences from the Figma mockup (client edits): no color dot / black pill in the CCT cell; Get Quotation is inactive until codes are ticked.
