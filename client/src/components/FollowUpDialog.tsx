import { useState, type FormEvent } from 'react';
import { api, ApiError, type Lead } from '../lib/api';
import { STATUSES, label, type LeadStatus } from '../lib/constants';
import { addDaysISO, fmtDate, todayISO } from '../lib/format';
import { Modal, useToast } from './ui';

/** Log a follow-up: add a note, optionally mark the current follow-up done and/or schedule the next one. */
export default function FollowUpDialog({
  lead,
  defaultComplete = true,
  onClose,
  onSaved,
}: {
  lead: Lead;
  defaultComplete?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState('');
  const [markComplete, setMarkComplete] = useState(defaultComplete);
  const [next, setNext] = useState('');
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const today = todayISO();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('Add a short note about this follow-up');
      document.getElementById('fu-note')?.focus();
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await api.addFollowUp(lead.id, {
        note: note.trim(),
        outcome: outcome.trim() || undefined,
        markComplete,
        nextFollowUpDate: next || undefined,
        status: status !== lead.status ? status : undefined,
        createdBy: localStorageGet('cwlc.collectedBy') || lead.collectedBy || undefined,
      });
      toast('success', markComplete ? 'Follow-up marked as completed' : 'Note added');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError && err.fieldErrors ? Object.values(err.fieldErrors)[0] : (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={markComplete ? 'Complete follow-up' : 'Add follow-up note'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="followup-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : markComplete ? 'Mark completed' : 'Save note'}
          </button>
        </>
      }
    >
      <form id="followup-form" onSubmit={submit} noValidate className="stack">
        <p className="muted small">
          <strong>{lead.businessName}</strong> · {lead.contactName}
          {lead.followUpDate && <> · due {fmtDate(lead.followUpDate)}</>}
        </p>
        <div className={`field${error ? ' has-error' : ''}`}>
          <label htmlFor="fu-note">
            Note <span className="req" aria-hidden="true">*</span>
          </label>
          <textarea
            id="fu-note"
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was discussed?"
            aria-invalid={!!error}
            aria-describedby={error ? 'fu-err' : undefined}
          />
          {error && (
            <p className="error" id="fu-err" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="fu-outcome">Outcome</label>
            <input id="fu-outcome" list="fu-outcomes" value={outcome} onChange={(e) => setOutcome(e.target.value)} maxLength={120} />
            <datalist id="fu-outcomes">
              {['Called - no answer', 'Interested', 'Demo scheduled', 'Asked to call later', 'Sent pricing', 'Not interested'].map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="fu-status">Update status</label>
            <select id="fu-status" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={markComplete} onChange={(e) => setMarkComplete(e.target.checked)} />
          Mark current follow-up as completed
        </label>
        <div className="field">
          <label htmlFor="fu-next">Schedule next follow-up (optional)</label>
          <input id="fu-next" type="date" min={today} value={next} onChange={(e) => setNext(e.target.value)} />
          <div className="quick-dates" role="group" aria-label="Quick next follow-up dates">
            {[
              ['Tomorrow', 1],
              ['+3 days', 3],
              ['+1 week', 7],
            ].map(([l, d]) => (
              <button key={l} type="button" className="chip" onClick={() => setNext(addDaysISO(today, d as number))}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function localStorageGet(k: string) {
  try {
    return localStorage.getItem(k) ?? '';
  } catch {
    return '';
  }
}
