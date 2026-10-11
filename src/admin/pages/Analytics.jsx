import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { BarList, Badge, Card, ErrorBox, I, LineChart, num, PageHead, Spinner, Trend } from "../ui";

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { data: a, error, loading, reload } = useApi(`/admin/analytics?days=${days}`);
  const total = a?.devices.reduce((s, d) => s + d.n, 0) || 1;
  return (
    <>
      <PageHead title="Analytics" sub="Visits to your website. Privacy-friendly: no cookies, no IP addresses stored.">
        <div className="row">{[7, 30, 90].map((d) => <button key={d} className={`btn ${days === d ? "dark" : ""}`} onClick={() => setDays(d)}>{d} days</button>)}</div>
      </PageHead>
      {loading && !a ? <Spinner /> : error ? <ErrorBox error={error} retry={reload} /> : (
        <>
          <div className="grid g4" style={{ marginBottom: 16 }}>
            <div className="acard stat"><div className="k"><I n="eye" />Page views</div><div className="v">{num(a.totals.views)}</div><Trend now={a.totals.views} prev={a.totals.prevViews} /></div>
            <div className="acard stat"><div className="k"><I n="users" />Visitors</div><div className="v">{num(a.totals.visitors)}</div><Trend now={a.totals.visitors} prev={a.totals.prevVisitors} /></div>
            <div className="acard stat"><div className="k"><I n="file" />Pages / visitor</div><div className="v">{a.totals.pagesPerVisit}</div><span className="muted small">{num(a.totals.today)} views today</span></div>
            <div className="acard stat"><div className="k"><I n="pulse" />Online now</div><div className="v">{a.totals.live}</div><span className="muted small">last 5 minutes</span></div>
          </div>
          <Card title="Views & visitors per day"><LineChart height={240} data={a.series} lines={[{ k: "views", label: "Views", color: "#a89700" }, { k: "visitors", label: "Visitors", color: "#1f5fbf" }]} />
            <div className="row" style={{ marginTop: 8 }}><Badge tone="brand">● Views</Badge><Badge tone="info">● Visitors</Badge></div></Card>
          <div className="grid g2" style={{ marginTop: 16 }}>
            <Card title="Top pages"><BarList rows={a.pages} labelKey="path" valueKey="views" /></Card>
            <Card title="Most viewed products"><BarList rows={a.products} valueKey="views" format={(r) => <Link to={`/admin/products/${r.id}`}>{r.title}</Link>} empty="No product views in this period" /></Card>
            <Card title="Where visitors come from"><BarList rows={a.referrers} empty="No external referrers yet — direct visits only" /></Card>
            <Card title="Devices & countries">
              {a.devices.map((d) => <div className="bar-row" key={d.name}><span style={{ textTransform: "capitalize" }}>{d.name}</span><b>{Math.round((d.n / total) * 100)}%</b><div className="bar"><i style={{ width: `${(d.n / total) * 100}%` }} /></div></div>)}
              <div className="lbl" style={{ margin: "14px 0 4px" }}>Countries</div>
              <BarList rows={a.countries} empty="Country data needs a CDN header (e.g. Cloudflare)" />
            </Card>
          </div>
        </>)}
    </>
  );
}
