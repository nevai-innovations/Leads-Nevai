import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Lead } from '../lib/api';
import { INTERESTS, STATUSES, label } from '../lib/constants';
import { daysFromToday, fmtDate, fmtMobile, relativeDue } from '../lib/format';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  InterestBadge,
  Loading,
  PageHeader,
  StatusBadge,
  useAsync,
  useToast,
} from '../components/ui';

const FILTER_KEYS = ['q', 'interest', 'status', 'district', 'collectedBy', 'followUp', 'followUpFrom', 'followUpTo', 'sort'] as const;

export default function LeadsList() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [showFilters, setShowFilters] = useState(false);
  const [toDelete, setToDelete] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filters = useMemo(() => {
    const f: Record<string, string | undefined> = {};
    for (const k of FILTER_KEYS) f[k] = params.get(k) ?? undefined;
    return f;
  }, [params]);
  const page = Number(params.get('page') ?? 1) || 1;
  const pageSize = Number(params.get('pageSize') ?? 10) || 10;

  const update = (patch: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== search.trim()) update({ q: search.trim() || undefined });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const meta = useAsync(() => api.meta(), []);
  const list = useAsync(() => api.listLeads({ ...filters, page: String(page), pageSize: String(pageSize) }), [params.toString()]);

  const activeFilterCount = FILTER_KEYS.filter((k) => k !== 'q' && k !== 'sort' && filters[k]).length;

  const clearAll = () => {
    setSearch('');
    setParams(new URLSearchParams(), { replace: true });
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteLead(toDelete.id);
      toast('success', `Deleted ${toDelete.businessName}`);
      setToDelete(null);
      list.reload();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const exportParams = { ...filters };

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={list.data ? `${list.data.total} lead${list.data.total === 1 ? '' : 's'}${activeFilterCount || filters.q ? ' match your filters' : ''}` : ' '}
        actions={
          <>
            <a className="btn btn-secondary" href={api.exportUrl('csv', exportParams)} download>
              <Icon name="download" size={16} /> CSV
            </a>
            <a className="btn btn-secondary" href={api.exportUrl('xlsx', exportParams)} download>
              <Icon name="download" size={16} /> Excel
            </a>
            <Link to="/leads/new" className="btn btn-primary hide-mobile">
              <Icon name="add" size={16} /> Add lead
            </Link>
          </>
        }
      />

      <section className="card toolbar" aria-label="Search and filters">
        <div className="toolbar-row">
          <div className="search">
            <Icon name="search" size={18} />
            <label htmlFor="lead-search" className="sr-only">
              Search leads
            </label>
            <input
              id="lead-search"
              type="search"
              placeholder="Search name, mobile, location, district…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="toolbar-sort">
            <label htmlFor="sort" className="sr-only">
              Sort by
            </label>
            <select id="sort" value={filters.sort ?? 'latest'} onChange={(e) => update({ sort: e.target.value === 'latest' ? undefined : e.target.value })}>
              <option value="latest">Sort: Latest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="followUp">Sort: Follow-up date</option>
              <option value="interest">Sort: Interest level</option>
              <option value="serial">Sort: Serial no.</option>
            </select>
          </div>
          <button
            type="button"
            className="btn btn-secondary filter-toggle"
            aria-expanded={showFilters}
            aria-controls="filter-panel"
            onClick={() => setShowFilters((s) => !s)}
          >
            <Icon name="filter" size={16} /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
        </div>

        <div id="filter-panel" className={`filter-grid${showFilters ? ' open' : ''}`}>
          <FilterSelect id="f-interest" label="Interest" value={filters.interest} onChange={(v) => update({ interest: v })}>
            {INTERESTS.map((i) => (
              <option key={i} value={i}>
                {label(i)}
              </option>
            ))}
            <option value="UNRATED">Not rated</option>
            <option value="HOT,WARM">Hot + Warm</option>
          </FilterSelect>
          <FilterSelect id="f-status" label="Status" value={filters.status} onChange={(v) => update({ status: v })}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect id="f-district" label="District" value={filters.district} onChange={(v) => update({ district: v })}>
            {meta.data?.districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </FilterSelect>
          <FilterSelect id="f-collector" label="Collected by" value={filters.collectedBy} onChange={(v) => update({ collectedBy: v })}>
            {meta.data?.collectors.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </FilterSelect>
          <FilterSelect id="f-followup" label="Follow-up" value={filters.followUp} onChange={(v) => update({ followUp: v })}>
            <option value="today">Due today</option>
            <option value="overdue">Overdue</option>
            <option value="week">Next 7 days</option>
            <option value="any">Has follow-up date</option>
            <option value="none">No follow-up date</option>
          </FilterSelect>
          <div className="field">
            <label htmlFor="f-from">Follow-up from</label>
            <input id="f-from" type="date" value={filters.followUpFrom ?? ''} onChange={(e) => update({ followUpFrom: e.target.value || undefined })} />
          </div>
          <div className="field">
            <label htmlFor="f-to">Follow-up to</label>
            <input id="f-to" type="date" value={filters.followUpTo ?? ''} onChange={(e) => update({ followUpTo: e.target.value || undefined })} />
          </div>
          <div className="field field-end">
            <button type="button" className="btn btn-ghost" onClick={clearAll} disabled={!activeFilterCount && !filters.q && !filters.sort}>
              Clear all
            </button>
          </div>
        </div>
      </section>

      {list.loading && !list.data ? (
        <Loading label="Loading leads…" />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data?.data.length ? (
        <EmptyState title={activeFilterCount || filters.q ? 'No leads match these filters' : 'No leads yet'}>
          {activeFilterCount || filters.q ? (
            <button type="button" className="btn btn-secondary" onClick={clearAll}>
              Clear filters
            </button>
          ) : (
            <Link to="/leads/new" className="btn btn-primary">
              Add your first lead
            </Link>
          )}
        </EmptyState>
      ) : (
        <div className={list.loading ? 'is-refreshing' : undefined} aria-busy={list.loading}>
          {/* Desktop table */}
          <div className="card table-wrap hide-mobile">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">S.No</th>
                  <th scope="col">Business</th>
                  <th scope="col">Mobile</th>
                  <th scope="col">Location</th>
                  <th scope="col">Interest</th>
                  <th scope="col">Status</th>
                  <th scope="col">Follow-up</th>
                  <th scope="col">Collected by</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.data.data.map((l) => (
                  <tr key={l.id} className="clickable" onClick={() => navigate(`/leads/${l.id}`)}>
                    <td className="serial">{l.serial}</td>
                    <td>
                      <Link to={`/leads/${l.id}`} className="row-title" onClick={(e) => e.stopPropagation()}>
                        {l.businessName}
                      </Link>
                      <div className="muted small">{l.contactName}</div>
                    </td>
                    <td className="nowrap">{fmtMobile(l.mobile)}</td>
                    <td>
                      {l.location}
                      <div className="muted small">{l.district}</div>
                    </td>
                    <td>
                      <InterestBadge value={l.interest} />
                    </td>
                    <td>
                      <StatusBadge value={l.status} />
                    </td>
                    <td className="nowrap">
                      <FollowUpCell lead={l} />
                    </td>
                    <td>{l.collectedBy || <span className="muted">—</span>}</td>
                    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/leads/${l.id}/edit`} className="icon-btn" aria-label={`Edit ${l.businessName}`} title="Edit">
                        <Icon name="edit" size={16} />
                      </Link>
                      <button type="button" className="icon-btn danger" aria-label={`Delete ${l.businessName}`} title="Delete" onClick={() => setToDelete(l)}>
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="lead-cards show-mobile">
            {list.data.data.map((l) => (
              <li key={l.id} className="card lead-card">
                <Link to={`/leads/${l.id}`} className="lead-card-main">
                  <div className="lead-card-top">
                    <span className="serial">{l.serial}</span>
                    <InterestBadge value={l.interest} />
                  </div>
                  <strong>{l.businessName}</strong>
                  <span className="muted small">
                    {l.contactName} · {l.location}, {l.district}
                  </span>
                  <div className="lead-card-meta">
                    <StatusBadge value={l.status} />
                    <FollowUpCell lead={l} />
                  </div>
                </Link>
                <div className="lead-card-actions">
                  <a href={`tel:${l.mobile}`} className="btn btn-ghost btn-sm" aria-label={`Call ${l.contactName}`}>
                    <Icon name="phone" size={16} /> Call
                  </a>
                  <Link to={`/leads/${l.id}/edit`} className="btn btn-ghost btn-sm">
                    <Icon name="edit" size={16} /> Edit
                  </Link>
                  <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => setToDelete(l)}>
                    <Icon name="trash" size={16} /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={list.data.page}
            totalPages={list.data.totalPages}
            total={list.data.total}
            pageSize={pageSize}
            onPage={(p) => update({ page: p > 1 ? String(p) : undefined }, false)}
            onPageSize={(s) => update({ pageSize: s === 10 ? undefined : String(s) })}
          />
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete lead?"
          message={
            <>
              This permanently deletes <strong>{toDelete.businessName}</strong> ({toDelete.serial}) and its follow-up history. This cannot be undone.
            </>
          }
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

export function FollowUpCell({ lead }: { lead: Lead }) {
  if (!lead.followUpDate) return <span className="muted">—</span>;
  if (lead.followUpCompleted)
    return (
      <span className="muted small">
        <Icon name="check" size={14} /> Done · {fmtDate(lead.followUpDate)}
      </span>
    );
  const d = daysFromToday(lead.followUpDate);
  const cls = d < 0 ? 'due due-overdue' : d === 0 ? 'due due-today' : 'due';
  return (
    <span className={cls}>
      {fmtDate(lead.followUpDate)}
      <small>{relativeDue(lead.followUpDate)}</small>
    </span>
  );
}

function FilterSelect({
  id,
  label: text,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{text}</label>
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">All</option>
        {children}
      </select>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted small">
        {from}–{to} of {total}
      </span>
      <div className="pagination-controls">
        <label htmlFor="page-size" className="sr-only">
          Rows per page
        </label>
        <select id="page-size" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button type="button" className="icon-btn" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <Icon name="chevronLeft" />
        </button>
        <span aria-current="page">
          Page {page} of {totalPages}
        </span>
        <button type="button" className="icon-btn" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          <Icon name="chevronRight" />
        </button>
      </div>
    </nav>
  );
}
