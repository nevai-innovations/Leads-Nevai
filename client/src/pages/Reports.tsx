import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { label } from '../lib/constants';
import { fmtPct } from '../lib/format';
import { ErrorState, Icon, Loading, PageHeader, useAsync } from '../components/ui';

const TEAL = '#0f766e';

export default function Reports() {
  const { data, error, loading, reload } = useAsync(() => api.reports(), []);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Survey performance by collector, business type and district"
        actions={
          <>
            <a className="btn btn-secondary" href={api.exportUrl('csv', {})} download>
              <Icon name="download" size={16} /> All leads CSV
            </a>
            <a className="btn btn-primary" href={api.exportUrl('xlsx', {})} download>
              <Icon name="download" size={16} /> All leads Excel
            </a>
          </>
        }
      />
      {loading && !data ? (
        <Loading label="Loading reports…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <div className="chart-grid">
          <section className="card chart-card wide" aria-labelledby="r-coll">
            <h2 id="r-coll" className="card-title">
              Collector performance
            </h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Collected by</th>
                    <th scope="col" className="num">Leads</th>
                    <th scope="col" className="num">Demos</th>
                    <th scope="col" className="num">Converted</th>
                    <th scope="col" className="num">Lost</th>
                    <th scope="col" className="num">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCollector.map((c) => (
                    <tr key={c.collector}>
                      <td>
                        <Link to={`/leads?collectedBy=${encodeURIComponent(c.collector)}`}>{c.collector}</Link>
                      </td>
                      <td className="num">{c.total}</td>
                      <td className="num">{c.demo}</td>
                      <td className="num">{c.converted}</td>
                      <td className="num">{c.lost}</td>
                      <td className="num">{fmtPct(c.total ? c.converted / c.total : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card chart-card" aria-labelledby="r-wash">
            <h2 id="r-wash" className="card-title">
              Car wash types
            </h2>
            <p className="muted small">Avg. {data.avgDailyVehicles.toFixed(0)} vehicles/day · {data.totalDailyVehicles} vehicles/day across all surveyed centres</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byWashType.map((w) => ({ name: label(w.key), Leads: w.total }))} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(15,118,110,0.06)' }} />
                <Bar isAnimationActive={false} dataKey="Leads" fill={TEAL} radius={[4, 4, 0, 0]} maxBarSize={48} label={{ position: 'top', fontSize: 12, fill: '#374151' }} />
              </BarChart>
            </ResponsiveContainer>
            <table className="table table-compact">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col" className="num">Leads</th>
                  <th scope="col" className="num">Avg vehicles/day</th>
                </tr>
              </thead>
              <tbody>
                {data.byWashType.map((w) => (
                  <tr key={w.key}>
                    <td>{label(w.key)}</td>
                    <td className="num">{w.total}</td>
                    <td className="num">{w.avgVehicles.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card chart-card" aria-labelledby="r-sys">
            <h2 id="r-sys" className="card-title">
              Current system vs interest
            </h2>
            <p className="muted small">Which existing setups are most open to switching</p>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Current system</th>
                  <th scope="col" className="num">Leads</th>
                  <th scope="col" className="num">Hot/Warm</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.bySystem.map((s) => (
                  <tr key={s.key}>
                    <td>{label(s.key)}</td>
                    <td className="num">{s.total}</td>
                    <td className="num">{s.hotWarm}</td>
                    <td>
                      <div className="meter" role="img" aria-label={`${fmtPct(s.total ? s.hotWarm / s.total : 0)} hot or warm`}>
                        <span style={{ width: `${s.total ? (s.hotWarm / s.total) * 100 : 0}%` }} />
                      </div>
                      <span className="small muted">{fmtPct(s.total ? s.hotWarm / s.total : 0)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card chart-card wide" aria-labelledby="r-dist">
            <h2 id="r-dist" className="card-title">
              District summary
            </h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">District</th>
                    <th scope="col" className="num">Leads</th>
                    <th scope="col" className="num">Open pipeline</th>
                    <th scope="col" className="num">Converted</th>
                    <th scope="col" className="num">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byDistrict.map((d) => (
                    <tr key={d.district}>
                      <td>
                        <Link to={`/leads?district=${encodeURIComponent(d.district)}`}>{d.district}</Link>
                      </td>
                      <td className="num">{d.total}</td>
                      <td className="num">{d.open}</td>
                      <td className="num">{d.converted}</td>
                      <td className="num">{fmtPct(d.total ? d.converted / d.total : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
