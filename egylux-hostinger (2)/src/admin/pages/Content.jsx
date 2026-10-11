import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { useAdmin } from "../ctx";
import { Btn, Card, ErrorBox, Field, IconBtn, ImageInput, Input, PageHead, Spinner, Textarea, ago } from "../ui";

// تعريف الحقول لكل صفحة — لإضافة صفحة جديدة: ضيف schema هنا + استخدم useContent("key") في الصفحة
const SCHEMAS = {
  home: { label: "Home page", path: "/", fields: [
    ["heroTitle", "Hero title", "text"], ["heroCta", "Hero button text", "text"], ["aboutTitle", "About section title", "text"],
    ["aboutText", "About section text", "area"], ["aboutBtn", "About button text", "text"], ["ctaTitle", "Bottom banner title", "text"], ["ctaBtn", "Bottom banner button", "text"]] },
  contact: { label: "Contact page — offices", path: "/contact", fields: [
    ["offices", "Offices", "list", [["title", "Office name", "text"], ["phone", "Phone", "text"], ["email", "Email", "text"], ["address", "Address", "area"]], "Add office"]] },
  news: { label: "News", path: "/news", fields: [
    ["title", "Section title", "text"], ["image", "Default card image", "image"],
    ["list", "Articles", "list", [["title", "Title", "text"], ["text", "Text", "area"], ["image", "Image (optional)", "image"]], "Add article"]] },
  careers: { label: "Careers", path: "/careers", fields: [
    ["title", "Section title", "text"], ["image", "Default card image", "image"],
    ["list", "Open positions", "list", [["title", "Job title", "text"], ["text", "Description", "area"], ["image", "Image (optional)", "image"]], "Add job"]] },
  site: { label: "Footer & company info", path: "/", fields: [
    ["phone", "Phone number", "text"], ["companyAddress", "Company address", "area"], ["factoryAddress", "Factory address", "area"], ["copyright", "Copyright line", "text"],
    ["facebook", "Facebook URL", "text"], ["instagram", "Instagram URL", "text"], ["linkedin", "LinkedIn URL", "text"], ["youtube", "YouTube URL", "text"]] },
};

function Fld({ def, value, onChange }) {
  const [k, label, type, sub, addLabel] = def;
  if (type === "list") {
    const list = value || [];
    return (
      <Field label={label}>
        {list.map((it, i) => (
          <div className="list-item" key={i}>
            <IconBtn n="x" danger title="Remove" className="rm" onClick={() => onChange(list.filter((_, j) => j !== i))} />
            <div style={{ marginRight: 28 }}>{sub.map((d) => <Fld key={d[0]} def={d} value={it[d[0]]} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, [d[0]]: v } : x)))} />)}</div>
          </div>))}
        <Btn sm icon="plus" onClick={() => onChange([...list, {}])}>{addLabel}</Btn>
      </Field>
    );
  }
  return (
    <Field label={label}>
      {type === "area" ? <Textarea rows={4} value={value || ""} onChange={(e) => onChange(e.target.value)} /> : type === "image" ? <ImageInput value={value} onChange={onChange} /> : <Input value={value || ""} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

export default function Content() {
  const { toast } = useAdmin();
  const [key, setKey] = useState("home");
  const { data, error, loading } = useApi(`/admin/content/${key}`);
  const [form, setForm] = useState(null); const [orig, setOrig] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { setForm(null); }, [key]);
  useEffect(() => { if (data) { setForm(data.data); setOrig(JSON.stringify(data.data)); } }, [data]);
  const dirty = form && JSON.stringify(form) !== orig;
  const sc = SCHEMAS[key];
  const save = async () => { setBusy(true); try { await api(`/admin/content/${key}`, { method: "PUT", body: { data: form } }); setOrig(JSON.stringify(form)); toast("Content saved — live on the site", "ok"); } catch (e) { toast(e.message, "err"); } setBusy(false); };
  const pick = (k) => { if (dirty && !window.confirm("Discard unsaved changes?")) return; setKey(k); };
  return (
    <>
      <PageHead title="Page content" sub="Edit the text and images of your pages. Changes go live immediately.">
        <a className="btn" href={sc.path} target="_blank" rel="noreferrer">View page</a>
        <Btn variant="primary" loading={busy} disabled={!dirty} onClick={save}>{dirty ? "Save changes" : "Saved"}</Btn>
      </PageHead>
      <div className="grid" style={{ gridTemplateColumns: "220px minmax(0,1fr)", alignItems: "start" }}>
        <Card flush><div style={{ padding: 8 }}>{Object.entries(SCHEMAS).map(([k, s]) => <button key={k} className={`btn ghost`} style={{ width: "100%", justifyContent: "flex-start", background: k === key ? "var(--brand-l)" : undefined }} onClick={() => pick(k)}>{s.label}</button>)}</div></Card>
        <Card title={sc.label} actions={data?.updated_at && <span className="muted small">Last saved {ago(data.updated_at)}</span>}>
          {loading || !form ? (error ? <ErrorBox error={error} /> : <Spinner />) : <>{sc.fields.map((d) => <Fld key={d[0]} def={d} value={form[d[0]]} onChange={(v) => setForm({ ...form, [d[0]]: v })} />)}</>}
        </Card>
      </div>
      <p className="muted small" style={{ marginTop: 14 }}>Page names, SEO titles & descriptions are edited in <a href="/admin/seo" style={{ color: "var(--info)" }}>SEO → Pages</a>.</p>
    </>
  );
}
