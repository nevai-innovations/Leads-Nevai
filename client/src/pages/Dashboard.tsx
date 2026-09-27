import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, type DashboardData } from '../lib/api';
import { INTEREST_COLORS, INTERESTS, label } from '../lib/constants';
import { fmtDate, fmtPct, fmtShort, fmtWeekday, relativeDue } from '../lib/format';
import { EmptyState, ErrorState, Icon, InterestBadge, PageHeader, SkeletonCards, useAsync } from '../components/ui';

const TEAL = '#0f766e';
const BLUE = '#1d4ed8';
const GRID = '#e5e7eb';
const AXIS = '#6b7280';
// Ordinal teal ramp for the funnel (light → dark, lightest still clears 2:1 on white)
const FUNNEL = ['#5eb8ae', '#2a9d8f', '#1b7f74', '#0f5f57'];

// District bars stack real ratings first, then leads not yet rated
const DISTRICT_KEYS = [...INTERESTS, 'UNRATED'] as const;

const axisProps = { stroke: AXIS, fontSize: 12, tickLine: false, axisLine: { stroke: '#d1d5db' } } as const;

function ChartTooltip({ active, payload, label: l, labelFormatter }: { active?: boolean; payload?: { name?: string; value?: number; color?: string; payload?: { fill?: string } }[]; label?: string | number; labelFormatter?: (l: string | number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {l !== undefined && l !== '' && <div className="chart-tooltip-title">{labelFormatter ? labelFormatter(l) : l}</div>}
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip-row">
          <span className="dot" style={{ background: p.color ?? p.payload?.fill }} aria-hidden="true" />
          <span>{p.name}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data, error, loading, reload } = useAsync(() => api.dashboard(), []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={data ? `Market survey overview · ${fmtDate(data.today)}` : 'Market survey overview'}
        actions={
          <Link to="/leads/new" className="btn btn-primary hide-mobile">
            <Icon name="add" size={16} /> Add lead
          </Link>
        }
      />
      {loading && !data ? (
        <>
          <SkeletonCards count={8} />
          <div className="chart-grid" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card skeleton" style={{ height: 300 }} />
            ))}
          </div>
          <span className="sr-only" role="status">
            Loading dashboard…
          </span>
        </>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data && data.kpis.total === 0 ? (
        <EmptyState title="No leads yet">
          <p className="muted">Charts will appear once you start collecting leads.</p>
          <Link to="/leads/new" className="btn btn-primary">
            Add your first lead
          </Link>
        </EmptyState>
      ) : data ? (
        <DashboardBody d={data} />
      ) : null}
    </div>
  );
}

function DashboardBody({ d }: { d: DashboardData }) {
  const k = d.kpis;
  const interestData = d.byInterest.map((r) => ({ name: label(r.key), key: r.key, value: r.count }));
  const statusData = d.byStatus.map((r) => ({ name: label(r.key), key: r.key, value: r.count }));
  const districtData = d.byDistrict.map((r) => ({ ...r, name: r.district }));
  const overTime = d.overTime.map((w) => ({ ...w, name: fmtShort(w.weekStart) }));
  const weekDays = d.followUpsThisWeek.days.map((w) => ({ ...w, name: fmtWeekday(w.date) }));
  const maxFunnel = Math.max(1, d.funnel[0].count);
  const maxTop = Math.max(1, ...d.topDistricts.map((t) => t.hot + t.warm));

  return (
    <>
      <div className="kpi-grid">
        <Kpi label="Total leads" value={k.total} to="/leads" icon="list" />
        <Kpi label="Hot leads" value={k.hot} to="/leads?interest=HOT" accent={INTEREST_COLORS.HOT} />
        <Kpi label="Warm leads" value={k.warm} to="/leads?interest=WARM" accent={INTEREST_COLORS.WARM} />
        <Kpi label="Demo scheduled" value={k.demoScheduled} to="/leads?status=DEMO_SCHEDULED" icon="calendar" />
        <Kpi label="Converted" value={k.converted} to="/leads?status=CONVERTED" icon="check" />
        <Kpi label="Conversion rate" value={fmtPct(k.conversionRate)} hint={`${k.converted} of ${k.total} leads`} icon="report" />
        <Kpi
          label="Follow-ups due today"
          value={k.dueToday}
          to="/follow-ups"
          icon="clock"
          hint={k.overdue ? `${k.overdue} overdue` : 'None overdue'}
          hintTone={k.overdue ? 'danger' : undefined}
        />
        <Kpi label="Added this week" value={k.addedThisWeek} to="/leads?sort=latest" icon="add" />
      </div>

      <div className="chart-grid">
        <ChartCard
          title="Leads by probability of interest"
          table={{ head: ['Interest', 'Leads'], rows: interestData.map((r) => [r.name, r.value]) }}
        >
          <div className="donut-wrap">
            <div className="donut">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie isAnimationActive={false} data={interestData} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="#fff" strokeWidth={2}>
                    {interestData.map((r) => (
                      <Cell key={r.key} fill={INTEREST_COLORS[r.key]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center" aria-hidden="true">
                <strong>{k.total}</strong>
                <span>leads</span>
              </div>
            </div>
            <ul className="legend-list">
              {interestData.map((r) => (
                <li key={r.key}>
                  <Link to={`/leads?interest=${r.key}`}>
                    <span className="dot" style={{ background: INTEREST_COLORS[r.key] }} aria-hidden="true" />
                    <span>{r.name}</span>
                    <strong>{r.value}</strong>
                    <span className="muted small">{k.total ? fmtPct(r.value / k.total) : '0%'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard title="Leads by status" table={{ head: ['Status', 'Leads'], rows: statusData.map((r) => [r.name, r.value]) }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fontSize: 11 }} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(15,118,110,0.06)' }} />
              <Bar isAnimationActive={false} dataKey="value" name="Leads" fill={TEAL} radius={[4, 4, 0, 0]} maxBarSize={48} label={{ position: 'top', fontSize: 12, fill: '#374151' }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Leads by district"
          subtitle="Stacked by interest level"
          wide
          table={{
            head: ['District', ...DISTRICT_KEYS.map(label), 'Total'],
            rows: districtData.map((r) => [r.district, r.HOT, r.WARM, r.COLD, r.NOT_INTERESTED, r.UNRATED, r.total]),
          }}
        >
          <ResponsiveContainer width="100%" height={Math.max(260, districtData.length * 30 + 60)}>
            <BarChart data={districtData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }} barCategoryGap={6}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={118} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(15,118,110,0.06)' }} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              {DISTRICT_KEYS.map((i, idx) => (
                <Bar
                  isAnimationActive={false}
                  key={i}
                  dataKey={i}
                  name={label(i)}
                  stackId="a"
                  fill={INTEREST_COLORS[i]}
                  stroke="#fff"
                  strokeWidth={1}
                  radius={idx === DISTRICT_KEYS.length - 1 ? [0, 4, 4, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Leads collected over time" subtitle="New leads per week" table={{ head: ['Week of', 'Leads'], rows: overTime.map((r) => [fmtDate(r.weekStart), r.count]) }}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={overTime} margin={{ top: 16, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BLUE} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="name" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<ChartTooltip labelFormatter={(l) => `Week of ${l}`} />} cursor={{ stroke: '#9ca3af', strokeDasharray: '3 3' }} />
              <Area isAnimationActive={false} type="monotone" dataKey="count" name="New leads" stroke={BLUE} strokeWidth={2} fill="url(#areaFill)" dot={{ r: 3, fill: BLUE, strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Conversion funnel" subtitle="Leads that reached each stage" table={{ head: ['Stage', 'Leads'], rows: d.funnel.map((f) => [f.stage, f.count]) }}>
          <ol className="funnel">
            {d.funnel.map((f, i) => {
              const prev = i === 0 ? null : d.funnel[i - 1].count;
              return (
                <li key={f.stage}>
                  <div className="funnel-label">
                    <span>{f.stage}</span>
                    <span>
                      <strong>{f.count}</strong>
                      {prev !== null && <span className="muted small"> · {prev ? fmtPct(f.count / prev) : '0%'} of previous</span>}
                    </span>
                  </div>
                  <div className="funnel-track">
                    <div className="funnel-bar" style={{ width: `${Math.max(2, (f.count / maxFunnel) * 100)}%`, background: FUNNEL[i] }} />
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="muted small funnel-foot">Overall conversion: {fmtPct(k.conversionRate)}</p>
        </ChartCard>

        <ChartCard
          title="Follow-ups due this week"
          subtitle={k.overdue ? <span className="text-danger">{k.overdue} overdue not shown</span> : 'Next 7 days'}
          table={{ head: ['Day', 'Follow-ups'], rows: weekDays.map((w) => [w.name, w.count]) }}
          action={
            <Link to="/follow-ups" className="link-sm">
              View all
            </Link>
          }
        >
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={weekDays} margin={{ top: 16, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fontSize: 11 }} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(15,118,110,0.06)' }} />
              <Bar isAnimationActive={false} dataKey="count" name="Follow-ups" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {weekDays.map((w, i) => (
                  <Cell key={w.date} fill={i === 0 ? BLUE : TEAL} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {d.followUpsThisWeek.leads.length === 0 ? (
            <p className="muted small">No follow-ups scheduled this week.</p>
          ) : (
            <ul className="mini-list">
              {d.followUpsThisWeek.leads.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <Link to={`/leads/${l.id}`}>
                    <span className="mini-main">
                      <strong>{l.businessName}</strong>
                      <span className="muted small">{l.district}</span>
                    </span>
                    <InterestBadge value={l.interest} />
                    <span className={`small nowrap${l.followUpDate === d.today ? ' text-today' : ''}`}>{relativeDue(l.followUpDate!)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard
          title="Top locations by hot/warm leads"
          subtitle="Districts with the highest concentration of promising leads"
          wide
          table={{
            head: ['District', 'Hot', 'Warm', 'Total leads', 'Hot+Warm share'],
            rows: d.topDistricts.map((t) => [t.district, t.hot, t.warm, t.total, fmtPct(t.share)]),
          }}
        >
          <div className="top-grid">
            <ol className="top-list">
              {d.topDistricts.map((t) => (
                <li key={t.district}>
                  <Link to={`/leads?district=${encodeURIComponent(t.district)}&interest=HOT,WARM`} className="top-row">
                    <span className="top-name">{t.district}</span>
                    <span className="top-bar" aria-hidden="true">
                      <span style={{ width: `${(t.hot / maxTop) * 100}%`, background: INTEREST_COLORS.HOT }} />
                      <span style={{ width: `${(t.warm / maxTop) * 100}%`, background: INTEREST_COLORS.WARM }} />
                    </span>
                    <span className="top-nums small">
                      <strong>{t.hot}</strong> hot · <strong>{t.warm}</strong> warm
                      <span className="muted"> · {fmtPct(t.share)} of {t.total}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <div>
              <h3 className="sub-title">Hotspot locations</h3>
              <ul className="chip-list">
                {d.topLocations.map((l) => (
                  <li key={`${l.location}-${l.district}`}>
                    <Link to={`/leads?q=${encodeURIComponent(l.location)}`} className="loc-chip">
                      <Icon name="pin" size={14} />
                      <span>
                        {l.location}
                        <span className="muted"> · {l.district}</span>
                      </span>
                      {l.hot > 0 && <span className="loc-count hot">{l.hot} hot</span>}
                      {l.warm > 0 && <span className="loc-count warm">{l.warm} warm</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ChartCard>
      </div>
    </>
  );
}

function Kpi({
  label: text,
  value,
  to,
  icon,
  accent,
  hint,
  hintTone,
}: {
  label: string;
  value: number | string;
  to?: string;
  icon?: string;
  accent?: string;
  hint?: string;
  hintTone?: 'danger';
}) {
  const body = (
    <>
      <div className="kpi-top">
        <span className="kpi-label">{text}</span>
        {accent ? <span className="kpi-accent" style={{ background: accent }} aria-hidden="true" /> : icon && <Icon name={icon} size={18} className="kpi-icon" />}
      </div>
      <div className="kpi-value">{value}</div>
      {hint && <div className={`kpi-hint${hintTone === 'danger' ? ' text-danger' : ''}`}>{hint}</div>}
    </>
  );
  return to ? (
    <Link to={to} className="card kpi">
      {body}
    </Link>
  ) : (
    <div className="card kpi">{body}</div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  table,
  wide,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  table?: { head: string[]; rows: (string | number)[][] };
  wide?: boolean;
  action?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const id = title.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <section className={`card chart-card${wide ? ' wide' : ''}`} aria-labelledby={id}>
      <div className="chart-head">
        <div>
          <h2 id={id} className="card-title">
            {title}
          </h2>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        <div className="chart-head-actions">
          {action}
          {table && (
            <button type="button" className="link-sm" aria-pressed={showTable} onClick={() => setShowTable((s) => !s)}>
              {showTable ? 'Chart' : 'Table'}
            </button>
          )}
        </div>
      </div>
      {showTable && table ? (
        <div className="table-wrap">
          <table className="table table-compact">
            <thead>
              <tr>
                {table.head.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
