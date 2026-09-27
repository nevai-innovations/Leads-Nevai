import { Router } from 'express';
import type { Prisma, Lead } from '@prisma/client';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { followUpInputSchema, leadInputSchema, leadQuerySchema, uuidParam, type LeadQuery } from '../lib/validation';
import { addDays, dateOnly, today, toISODate } from '../lib/dates';

export const leadsRouter = Router();

export function serialLabel(n: number) {
  return `CW-${String(n).padStart(4, '0')}`;
}

export function serializeLead(l: Lead) {
  return {
    ...l,
    serial: serialLabel(l.serialNo),
    followUpDate: toISODate(l.followUpDate),
  };
}

function buildWhere(q: LeadQuery): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [];

  if (q.q) {
    const term = q.q;
    const digits = term.replace(/\D/g, '');
    const or: Prisma.LeadWhereInput[] = [
      { businessName: { contains: term, mode: 'insensitive' } },
      { contactName: { contains: term, mode: 'insensitive' } },
      { location: { contains: term, mode: 'insensitive' } },
      { district: { contains: term, mode: 'insensitive' } },
    ];
    if (digits.length >= 3) {
      or.push({ mobile: { contains: digits } }, { whatsapp: { contains: digits } });
    }
    const serial = /^cw-?0*(\d+)$/i.exec(term);
    if (serial) or.push({ serialNo: Number(serial[1]) });
    and.push({ OR: or });
  }
  if (q.interest.length) and.push({ interest: { in: q.interest } });
  if (q.status.length) and.push({ status: { in: q.status } });
  if (q.district) and.push({ district: { equals: q.district, mode: 'insensitive' } });
  if (q.collectedBy) and.push({ collectedBy: { equals: q.collectedBy, mode: 'insensitive' } });

  const t = today();
  const pending: Prisma.LeadWhereInput = { followUpCompleted: false };
  switch (q.followUp) {
    case 'today':
      and.push(pending, { followUpDate: t });
      break;
    case 'overdue':
      and.push(pending, { followUpDate: { lt: t } });
      break;
    case 'week':
      and.push(pending, { followUpDate: { gte: t, lte: addDays(t, 6) } });
      break;
    case 'none':
      and.push({ followUpDate: null });
      break;
    case 'any':
      and.push({ followUpDate: { not: null } });
      break;
  }
  if (q.followUpFrom) and.push({ followUpDate: { gte: dateOnly(q.followUpFrom) } });
  if (q.followUpTo) and.push({ followUpDate: { lte: dateOnly(q.followUpTo) } });

  return and.length ? { AND: and } : {};
}

function buildOrder(sort: LeadQuery['sort']): Prisma.LeadOrderByWithRelationInput[] {
  switch (sort) {
    case 'oldest':
      return [{ createdAt: 'asc' }];
    case 'followUp':
      return [{ followUpDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }];
    case 'interest':
      // Postgres enum order: HOT, WARM, COLD, NOT_INTERESTED
      return [{ interest: 'asc' }, { followUpDate: { sort: 'asc', nulls: 'last' } }];
    case 'serial':
      return [{ serialNo: 'asc' }];
    default:
      return [{ createdAt: 'desc' }];
  }
}

leadsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = leadQuerySchema.parse(req.query);
    const where = buildWhere(q);
    const [total, rows] = await prisma.$transaction([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: buildOrder(q.sort),
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    res.json({
      data: rows.map(serializeLead),
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    });
  }),
);

const LABELS: Record<string, string> = {
  MANUAL: 'Manual', AUTOMATIC: 'Automatic', DETAILING: 'Detailing', MULTI_SERVICE: 'Multi-service',
  NOTEBOOK: 'Notebook', WHATSAPP: 'WhatsApp', EXCEL: 'Excel', EXISTING_SOFTWARE: 'Existing software', NONE: 'None',
  HOT: 'Hot', WARM: 'Warm', COLD: 'Cold', NOT_INTERESTED: 'Not interested',
  NEW: 'New', CONTACTED: 'Contacted', DEMO_SCHEDULED: 'Demo scheduled', CONVERTED: 'Converted', LOST: 'Lost',
};

const EXPORT_COLUMNS: { header: string; key: string; width: number; get: (l: Lead) => string | number }[] = [
  { header: 'Serial No', key: 'serial', width: 10, get: (l) => serialLabel(l.serialNo) },
  { header: 'Business Name', key: 'businessName', width: 28, get: (l) => l.businessName },
  { header: 'Contact Person', key: 'contactName', width: 20, get: (l) => l.contactName },
  { header: 'Mobile', key: 'mobile', width: 14, get: (l) => l.mobile },
  { header: 'WhatsApp', key: 'whatsapp', width: 14, get: (l) => l.whatsapp ?? '' },
  { header: 'Location', key: 'location', width: 18, get: (l) => l.location },
  { header: 'District', key: 'district', width: 18, get: (l) => l.district },
  { header: 'Maps', key: 'mapsLink', width: 30, get: (l) => l.mapsLink ?? '' },
  { header: 'Wash Type', key: 'washType', width: 14, get: (l) => LABELS[l.washType] },
  { header: 'Daily Vehicles', key: 'dailyVehicles', width: 12, get: (l) => l.dailyVehicles },
  { header: 'Current System', key: 'currentSystem', width: 18, get: (l) => LABELS[l.currentSystem] },
  { header: 'Interest', key: 'interest', width: 14, get: (l) => LABELS[l.interest] },
  { header: 'Status', key: 'status', width: 16, get: (l) => LABELS[l.status] },
  { header: 'Follow-up Date', key: 'followUpDate', width: 14, get: (l) => toISODate(l.followUpDate) ?? '' },
  { header: 'Follow-up Done', key: 'followUpCompleted', width: 12, get: (l) => (l.followUpCompleted ? 'Yes' : 'No') },
  { header: 'Collected By', key: 'collectedBy', width: 16, get: (l) => l.collectedBy },
  { header: 'Pain Points / Remarks', key: 'remarks', width: 50, get: (l) => l.remarks ?? '' },
  { header: 'Created', key: 'createdAt', width: 20, get: (l) => l.createdAt.toISOString() },
  { header: 'Last Updated', key: 'updatedAt', width: 20, get: (l) => l.updatedAt.toISOString() },
];

/** Neutralise spreadsheet formula injection. */
function safeCell(v: string | number): string | number {
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(v)) return `'${v}`;
  return v;
}

function csvEscape(v: string | number): string {
  const s = String(safeCell(v));
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

leadsRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    const q = leadQuerySchema.parse({ ...req.query, page: 1, pageSize: 100 });
    const rows = await prisma.lead.findMany({ where: buildWhere(q), orderBy: buildOrder(q.sort), take: 10000 });
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const lines = [EXPORT_COLUMNS.map((c) => csvEscape(c.header)).join(',')];
      for (const l of rows) lines.push(EXPORT_COLUMNS.map((c) => csvEscape(c.get(l))).join(','));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="carwash-leads-${stamp}.csv"`);
      // BOM so Excel opens UTF-8 correctly
      return res.send('﻿' + lines.join('\r\n'));
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Car Wash Lead Collector';
    const ws = wb.addWorksheet('Leads', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    for (const l of rows) {
      ws.addRow(Object.fromEntries(EXPORT_COLUMNS.map((c) => [c.key, safeCell(c.get(l))])));
    }
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: EXPORT_COLUMNS.length } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="carwash-leads-${stamp}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  }),
);

leadsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = uuidParam.parse(req.params);
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { followUps: { orderBy: { createdAt: 'desc' } } },
    });
    if (!lead) throw new HttpError(404, 'Lead not found');
    const { followUps, ...rest } = lead;
    res.json({
      ...serializeLead(rest),
      followUps: followUps.map((f) => ({ ...f, scheduledFor: toISODate(f.scheduledFor) })),
    });
  }),
);

leadsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = leadInputSchema.parse(req.body);
    const lead = await prisma.lead.create({ data });
    res.status(201).json(serializeLead(lead));
  }),
);

leadsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = uuidParam.parse(req.params);
    const data = leadInputSchema.parse(req.body);
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Lead not found');
    // A new follow-up date re-opens the follow-up.
    const dateChanged = toISODate(existing.followUpDate) !== toISODate(data.followUpDate);
    const lead = await prisma.lead.update({
      where: { id },
      data: { ...data, ...(dateChanged ? { followUpCompleted: false } : {}) },
    });
    res.json(serializeLead(lead));
  }),
);

leadsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = uuidParam.parse(req.params);
    await prisma.lead.delete({ where: { id } });
    res.status(204).end();
  }),
);

/** Add a follow-up note; optionally mark the current follow-up complete and schedule the next. */
leadsRouter.post(
  '/:id/followups',
  asyncHandler(async (req, res) => {
    const { id } = uuidParam.parse(req.params);
    const input = followUpInputSchema.parse(req.body);
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new HttpError(404, 'Lead not found');

    const leadUpdate: Prisma.LeadUpdateInput = {};
    if (input.status) leadUpdate.status = input.status;
    if (input.nextFollowUpDate) {
      leadUpdate.followUpDate = input.nextFollowUpDate;
      leadUpdate.followUpCompleted = false;
    } else if (input.markComplete) {
      leadUpdate.followUpCompleted = true;
    }

    const [note, updated] = await prisma.$transaction([
      prisma.followUpNote.create({
        data: {
          leadId: id,
          note: input.note,
          outcome: input.outcome,
          completed: input.markComplete,
          scheduledFor: lead.followUpDate,
          createdBy: input.createdBy ?? null,
        },
      }),
      prisma.lead.update({ where: { id }, data: leadUpdate }),
    ]);
    res.status(201).json({ note: { ...note, scheduledFor: toISODate(note.scheduledFor) }, lead: serializeLead(updated) });
  }),
);
