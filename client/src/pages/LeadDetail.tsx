import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { label } from '../lib/constants';
import { fmtDate, fmtDateTime, fmtMobile, mapsHref } from '../lib/format';
import { ConfirmDialog, EmptyState, ErrorState, Icon, InterestBadge, Loading, StatusBadge, useAsync, useToast } from '../components/ui';
import FollowUpDialog from '../components/FollowUpDialog';
import { FollowUpCell } from './LeadsList';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: lead, error, loading, reload } = useAsync(() => api.getLead(id!), [id]);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [followUp, setFollowUp] = useState<null | 'complete' | 'note'>(null);

  if (loading && !lead) return <Loading label="Loading lead…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!lead) return null;

  const remove = async () => {
    setDeleting(true);
    try {
      await api.deleteLead(lead.id);
      toast('success', `Deleted ${lead.businessName}`);
      navigate('/leads');
    } catch (e) {
      toast('error', (e as Error).message);
      setDeleting(false);
    }
  };

  const wa = lead.whatsapp ?? null;
  const pendingFollowUp = lead.followUpDate && !lead.followUpCompleted;

  return (
    <div className="detail">
      <Link to="/leads" className="back-link">
        <Icon name="chevronLeft" size={16} /> All leads
      </Link>

      <div className="detail-head card">
        <div>
          <span className="serial">{lead.serial}</span>
          <h1>{lead.businessName}</h1>
          <p className="muted">
            {lead.contactName} · {lead.location}, {lead.district}
          </p>
          <div className="badges">
            <InterestBadge value={lead.interest} />
            <StatusBadge value={lead.status} />
          </div>
        </div>
        <div className="detail-actions">
          <a href={`tel:${lead.mobile}`} className="btn btn-secondary">
            <Icon name="phone" size={16} /> Call
          </a>
          {wa && (
            <a href={`https://wa.me/91${wa}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              <Icon name="chat" size={16} /> WhatsApp
            </a>
          )}
          <Link to={`/leads/${lead.id}/edit`} className="btn btn-secondary">
            <Icon name="edit" size={16} /> Edit
          </Link>
          <button type="button" className="btn btn-danger-outline" onClick={() => setConfirming(true)}>
            <Icon name="trash" size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <section className="card" aria-labelledby="info-h">
          <h2 id="info-h" className="card-title">
            Lead information
          </h2>
          <dl className="info-list">
            <Info term="Mobile">
              <a href={`tel:${lead.mobile}`}>{fmtMobile(lead.mobile)}</a>
            </Info>
            <Info term="WhatsApp">{wa ? fmtMobile(wa) : '—'}</Info>
            <Info term="Location">
              {lead.location}, {lead.district}
            </Info>
            <Info term="Map">
              {lead.mapsLink ? (
                <a href={mapsHref(lead.mapsLink)} target="_blank" rel="noopener noreferrer">
                  <Icon name="pin" size={14} /> Open in Google Maps
                </a>
              ) : (
                '—'
              )}
            </Info>
            <Info term="Car wash type">{label(lead.washType) || '—'}</Info>
            <Info term="Est. daily vehicles">{lead.dailyVehicles ?? '—'}</Info>
            <Info term="Current system">{label(lead.currentSystem) || '—'}</Info>
            <Info term="Collected by">{lead.collectedBy || '—'}</Info>
            <Info term="Created">{fmtDateTime(lead.createdAt)}</Info>
            <Info term="Last updated">{fmtDateTime(lead.updatedAt)}</Info>
          </dl>
          <h3 className="sub-title">Pain points / remarks</h3>
          <p className="remarks">{lead.remarks || <span className="muted">No remarks recorded.</span>}</p>
        </section>

        <section className="card" aria-labelledby="fu-h">
          <div className="card-title-row">
            <h2 id="fu-h" className="card-title">
              Follow-up
            </h2>
          </div>
          <div className={`followup-box${pendingFollowUp ? '' : ' muted-box'}`}>
            <div>
              <span className="muted small">Next follow-up</span>
              <div>{lead.followUpDate ? <FollowUpCell lead={lead} /> : <span className="muted">Not scheduled</span>}</div>
            </div>
            <div className="followup-box-actions">
              {pendingFollowUp && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setFollowUp('complete')}>
                  <Icon name="check" size={16} /> Mark completed
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFollowUp('note')}>
                <Icon name="add" size={16} /> Add note
              </button>
            </div>
          </div>

          <h3 className="sub-title">History</h3>
          {lead.followUps.length === 0 ? (
            <EmptyState title="No follow-up notes yet" icon="clock" />
          ) : (
            <ol className="timeline">
              {lead.followUps.map((f) => (
                <li key={f.id}>
                  <span className={`timeline-dot${f.completed ? ' done' : ''}`} aria-hidden="true" />
                  <div>
                    <div className="timeline-head">
                      <strong>{f.outcome || (f.completed ? 'Follow-up completed' : 'Note')}</strong>
                      <time className="muted small" dateTime={f.createdAt}>
                        {fmtDateTime(f.createdAt)}
                      </time>
                    </div>
                    <p>{f.note}</p>
                    <p className="muted small">
                      {f.createdBy && <>by {f.createdBy}</>}
                      {f.scheduledFor && <> · was due {fmtDate(f.scheduledFor)}</>}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Delete lead?"
          message={
            <>
              This permanently deletes <strong>{lead.businessName}</strong> ({lead.serial}) and its follow-up history. This cannot be undone.
            </>
          }
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        />
      )}
      {followUp && (
        <FollowUpDialog
          lead={lead}
          defaultComplete={followUp === 'complete'}
          onClose={() => setFollowUp(null)}
          onSaved={() => {
            setFollowUp(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function Info({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}
