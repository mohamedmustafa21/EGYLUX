import { useState } from "react";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { useAdmin } from "../ctx";
import { Badge, Btn, Card, ErrorBox, Field, IconBtn, Input, Modal, PageHead, Select, Spinner, Tabs, Toggle, ago } from "../ui";

export default function Users() {
  const { can } = useAdmin();
  const [tab, setTab] = useState(can("users.manage") ? "users" : "roles");
  return (
    <>
      <PageHead title="Users & roles" sub="Decide who can log in and exactly what each person can do." />
      <Tabs value={tab} onChange={setTab} items={[...(can("users.manage") ? [{ id: "users", label: "Users" }] : []), ...(can("roles.manage") ? [{ id: "roles", label: "Roles & permissions" }] : [])]} />
      {tab === "users" ? <UsersTab /> : <RolesTab />}
    </>
  );
}

function UsersTab() {
  const { user: me, toast, confirm } = useAdmin();
  const { data, error, loading, reload } = useApi("/admin/users");
  const { data: roles } = useApi("/admin/roles");
  const [edit, setEdit] = useState(null);
  const del = async (u) => { if (await confirm({ title: "Delete user", message: `Delete ${u.name}? They won't be able to sign in anymore.`, danger: true, confirmText: "Delete" })) api(`/admin/users/${u.id}`, { method: "DELETE" }).then(() => { toast("Deleted", "ok"); reload(); }).catch((e) => toast(e.message, "err")); };
  return (
    <Card flush title="Team members" actions={<Btn variant="primary" sm icon="plus" onClick={() => setEdit({ name: "", email: "", password: "", role_id: roles?.find((r) => r.name !== "Super Admin")?.id || "", active: true })}>Add user</Btn>}>
      {loading ? <Spinner /> : error ? <ErrorBox error={error} retry={reload} /> : (
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last login</th><th /></tr></thead><tbody>
          {data.map((u) => (
            <tr key={u.id}><td><span className="b">{u.name}</span>{u.id === me.id && <Badge tone="brand"> you</Badge>}<div className="muted small">{u.email}</div></td>
              <td><Badge tone="info">{u.role}</Badge></td><td>{u.active ? <Badge tone="ok">Active</Badge> : <Badge>Disabled</Badge>}</td><td className="muted small">{ago(u.last_login)}</td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}><IconBtn n="edit" title="Edit" onClick={() => setEdit({ ...u, password: "" })} />{u.id !== me.id && <IconBtn n="trash" danger title="Delete" onClick={() => del(u)} />}</td></tr>))}
        </tbody></table></div>)}
      {edit && <UserModal u={edit} roles={roles || []} isMe={edit.id === me.id} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </Card>
  );
}

function UserModal({ u, roles, isMe, onClose, onSaved }) {
  const { toast, can } = useAdmin();
  const [f, setF] = useState(u); const [busy, setBusy] = useState(false); const isNew = !u.id;
  const avail = roles.filter((r) => can("*") || !r.permissions.includes("*") || r.id === u.role_id);
  const save = async () => {
    setBusy(true);
    try { await api(isNew ? "/admin/users" : `/admin/users/${u.id}`, { method: isNew ? "POST" : "PUT", body: { ...f, password: f.password || undefined } }); toast("Saved", "ok"); onSaved(); } catch (e) { toast(e.message, "err"); setBusy(false); }
  };
  return (
    <Modal title={isNew ? "Add user" : "Edit user"} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" loading={busy} onClick={save}>Save</Btn></>}>
      <Field label="Full name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
      <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label={isNew ? "Password" : "New password"} hint={isNew ? "min. 8 characters" : "Leave empty to keep the current one"}><Input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      <Field label="Role"><Select value={f.role_id} onChange={(e) => setF({ ...f, role_id: Number(e.target.value) })}>{avail.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
      {!isMe && <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Account active" />}
    </Modal>
  );
}

function RolesTab() {
  const { toast, confirm, meta } = useAdmin();
  const { data, error, loading, reload } = useApi("/admin/roles");
  const [edit, setEdit] = useState(null);
  const del = async (r) => { if (await confirm({ title: "Delete role", message: `Delete the “${r.name}” role?`, danger: true, confirmText: "Delete" })) api(`/admin/roles/${r.id}`, { method: "DELETE" }).then(() => { toast("Deleted", "ok"); reload(); }).catch((e) => toast(e.message, "err")); };
  const total = meta?.permissions.reduce((s, g) => s + g.items.length, 0) || 0;
  return (
    <Card flush title="Roles" actions={<Btn variant="primary" sm icon="plus" onClick={() => setEdit({ name: "", permissions: [] })}>New role</Btn>}>
      {loading ? <Spinner /> : error ? <ErrorBox error={error} retry={reload} /> : (
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Role</th><th>Users</th><th>Permissions</th><th /></tr></thead><tbody>
          {data.map((r) => { const star = r.permissions.includes("*"); return (
            <tr key={r.id}><td className="b">{r.name}</td><td>{r.users}</td><td>{star ? <Badge tone="brand">Full access</Badge> : <span className="muted small">{r.permissions.length} of {total} permissions</span>}</td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{!star && <><IconBtn n="edit" title="Edit" onClick={() => setEdit(r)} /><IconBtn n="trash" danger title="Delete" onClick={() => del(r)} /></>}</td></tr>); })}
        </tbody></table></div>)}
      {edit && <RoleModal r={edit} groups={meta?.permissions || []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </Card>
  );
}

function RoleModal({ r, groups, onClose, onSaved }) {
  const { toast } = useAdmin();
  const [name, setName] = useState(r.name); const [perms, setPerms] = useState(r.permissions); const [busy, setBusy] = useState(false);
  const tg = (k) => setPerms(perms.includes(k) ? perms.filter((x) => x !== k) : [...perms, k]);
  const save = async () => { setBusy(true); try { await api(r.id ? `/admin/roles/${r.id}` : "/admin/roles", { method: r.id ? "PUT" : "POST", body: { name, permissions: perms } }); toast("Saved", "ok"); onSaved(); } catch (e) { toast(e.message, "err"); setBusy(false); } };
  return (
    <Modal title={r.id ? "Edit role" : "New role"} size="wide" onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" loading={busy} onClick={save}>Save</Btn></>}>
      <Field label="Role name"><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Marketing" /></Field>
      <div className="lbl" style={{ margin: "6px 0 8px" }}>Permissions</div>
      {groups.map((g) => { const keys = g.items.map((i) => i[0]); const all = keys.every((k) => perms.includes(k)); return (
        <div className="perm-g" key={g.group}><h5>{g.group}<button type="button" className="btn sm ghost" onClick={() => setPerms(all ? perms.filter((p) => !keys.includes(p)) : [...new Set([...perms, ...keys])])}>{all ? "Clear" : "Select all"}</button></h5>
          {g.items.map(([k, label]) => <label className="it check" key={k} style={{ display: "flex" }}><input type="checkbox" checked={perms.includes(k)} onChange={() => tg(k)} />{label}</label>)}</div>); })}
    </Modal>
  );
}
