import nodemailer from "nodemailer";
import { getSetting } from "./db.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function transport() {
  const s = getSetting("smtp", {}) || {};
  const host = s.host || process.env.SMTP_HOST;
  if (!host) throw new Error("SMTP is not configured (Settings → Email)");
  const port = Number(s.port || process.env.SMTP_PORT || 587);
  const user = s.user || process.env.SMTP_USER;
  const pass = s.pass || process.env.SMTP_PASS;
  return {
    t: nodemailer.createTransport({ host, port, secure: s.secure ?? port === 465, auth: user ? { user, pass } : undefined }),
    from: s.from || process.env.SMTP_FROM || user || "no-reply@egylux.com",
  };
}

export async function sendMail({ to, subject, html, text, replyTo }) {
  const { t, from } = transport();
  return t.sendMail({ from: `"${getSetting("site_name", "EGYLUX")}" <${from.replace(/.*<|>.*/g, "")}>`, to, subject, html, text, replyTo });
}

export async function notifySubmission(sub) {
  const recipients = String(getSetting("notify_emails", "")).split(/[,;\s]+/).filter(Boolean);
  const wanted = sub.type === "quote" ? getSetting("notify_quote", true) : getSetting("notify_contact", true);
  if (!recipients.length || !wanted) return { skipped: true };
  const base = (getSetting("site_url", "") || "").replace(/\/$/, "");
  const label = sub.type === "quote" ? "Quotation request" : "Contact message";
  const rows = [
    ["Type", label], ["Name", sub.name], ["Email", sub.email], ["Phone", sub.phone], ["Company", sub.company],
    ["Product", sub.product_title], ["Product code", sub.product_code], ["Message", sub.message], ["Page", sub.page_url],
  ].filter((r) => r[1]);
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px">
    <h2 style="color:#a89700;margin:0 0 12px">New ${esc(label)} #${sub.id}</h2>
    <table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) => `<tr><td style="padding:8px 12px;border:1px solid #eee;background:#fafafa;width:130px"><b>${esc(k)}</b></td><td style="padding:8px 12px;border:1px solid #eee;white-space:pre-wrap">${esc(v)}</td></tr>`).join("")}</table>
    ${base ? `<p style="margin-top:16px"><a href="${base}/admin/submissions?open=${sub.id}" style="background:#d2ca13;color:#000;padding:10px 18px;text-decoration:none;border-radius:6px">Open in dashboard</a></p>` : ""}
  </div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  await sendMail({ to: recipients.join(","), subject: `[${getSetting("site_name", "EGYLUX")}] New ${label.toLowerCase()} from ${sub.name}`, html, text, replyTo: sub.email });
  return { sent: true };
}
