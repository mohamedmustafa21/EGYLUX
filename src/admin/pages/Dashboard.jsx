import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { useAdmin } from "../ctx";
import { ago, BarList, Badge, Card, ErrorBox, I, LineChart, num, PageHead, Spinner, Trend } from "../ui";

export const STATUS = { new: ["New", "warn"], in_progress: ["In progress", "info"], done: ["Done", "ok"], spam: ["Spam", ""] };

export default function Dashboard() {
  const { user, can } = useAdmin();
  const { data: d, error, loading, reload } = useApi("/admin/stats");
  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} retry={reload} />;
  const a = d.analytics, s = d.submissions, seo = d.seo;
  return (
    <>
      <PageHead title={`Welcome back, ${user.name.split(" ")[0]}`} sub="Here's what's happening on your website." />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        {a && <div className="acard stat"><div className="k"><I n="eye" />Page views · 14 d</div><div className="v">{num(a.totals.views)}</div><Trend now={a.totals.views} prev={a.totals.prevViews} /></div>}
        {a && <div className="acard stat"><div className="k"><I n="users" />Visitors · 14 d</div><div className="v">{num(a.totals.visitors)}</div><Trend now={a.totals.visitors} prev={a.totals.prevVisitors} /></div>}
        {s && <div className="acard stat"><div className="k"><I n="inbox" />New submissions</div><div className="v">{num(s.counts.new || 0)}</div><span className="muted small">{num(Object.values(s.counts).reduce((x, y) => x + y, 0))} total</span></div>}
        <div className="acard stat"><div className="k"><I n="box" />Products</div><div className="v">{d.catalog.published}<span className="muted" style={{ fontSize: 16 }}> / {d.catalog.products}</span></div><span className="muted small">published · {d.catalog.categories} categories</span></div>
      </div>
      <div className="grid g-2-1">
        <div className="stack">
          {a && <Card title="Traffic" actions={<span className="badge ok"><I n="pulse" /> {a.totals.live} online now</span>}><LineChart data={a.series} lines={[{ k: "views", label: "Views", color: "#a89700" }, { k: "visitors", label: "Visitors", color: "#1f5fbf" }]} /></Card>}
          {s && (
            <Card title="Latest forms & quote requests" flush actions={<Link className="btn sm" to="/admin/submissions">View all</Link>}>
              {!s.recent.length ? <div className="aempty"><b>No submissions yet</b>Forms sent from your website will show up here.</div> : (
                <div className="tbl-wrap"><table className="tbl"><tbody>{s.recent.map((r) => (
                  <tr key={r.id} className={`click ${r.status === "new" ? "unread" : ""}`} onClick={() => (location.href = `/admin/submissions?open=${r.id}`)}>
                    <td><span className="b">{r.name}</span><div className="muted small">{r.email}</div></td>
                    <td><Badge tone={r.type === "quote" ? "brand" : "info"}>{r.type === "quote" ? "Quote" : "Contact"}</Badge></td>
                    <td className="muted clip" style={{ maxWidth: 160 }}>{r.product_title || "—"}</td>
                    <td><Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge></td>
                    <td className="muted small num">{ago(r.created_at)}</td>
                  </tr>))}</tbody></table></div>
              )}
            </Card>
          )}
        </div>
        <div className="stack">
          {a && <Card title="Top pages"><BarList rows={a.pages.slice(0, 6)} labelKey="path" valueKey="views" /></Card>}
          {a && <Card title="Most viewed products"><BarList rows={a.products.slice(0, 5)} labelKey="title" valueKey="views" empty="No product views yet" /></Card>}
          {seo && (
            <Card title="SEO health" actions={<Link className="btn sm" to="/admin/seo">Open</Link>}>
              <div className="row"><div style={{ fontSize: 34, fontWeight: 700, color: seo.score >= 85 ? "var(--ok)" : seo.score >= 65 ? "var(--warn)" : "var(--err)" }}>{seo.score}<span className="muted" style={{ fontSize: 14 }}>/100</span></div>
                <div className="small muted">{seo.counts.error} errors<br />{seo.counts.warn} warnings</div></div>
            </Card>
          )}
          {!a && !s && !seo && can("products.view") && <Card title="Quick links"><Link className="btn" to="/admin/products">Go to products</Link></Card>}
        </div>
      </div>
    </>
  );
}
