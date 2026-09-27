import { z } from 'zod';

export const WASH_TYPES = ['MANUAL', 'AUTOMATIC', 'DETAILING', 'MULTI_SERVICE'] as const;
export const CURRENT_SYSTEMS = ['NOTEBOOK', 'WHATSAPP', 'EXCEL', 'EXISTING_SOFTWARE', 'NONE'] as const;
export const INTERESTS = ['HOT', 'WARM', 'COLD', 'NOT_INTERESTED'] as const;
export const STATUSES = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'CONVERTED', 'LOST'] as const;

/** Indian mobile: optional +91 / 91 / 0 prefix, then 10 digits starting 6-9. Normalised to 10 digits. */
const MOBILE_RE = /^(?:\+?91|0)?([6-9]\d{9})$/;

export function normaliseMobile(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  const m = MOBILE_RE.exec(cleaned);
  return m ? m[1] : null;
}

const mobile = z
  .string({ required_error: 'Mobile number is required' })
  .trim()
  .transform((v, ctx) => {
    const n = normaliseMobile(v);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid 10-digit Indian mobile number' });
      return z.NEVER;
    }
    return n;
  });

const optionalMobile = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = normaliseMobile(v);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid 10-digit Indian mobile number' });
      return z.NEVER;
    }
    return n;
  });

const requiredText = (label: string, max = 120) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isoDate = z
  .string()
  .regex(DATE_RE, 'Use YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Invalid date');

const optionalDate = z
  .union([isoDate, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null));

const mapsLink = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine(
    (v) => {
      if (!v) return true;
      if (/^-?\d{1,2}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?$/.test(v)) return true; // "lat,lng"
      try {
        const u = new URL(v);
        return u.protocol === 'https:' || u.protocol === 'http:';
      } catch {
        return false;
      }
    },
    { message: 'Enter a Google Maps URL or coordinates like 9.9816,76.2780' },
  );

export const leadInputSchema = z.object({
  businessName: requiredText('Business name'),
  contactName: requiredText('Contact person'),
  mobile,
  whatsapp: optionalMobile,
  location: requiredText('Location'),
  district: requiredText('District', 60),
  mapsLink,
  washType: z.enum(WASH_TYPES, { errorMap: () => ({ message: 'Select a car wash type' }) }),
  dailyVehicles: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .int('Enter a whole number')
    .min(0, 'Cannot be negative')
    .max(10000, 'That seems too high'),
  currentSystem: z.enum(CURRENT_SYSTEMS, { errorMap: () => ({ message: 'Select the current system' }) }),
  remarks: optionalText(2000),
  interest: z.enum(INTERESTS, { errorMap: () => ({ message: 'Select probability of interest' }) }),
  followUpDate: optionalDate,
  status: z.enum(STATUSES, { errorMap: () => ({ message: 'Select a lead status' }) }).default('NEW'),
  collectedBy: requiredText('Collected by', 80),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

const csvEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : []))
    .pipe(z.array(z.enum(values)));

export const leadQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  interest: csvEnum(INTERESTS),
  status: csvEnum(STATUSES),
  district: z.string().trim().max(60).optional(),
  collectedBy: z.string().trim().max(80).optional(),
  followUp: z.enum(['today', 'overdue', 'week', 'none', 'any']).optional(),
  followUpFrom: isoDate.optional(),
  followUpTo: isoDate.optional(),
  sort: z.enum(['latest', 'oldest', 'followUp', 'interest', 'serial']).default('latest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type LeadQuery = z.infer<typeof leadQuerySchema>;

export const followUpInputSchema = z.object({
  note: requiredText('Note', 2000),
  outcome: optionalText(120),
  markComplete: z.boolean().default(true),
  nextFollowUpDate: optionalDate,
  status: z.enum(STATUSES).optional(),
  createdBy: optionalText(80),
});

export const uuidParam = z.object({ id: z.string().uuid('Invalid id') });
