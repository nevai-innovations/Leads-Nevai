import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Lead } from '../lib/api';
import { fmtDate, fmtMobile, relativeDue } from '../lib/format';
import { EmptyState, ErrorState, Icon, InterestBadge, Loading, PageHeader, StatusBadge, useAsync } from '../components/ui';
import FollowUpDialog from '../components/FollowUpDialog';

export default function FollowUps() {
  const { data, error, loading, reload } = useAsync(() => api.followUps(), []);
  const [active, setActive] = useState<Lead | null>(null);

  if (loading && !data) return <Loading label="Loading follow-ups…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const nothing = !data.overdue.length && !data.today.length && !data.upcoming.length;

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        subtitle={
          <>
            <span className="text-danger">{data.overdue.length} overdue</span> · {data.today.length} due today · {data.upcoming.length} in the next 7 days
          </>
        }
      />

      {nothing ? (
        <EmptyState title="You're all caught up" icon="check">
          <p className="muted">No pending follow-ups. Schedule one from a lead's page.</p>
        </EmptyState>
      ) : (
        <div className="fu-sections">
          <FuSection id="overdue" title="Overdue" tone="danger" leads={data.overdue} onComplete={setActive} emptyText="Nothing overdue." />
          <FuSection id="today" title="Due today" tone="today" leads={data.today} onComplete={setActive} emptyText="Nothing due today." />
          <FuSection id="upcoming" title="Next 7 days" tone="default" leads={data.upcoming} onComplete={setActive} emptyText="Nothing scheduled this week." />
        </div>
      )}

      {active && (
        <FollowUpDialog
          lead={active}
          onClose={() => setActive(null)}
          onSaved={() => {
            setActive(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function FuSection({
  id,
  title,
  tone,
  leads,
  onComplete,
  emptyText,
}: {
  id: string;
  title: string;
  tone: 'danger' | 'today' | 'default';
  leads: Lead[];
  onComplete: (l: Lead) => void;
  emptyText: string;
}) {
  return (
    <section className={`fu-section tone-${tone}`} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>
        {tone === 'danger' && <Icon name="alert" size={18} />}
        {title} <span className="count">{leads.length}</span>
      </h2>
      {leads.length === 0 ? (
        <p className="muted small fu-empty">{emptyText}</p>
      ) : (
        <ul className="fu-list">
          {leads.map((l) => (
            <li key={l.id} className={`card fu-item${tone === 'danger' ? ' overdue' : ''}`}>
              <div className="fu-main">
                <div className="fu-due">
                  <strong>{fmtDate(l.followUpDate)}</strong>
                  <span>{relativeDue(l.followUpDate!)}</span>
                </div>
                <div className="fu-info">
                  <Link to={`/leads/${l.id}`} className="row-title">
                    {l.businessName}
                  </Link>
                  <span className="muted small">
                    {l.contactName} · {l.location}, {l.district} · {l.collectedBy}
                  </span>
                  <div className="badges">
                    <InterestBadge value={l.interest} />
                    <StatusBadge value={l.status} />
                  </div>
                </div>
              </div>
              <div className="fu-actions">
                <a href={`tel:${l.mobile}`} className="btn btn-secondary btn-sm" aria-label={`Call ${l.contactName} on ${fmtMobile(l.mobile)}`}>
                  <Icon name="phone" size={16} /> Call
                </a>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => onComplete(l)}>
                  <Icon name="check" size={16} /> Mark completed
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
