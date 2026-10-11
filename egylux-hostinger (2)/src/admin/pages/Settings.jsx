import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { useAdmin } from "../ctx";
import { Badge, Btn, Card, ErrorBox, Field, Input, PageHead, Spinner, Toggle, ago, fmtDate } from "../ui";

export default function Settings() {
  const { toast } = useAdmin();
  const { data, error, loading, reload } = useApi("/admin/settings");
  const { data: log } = useApi("/admin/audit");
  const [f, setF] = useState(null); const [busy, setBusy] = useState(false); const [testing, setTesting] = useState(false);
  useEffect(() => { if (data) setF({ ...data, smtp: { ...data.smtp, pass: "" } }); }, [data]);
  if (loading || !f) return error ? <ErrorBox error={error} retry={reload} /> : <Spinner />;
  const sm = (k) => (e) => setF({ ...f, smtp: { ...f.smtp, [k]: e.target.value } });
  const save = async () => { setBusy(true); try { await api("/admin/settings", { method: "PUT", body: f }); toast("Settings saved", "ok"); reload(); return true; } catch (e) { toast(e.message, "err"); } finally { setBusy(false); } };
  const test = async () => {
    if (!(await save())) return;
    setTesting(true);
    try { const r = await api("/admin/settings/test-email", { method: "POST", body: { to: f.notify_emails } }); toast(`Test email sent to ${r.to}`, "ok"); } catch (e) { toast(e.message, "err"); }
    setTesting(false);
  };
  return (
    <>
      <PageHead title="Settings & email" sub="Get an email every time a customer sends a form or requests a quote."><Btn variant="primary" loading={busy} onClick={save}>Save settings</Btn></PageHead>
      <div className="grid g2">
        <Card title="Admin notifications">
          <Field label="Send notifications to" hint="Separate several emails with commas"><Input value={f.notify_emails} onChange={(e) => setF({ ...f, notify_emails: e.target.value })} placeholder="sales@egylux.com, manager@egylux.com" /></Field>
          <div style={{ display: "grid", gap: 10, margin: "4px 0 16px" }}>
            <Toggle checked={f.notify_quote} onChange={(v) => setF({ ...f, notify_quote: v })} label="“Get Quotation” requests" />
            <Toggle checked={f.notify_contact} onChange={(v) => setF({ ...f, notify_contact: v })} label="Contact form messages" />
          </div>
          <Btn icon="mail" loading={testing} onClick={test}>Send test email</Btn>
          <div className="note" style={{ marginTop: 14 }}>The customer's address is set as <b>Reply-To</b>, so you can answer straight from your inbox. New submissions also appear in the dashboard with a live counter.</div>
        </Card>
        <Card title="Email server (SMTP)" actions={data.env_smtp && <Badge tone="info">Env vars detected</Badge>}>
          <div className="grid g2" style={{ gap: 12 }}>
            <Field label="SMTP host"><Input value={f.smtp.host} onChange={sm("host")} placeholder="smtp.gmail.com" /></Field>
            <Field label="Port"><Input type="number" value={f.smtp.port} onChange={sm("port")} /></Field>
          </div>
          <Field label="Username"><Input value={f.smtp.user} onChange={sm("user")} autoComplete="off" /></Field>
          <Field label="Password" hint={data.smtp.has_pass ? "Saved — leave empty to keep" : ""}><Input type="password" value={f.smtp.pass} onChange={sm("pass")} autoComplete="new-password" placeholder={data.smtp.has_pass ? "••••••••" : ""} /></Field>
          <Field label="From address" hint="Defaults to the username"><Input value={f.smtp.from} onChange={sm("from")} placeholder="no-reply@egylux.com" /></Field>
          <Toggle checked={f.smtp.secure} onChange={(v) => setF({ ...f, smtp: { ...f.smtp, secure: v } })} label="Use SSL/TLS (port 465)" />
          <p className="muted small" style={{ marginBottom: 0 }}>Gmail: use <b>smtp.gmail.com</b>, port 587 and an <b>App Password</b>. Hosting providers also give you SMTP details in cPanel.</p>
        </Card>
      </div>
      <Card title="Recent activity" flush className="">
        {!log ? <Spinner /> : <div className="tbl-wrap"><table className="tbl"><tbody>{log.slice(0, 15).map((a) => <tr key={a.id}><td className="muted small" style={{ width: 150 }}>{ago(a.ts)}</td><td><span className="b">{a.user_name || "System"}</span> <span className="muted">{a.action}</span> {a.entity} {a.label && <span className="muted">· {a.label}</span>}</td></tr>)}</tbody></table></div>}
      </Card>
    </>
  );
}
