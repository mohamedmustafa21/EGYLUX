// بينزّل كل صور Figma المستخدمة في المشروع ويحطها في public/img/figma/ ثم يبدّل الروابط في الكود بمسارات محلية.
//
// الاستخدام:   npm run localize-images
// اختياري:     --force   يبدّل الروابط حتى لو فيه صور فشل تحميلها
//              --base=URL  مصدر تحميل بديل (للتجربة فقط)
//
// ملاحظة: روابط Figma دي بتنتهي بعد 7 أيام. لو التحميل فشل بـ 403/404 يبقى الروابط انتهت:
// ولّد الكود من Figma من جديد (روابط جديدة) وحدّث الروابط في src/assets.js و src/data/*.js ثم شغّل الأمر تاني.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIGMA = "https://www.figma.com/api/mcp/asset/";
const LOCAL = "/img/figma/";
const args = process.argv.slice(2);
const force = args.includes("--force");
const base = (args.find((a) => a.startsWith("--base="))?.slice(7) || FIGMA).replace(/\/?$/, "/");

// 1) نجمّع كل الروابط من قيم الموديولات (بيغطي كل طرق تركيب الرابط في الكود)
const files = ["src/assets.js", "src/data/products.js", "src/data/pages.js"];
const urls = new Set();
const walk = (v) => {
  if (typeof v === "string") { if (v.startsWith(FIGMA)) urls.add(v); }
  else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === "object") Object.values(v).forEach(walk);
};
for (const f of files) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue;
  walk(await import(pathToFileURL(abs).href));
}
if (!urls.size) { console.log("مفيش روابط Figma في الكود — يبدو إنها اتحولت قبل كده."); process.exit(0); }
console.log(`لقيت ${urls.size} صورة. بنزّل...`);

// 2) تحميل
const MIME_EXT = { "image/png": ".png", "image/jpeg": ".jpg", "image/svg+xml": ".svg", "image/webp": ".webp", "image/gif": ".gif" };
const failed = [];
const fellBack = [];
let ok = 0;
// أيقونات SVG بديلة جاهزة في scripts/fallback-svg (بتتستخدم لو Figma رجّع 404 للـ SVG)
const fallbackOf = (rel) => path.join(ROOT, "scripts/fallback-svg", rel);
for (const url of urls) {
  const rel = url.slice(FIGMA.length);           // <id>/<file>
  const out = path.join(ROOT, "public/img/figma", rel);
  if (fs.existsSync(out) && fs.statSync(out).size > 0) { ok++; continue; }
  try {
    const r = await fetch(base + rel, { redirect: "follow" });
    const type = (r.headers.get("content-type") || "").split(";")[0].trim();
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    if (!type.startsWith("image/")) throw new Error(`مش صورة (${type || "unknown"})`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) throw new Error("ملف فاضي");
    if (!path.extname(out) && MIME_EXT[type]) throw new Error("الرابط من غير امتداد");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    ok++;
    process.stdout.write(".");
  } catch (e) {
    if (fs.existsSync(fallbackOf(rel))) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(fallbackOf(rel), out);
      fellBack.push(rel);
      ok++;
      process.stdout.write("o");
    } else {
      failed.push([rel, e.message]);
      process.stdout.write("x");
    }
  }
}
console.log(`\nنجح ${ok} / ${urls.size}`);
if (fellBack.length) console.log(`(${fellBack.length} أيقونة SVG مكانتش متاحة على Figma فاستخدمت النسخة البديلة من scripts/fallback-svg)`);
if (failed.length) {
  console.log("\nفشل:");
  for (const [rel, msg] of failed) console.log(`  ${rel} → ${msg}`);
}
if (failed.length && !force) {
  console.log("\nمبدّلتش أي رابط في الكود (عشان الموقع ما يتكسرش). صلّح الفشل أو استخدم --force.");
  process.exit(1);
}

// 3) تبديل الروابط في الكود بمسارات محلية (/img/figma/<id>/<file>) — الـ Vite بيحطها في dist تلقائي
let changed = 0;
for (const f of files) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, "utf8");
  const next = src.split(FIGMA).join(LOCAL)
    .replace(/^\/\/ روابط Figma.*\n/m, "// الصور محلية في public/img/figma (اتنزّلت من Figma بـ npm run localize-images)\n");
  if (next !== src) { fs.writeFileSync(abs, next); changed++; }
}
console.log(`\nاتحدّث ${changed} ملف. دلوقتي شغّل: npm run build`);
