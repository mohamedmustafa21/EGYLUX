// قراءة الـ Datasheet PDF بتاع EGYLUX واستخراج خانات الجدول (Wattage / Chip / Driver / IP / Beam Angle / CCT) وشكل الكود
// من النص نفسه: سطور الأكواد (DOW0745**CRLED-^^) + الملحوظة اللي تحت (فك الرموز) + Light Source / IP Rating / Beam Angle.
import fs from "node:fs";
import pdf from "pdf-parse/lib/pdf-parse.js";

const uniq = (a) => [...new Set(a)];

export async function parseDatasheetFile(file) {
  const { text } = await pdf(fs.readFileSync(file));
  return parseDatasheetText(text);
}

export function parseDatasheetText(raw) {
  const text = raw.replace(/[ \t]+/g, " ");
  const flat = text.replace(/\s*>\s*/g, ">");
  const found = [], missing = [];

  // 1) سطور الأكواد: PREFIX + wattage(2) + ثابت(2) + ** + chip + LED + -^^
  const codeRe = /\b([A-Z]{2,5})(\d{2})(\d{2})\*\*([A-Z]{1,4}?)(LED)-\^\^/g;
  const codes = [...text.matchAll(codeRe)];
  if (!codes.length) throw new Error("Couldn't find the code lines (like DOW0745**CRLED-^^) in this PDF.");
  const [, prefix, , constant, chipCode, led] = codes[0];
  const watts = uniq(codes.map((m) => m[2])).map((c) => ({ name: `${parseInt(c, 10)}W`, code: c }));

  // 2) CCT: القيم من Color Temp، والرموز من الملحوظة ("30">>>3000K)
  const cctNames = (text.match(/\d{4}\s?K(?:\s*\/\s*\d{4}\s?K)+/)?.[0] || "").split("/").map((x) => x.replace(/\s/g, "")).filter(Boolean);
  const cctMap = new Map([...flat.matchAll(/"(\d)\s*(\d)"\s*>+\s*(\d{4})\s?K/g)].map((m) => [`${m[3]}K`, m[1] + m[2]]));
  const cct = uniq([...cctNames, ...cctMap.keys()]).sort((a, b) => parseInt(a) - parseInt(b)).map((name) => ({ name, code: cctMap.get(name) || "" }));
  if (cct.some((v) => !v.code)) missing.push("some CCT codes");

  // 3) الـ chip: اسم الماركة من Light Source (Cree - COB)
  const chipName = text.match(/\b([A-Z][A-Za-z]+)\s*-\s*(?:COB|SMD|LED)\b/)?.[1] || chipCode;

  // 4) الـ driver: ^^">>>TR>>>Tridonic
  const drivers = [...flat.matchAll(/\^\^"?>+([A-Z]{2,4})>+([A-Za-z]+)/g)].map((m) => ({ name: m[2], code: m[1] }));
  if (!drivers.length) missing.push("Driver");

  // 5) IP: الأساسي (IP 54) من غير لاحقة، والاختياري (IP65) بيضيف -IP65
  const ipm = text.match(/IP\s?(\d{2})\s*\(\s*IP\s?(\d{2})\s*Optional\s*\)/i);
  const ipSuffix = text.match(/"-\s*IP(\d{2})"/)?.[1] || ipm?.[2];
  const ip = ipm ? [{ name: `IP${ipm[1]}`, code: "" }, { name: `IP${ipm[2]}`, code: ipSuffix || ipm[2] }] : [];
  if (!ip.length) missing.push("IP");

  // 6) Beam Angle (مش داخل في الكود)
  const beam = uniq([...text.matchAll(/(\d{2,3})\s?°(?!\s*C)/g)].map((m) => `${m[1]}°`)).slice(0, 1).map((name) => ({ name, code: "" }));
  if (!beam.length) missing.push("Beam Angle");

  const F = (key, label, values, extra = {}) => ({ key, label, optional: false, prefix: "", group: "", values, ...extra });
  const fields = [
    F("wattage", "Wattage", watts),
    F("chip", "LED Chip / Module", [{ name: chipName, code: chipCode }], { group: "chipdriver" }),
    ...(drivers.length ? [F("driver", "Driver", drivers, { prefix: "-", group: "chipdriver" })] : []),
    ...(ip.length ? [F("ip", "IP", ip, { optional: true, prefix: "-IP" })] : []),
    ...(beam.length ? [F("beam", "Beam Angle", beam, { optional: true })] : []),
    F("cct", "CCT", cct),
  ];
  const pattern = `${prefix}{wattage}${constant}{cct}{chip}${led}${drivers.length ? "{driver}" : ""}${ip.length ? "{ip}" : ""}`;
  for (const f of fields) if (f.values.length) found.push(f.label);
  return { tab: { label: "LED Chip / Module", icon: "chip", mode: "grid", pattern, fields, rows: [] }, found, missing, codes: codes.length };
}
