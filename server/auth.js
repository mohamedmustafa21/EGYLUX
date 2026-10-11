import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { DATA_DIR, get } from "./db.js";

// كل الصلاحيات المتاحة — بتتعرض في شاشة تعديل الـ Role
export const PERMISSIONS = [
  { group: "General", items: [["dashboard.view", "View dashboard"], ["analytics.view", "View analytics & visits"]] },
  { group: "Submissions", items: [["submissions.view", "View forms & quote requests"], ["submissions.manage", "Change status / notes / delete"]] },
  { group: "Catalog", items: [["products.view", "View products"], ["products.edit", "Add & edit products"], ["products.delete", "Delete products"], ["categories.manage", "Manage categories"], ["layouts.manage", "Manage layout templates"]] },
  { group: "Website", items: [["content.edit", "Edit page content"], ["media.manage", "Upload & delete media"], ["seo.manage", "Manage SEO settings"]] },
  { group: "Administration", items: [["users.manage", "Manage users"], ["roles.manage", "Manage roles & permissions"], ["settings.manage", "Site, email & notification settings"]] },
];
export const ALL_PERMS = PERMISSIONS.flatMap((g) => g.items.map((i) => i[0]));

const SECRET =
  process.env.JWT_SECRET ||
  (() => {
    const f = path.join(DATA_DIR, ".secret");
    if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(48).toString("hex"), { mode: 0o600 });
    return fs.readFileSync(f, "utf8");
  })();

const COOKIE = "egylux_token";
export const signToken = (uid) => jwt.sign({ uid }, SECRET, { expiresIn: "7d" });

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]));
}
export const setAuthCookie = (req, res, token) =>
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 86400}${req.secure || req.headers["x-forwarded-proto"] === "https" ? "; Secure" : ""}`);
export const clearAuthCookie = (res) => res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);

export const has = (user, perm) => !!user && (user.perms.includes("*") || user.perms.includes(perm));

export function loadUser(uid) {
  const u = get("SELECT u.id,u.name,u.email,u.active,u.role_id,r.name AS role,r.permissions FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?", uid);
  if (!u || !u.active) return null;
  return { id: u.id, name: u.name, email: u.email, role_id: u.role_id, role: u.role, perms: JSON.parse(u.permissions) };
}

export function auth(req, res, next) {
  try {
    const { uid } = jwt.verify(cookies(req)[COOKIE] || "", SECRET);
    const user = loadUser(uid);
    if (!user) throw new Error("inactive");
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Please sign in" });
  }
}

export const need = (...perms) => (req, res, next) =>
  perms.some((p) => has(req.user, p)) ? next() : res.status(403).json({ error: "You don't have permission to do this" });
