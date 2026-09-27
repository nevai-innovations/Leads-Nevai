import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type LeadInput } from '../lib/api';
import { CURRENT_SYSTEMS, INTEREST_COLORS, INTERESTS, KERALA_DISTRICTS, STATUSES, WASH_TYPES, label } from '../lib/constants';
import { addDaysISO, fmtDateTime, todayISO } from '../lib/format';
import { ErrorState, Icon, Loading, PageHeader, useToast } from '../components/ui';

const COLLECTOR_KEY = 'cwlc.collectedBy';

function readCollector() {
  try {
    return localStorage.getItem(COLLECTOR_KEY) ?? '';
  } catch {
    return '';
  }
}

const empty = (): LeadInput => ({
  businessName: '',
  contactName: '',
  mobile: '',
  whatsapp: '',
  location: '',
  district: '',
  mapsLink: '',
  washType: '',
  dailyVehicles: '',
  currentSystem: '',
  remarks: '',
  interest: '',
  followUpDate: '',
  status: 'NEW',
  collectedBy: readCollector(),
});

const MOBILE_RE = /^(?:\+?91|0)?([6-9]\d{9})$/;
const cleanMobile = (v: string) => v.replace(/[\s\-()]/g, '');

type Errors = Partial<Record<keyof LeadInput, string>>;

function validate(v: LeadInput): Errors {
  const e: Errors = {};
  const req = (k: keyof LeadInput, name: string) => {
    if (!String(v[k]).trim()) e[k] = `${name} is required`;
  };
  req('businessName', 'Business name');
  req('contactName', 'Contact person');
  req('location', 'Location');
  req('district', 'District');
  req('collectedBy', 'Collected by');
  if (!v.mobile.trim()) e.mobile = 'Mobile number is required';
  else if (!MOBILE_RE.test(cleanMobile(v.mobile))) e.mobile = 'Enter a valid 10-digit mobile number (starts with 6–9)';
  if (v.whatsapp.trim() && !MOBILE_RE.test(cleanMobile(v.whatsapp))) e.whatsapp = 'Enter a valid 10-digit WhatsApp number';
  if (!v.washType) e.washType = 'Select a car wash type';
  if (!v.currentSystem) e.currentSystem = 'Select the current system';
  if (!v.interest) e.interest = 'Select probability of interest';
  if (v.dailyVehicles === '') e.dailyVehicles = 'Estimated daily vehicles is required';
  else if (!/^\d+$/.test(v.dailyVehicles) || Number(v.dailyVehicles) > 10000) e.dailyVehicles = 'Enter a whole number between 0 and 10000';
  return e;
}

// Order in which errors are focused
const FIELD_ORDER: (keyof LeadInput)[] = [
  'businessName', 'contactName', 'mobile', 'whatsapp', 'location', 'district', 'mapsLink', 'washType',
  'dailyVehicles', 'currentSystem', 'remarks', 'interest', 'followUpDate', 'status', 'collectedBy',
];

export default function LeadForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState<LeadInput>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [loadState, setLoadState] = useState<{ loading: boolean; error?: string }>({ loading: isEdit });
  const [meta, setMeta] = useState<{ serial?: string; createdAt?: string; updatedAt?: string }>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [collectors, setCollectors] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api.meta().then((m) => setCollectors(m.collectors)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) {
      setValues(empty());
      setMeta({});
      setErrors({});
      setLoadState({ loading: false });
      return;
    }
    setLoadState({ loading: true });
    api
      .getLead(id)
      .then((l) => {
        setValues({
          businessName: l.businessName,
          contactName: l.contactName,
          mobile: l.mobile,
          whatsapp: l.whatsapp ?? '',
          location: l.location,
          district: l.district,
          mapsLink: l.mapsLink ?? '',
          washType: l.washType,
          dailyVehicles: String(l.dailyVehicles),
          currentSystem: l.currentSystem,
          remarks: l.remarks ?? '',
          interest: l.interest,
          followUpDate: l.followUpDate ?? '',
          status: l.status,
          collectedBy: l.collectedBy,
        });
        setMeta({ serial: l.serial, createdAt: l.createdAt, updatedAt: l.updatedAt });
        setLoadState({ loading: false });
      })
      .catch((e: Error) => setLoadState({ loading: false, error: e.message }));
  }, [id, reloadKey]);

  const set = <K extends keyof LeadInput>(k: K, v: LeadInput[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const focusFirstError = (errs: Errors) => {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
    el?.focus();
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const submit = async (e: FormEvent<HTMLFormElement>, addAnother = false) => {
    e.preventDefault();
    setFormError(undefined);
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirstError(errs);
      return;
    }
    setSaving(true);
    try {
      const lead = isEdit ? await api.updateLead(id!, values) : await api.createLead(values);
      try {
        localStorage.setItem(COLLECTOR_KEY, values.collectedBy.trim());
      } catch {
        /* storage unavailable */
      }
      toast('success', isEdit ? `Lead ${lead.serial} updated` : `Lead ${lead.serial} saved`);
      if (addAnother) {
        setValues({ ...empty(), collectedBy: values.collectedBy, district: values.district });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        formRef.current?.querySelector<HTMLElement>('[name="businessName"]')?.focus();
      } else {
        navigate(`/leads/${lead.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(err.fieldErrors as Errors);
        focusFirstError(err.fieldErrors as Errors);
        setFormError('Please fix the highlighted fields.');
      } else {
        setFormError((err as Error).message);
      }
    } finally {
      setSaving(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast('error', 'Location is not available on this device');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('mapsLink', `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
        setLocating(false);
      },
      () => {
        toast('error', 'Could not get your location. Check location permission.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  if (loadState.loading) return <Loading label="Loading lead…" />;
  if (loadState.error) return <ErrorState message={loadState.error} onRetry={() => setReloadKey((k) => k + 1)} />;

  const errorCount = Object.values(errors).filter(Boolean).length;
  const today = todayISO();

  return (
    <div className="form-page">
      <PageHeader
        title={isEdit ? 'Edit lead' : 'Add lead'}
        subtitle={
          isEdit ? (
            <>
              <span className="serial">{meta.serial}</span> · Created {meta.createdAt && fmtDateTime(meta.createdAt)} · Updated{' '}
              {meta.updatedAt && fmtDateTime(meta.updatedAt)}
            </>
          ) : (
            'Record a car wash centre visit. Fields marked * are required.'
          )
        }
      />

      <form ref={formRef} onSubmit={(e) => submit(e)} noValidate className="lead-form">
        {errorCount > 0 && (
          <div className="alert alert-error" role="alert">
            <Icon name="alert" /> {formError ?? `Please fix ${errorCount} field${errorCount > 1 ? 's' : ''} below.`}
          </div>
        )}
        {formError && errorCount === 0 && (
          <div className="alert alert-error" role="alert">
            <Icon name="alert" /> {formError}
          </div>
        )}

        <fieldset className="card form-section">
          <legend>Business</legend>
          <div className="field-grid">
            <Field label="Serial number" htmlFor="serial" hint={isEdit ? undefined : 'Assigned automatically when saved'}>
              <input id="serial" value={meta.serial ?? 'Auto-generated'} readOnly disabled className="readonly" />
            </Field>
            <Field label="Business / car wash name" required htmlFor="businessName" error={errors.businessName}>
              <input
                id="businessName"
                name="businessName"
                value={values.businessName}
                onChange={(e) => set('businessName', e.target.value)}
                autoComplete="organization"
                maxLength={120}
                aria-invalid={!!errors.businessName}
                aria-describedby={errors.businessName ? 'businessName-err' : undefined}
                autoFocus={!isEdit}
              />
            </Field>
            <Field label="Owner / contact person" required htmlFor="contactName" error={errors.contactName}>
              <input
                id="contactName"
                name="contactName"
                value={values.contactName}
                onChange={(e) => set('contactName', e.target.value)}
                autoComplete="name"
                maxLength={120}
                aria-invalid={!!errors.contactName}
                aria-describedby={errors.contactName ? 'contactName-err' : undefined}
              />
            </Field>
            <Field label="Mobile number" required htmlFor="mobile" error={errors.mobile} hint="10 digits, e.g. 98470 12345">
              <input
                id="mobile"
                name="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={values.mobile}
                onChange={(e) => set('mobile', e.target.value)}
                maxLength={16}
                aria-invalid={!!errors.mobile}
                aria-describedby={errors.mobile ? 'mobile-err' : 'mobile-hint'}
              />
            </Field>
            <Field label="WhatsApp number" htmlFor="whatsapp" error={errors.whatsapp}>
              <div className="input-with-action">
                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  inputMode="tel"
                  value={values.whatsapp}
                  onChange={(e) => set('whatsapp', e.target.value)}
                  maxLength={16}
                  aria-invalid={!!errors.whatsapp}
                  aria-describedby={errors.whatsapp ? 'whatsapp-err' : undefined}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('whatsapp', values.mobile)} disabled={!values.mobile}>
                  Same as mobile
                </button>
              </div>
            </Field>
          </div>
        </fieldset>

        <fieldset className="card form-section">
          <legend>Location</legend>
          <div className="field-grid">
            <Field label="Location / area" required htmlFor="location" error={errors.location}>
              <input
                id="location"
                name="location"
                value={values.location}
                onChange={(e) => set('location', e.target.value)}
                maxLength={120}
                placeholder="e.g. Edappally"
                aria-invalid={!!errors.location}
                aria-describedby={errors.location ? 'location-err' : undefined}
              />
            </Field>
            <Field label="District" required htmlFor="district" error={errors.district}>
              <select
                id="district"
                name="district"
                value={values.district}
                onChange={(e) => set('district', e.target.value)}
                aria-invalid={!!errors.district}
                aria-describedby={errors.district ? 'district-err' : undefined}
              >
                <option value="">Select district</option>
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
                {values.district && !KERALA_DISTRICTS.includes(values.district) && <option>{values.district}</option>}
              </select>
            </Field>
            <Field label="Google Maps link or coordinates" htmlFor="mapsLink" error={errors.mapsLink} wide>
              <div className="input-with-action">
                <input
                  id="mapsLink"
                  name="mapsLink"
                  value={values.mapsLink}
                  onChange={(e) => set('mapsLink', e.target.value)}
                  maxLength={500}
                  inputMode="url"
                  placeholder="https://maps.app.goo.gl/… or 9.98,76.28"
                  aria-invalid={!!errors.mapsLink}
                  aria-describedby={errors.mapsLink ? 'mapsLink-err' : undefined}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={useMyLocation} disabled={locating}>
                  <Icon name="pin" size={16} /> {locating ? 'Locating…' : 'Use my location'}
                </button>
              </div>
            </Field>
          </div>
        </fieldset>

        <fieldset className="card form-section">
          <legend>Operations</legend>
          <ChoiceGroup
            name="washType"
            legend="Type of car wash"
            required
            options={WASH_TYPES}
            value={values.washType}
            onChange={(v) => set('washType', v)}
            error={errors.washType}
          />
          <div className="field-grid">
            <Field label="Estimated daily vehicles" required htmlFor="dailyVehicles" error={errors.dailyVehicles}>
              <input
                id="dailyVehicles"
                name="dailyVehicles"
                type="number"
                inputMode="numeric"
                min={0}
                max={10000}
                step={1}
                value={values.dailyVehicles}
                onChange={(e) => set('dailyVehicles', e.target.value)}
                aria-invalid={!!errors.dailyVehicles}
                aria-describedby={errors.dailyVehicles ? 'dailyVehicles-err' : undefined}
              />
            </Field>
          </div>
          <ChoiceGroup
            name="currentSystem"
            legend="Current system used"
            required
            options={CURRENT_SYSTEMS}
            value={values.currentSystem}
            onChange={(v) => set('currentSystem', v)}
            error={errors.currentSystem}
          />
          <Field label="Pain points / remarks" htmlFor="remarks" wide>
            <textarea
              id="remarks"
              name="remarks"
              rows={3}
              maxLength={2000}
              value={values.remarks}
              onChange={(e) => set('remarks', e.target.value)}
              placeholder="What problems do they face today? What would they pay for?"
            />
          </Field>
        </fieldset>

        <fieldset className="card form-section">
          <legend>Opportunity</legend>
          <ChoiceGroup
            name="interest"
            legend="Probability of interest"
            required
            options={INTERESTS}
            value={values.interest}
            onChange={(v) => set('interest', v)}
            error={errors.interest}
            dots
          />
          <div className="field-grid">
            <Field label="Lead status" required htmlFor="status">
              <select id="status" name="status" value={values.status} onChange={(e) => set('status', e.target.value as LeadInput['status'])}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Follow-up date" htmlFor="followUpDate" error={errors.followUpDate}>
              <input
                id="followUpDate"
                name="followUpDate"
                type="date"
                value={values.followUpDate}
                onChange={(e) => set('followUpDate', e.target.value)}
              />
              <div className="quick-dates" role="group" aria-label="Quick follow-up dates">
                {[
                  ['Tomorrow', 1],
                  ['+3 days', 3],
                  ['+1 week', 7],
                  ['+2 weeks', 14],
                ].map(([l, d]) => (
                  <button key={l} type="button" className="chip" onClick={() => set('followUpDate', addDaysISO(today, d as number))}>
                    {l}
                  </button>
                ))}
                {values.followUpDate && (
                  <button type="button" className="chip chip-muted" onClick={() => set('followUpDate', '')}>
                    Clear
                  </button>
                )}
              </div>
            </Field>
            <Field label="Data collected by" required htmlFor="collectedBy" error={errors.collectedBy}>
              <input
                id="collectedBy"
                name="collectedBy"
                list="collectors"
                value={values.collectedBy}
                onChange={(e) => set('collectedBy', e.target.value)}
                maxLength={80}
                autoComplete="off"
                aria-invalid={!!errors.collectedBy}
                aria-describedby={errors.collectedBy ? 'collectedBy-err' : undefined}
              />
              <datalist id="collectors">
                {collectors.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>
        </fieldset>

        <div className="form-actions">
          <Link to={isEdit ? `/leads/${id}` : '/leads'} className="btn btn-secondary">
            Cancel
          </Link>
          {!isEdit && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={(e) => submit(e as unknown as FormEvent<HTMLFormElement>, true)}
            >
              Save &amp; add another
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save lead'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label: text,
  htmlFor,
  required,
  error,
  hint,
  wide,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`field${wide ? ' field-wide' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={htmlFor}>
        {text}
        {required && (
          <span className="req" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="hint" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="error" id={`${htmlFor}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

function ChoiceGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  required,
  dots,
}: {
  name: string;
  legend: string;
  options: readonly T[];
  value: T | '';
  onChange: (v: T) => void;
  error?: string;
  required?: boolean;
  dots?: boolean;
}) {
  return (
    <fieldset className={`choice-group${error ? ' has-error' : ''}`} aria-describedby={error ? `${name}-err` : undefined}>
      <legend>
        {legend}
        {required && (
          <span className="req" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </legend>
      <div className="choices">
        {options.map((o) => (
          <label key={o} className={`choice${value === o ? ' selected' : ''}`}>
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} />
            {dots && <span className="dot" style={{ background: INTEREST_COLORS[o as keyof typeof INTEREST_COLORS] }} aria-hidden="true" />}
            {label(o)}
          </label>
        ))}
      </div>
      {error && (
        <p className="error" id={`${name}-err`}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
