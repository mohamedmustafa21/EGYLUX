import { useState } from "react";
import { api } from "../../lib/api";
import { useAdmin } from "../ctx";
import { Badge, Btn, Card, Field, Input, PageHead } from "../ui";

export default function Account() {
  const { user, toast } = useAdmin();
  const [f, setF] = useState({ current: "", password: "", again: "" }); const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (f.password !== f.again) return toast("The two new passwords don't match", "err");
    setBusy(true);
    try { await api("/auth/password", { method: "PUT", body: { current: f.current, password: f.password } }); toast("Password changed", "ok"); setF({ current: "", password: "", again: "" }); } catch (ex) { toast(ex.message, "err"); }
    setBusy(false);
  };
  return (
    <>
      <PageHead title="My account" sub={<>{user.name} · {user.email} · <Badge tone="info">{user.role}</Badge></>} />
      <div style={{ maxWidth: 460 }}>
        <Card title="Change password"><form onSubmit={save}>
          <Field label="Current password"><Input type="password" required autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
          <Field label="New password" hint="min. 8 characters"><Input type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <Field label="Repeat new password"><Input type="password" required autoComplete="new-password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} /></Field>
          <Btn variant="primary" type="submit" loading={busy}>Update password</Btn>
        </form></Card>
      </div>
    </>
  );
}
