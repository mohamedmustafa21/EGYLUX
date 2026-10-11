import { useState } from "react";
import { api } from "../../lib/api";
import { Btn, Field, Input } from "../ui";

export default function Login({ onLogin }) {
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { const { user } = await api("/auth/login", { method: "POST", body: f }); onLogin(user); }
    catch (ex) { setErr(ex.message); setBusy(false); }
  };
  return (
    <div className="adm-login">
      <form className="acard" onSubmit={submit}>
        <div className="logo"><i>E</i> EGYLUX</div>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>Sign in to your dashboard</h2>
        <p className="muted" style={{ margin: "0 0 20px" }}>Manage products, forms, SEO and more.</p>
        <Field label="Email"><Input type="email" autoFocus required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password"><Input type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        {err && <div className="note err" role="alert" style={{ marginBottom: 14 }}>{err}</div>}
        <Btn variant="primary" type="submit" loading={busy} style={{ width: "100%", height: 40 }}>Sign in</Btn>
      </form>
    </div>
  );
}
