import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/http';
import { addDays, today } from '../lib/dates';
import { serializeLead } from './leads';

export const followupsRouter = Router();

const querySchema = z.object({
  collectedBy: z.string().trim().max(80).optional(),
});

/** Pending follow-ups grouped into overdue / today / next 7 days. Closed leads are excluded. */
followupsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { collectedBy } = querySchema.parse(req.query);
    const t = today();
    const base = {
      followUpCompleted: false,
      status: { notIn: ['CONVERTED', 'LOST'] as ('CONVERTED' | 'LOST')[] },
      ...(collectedBy ? { collectedBy: { equals: collectedBy, mode: 'insensitive' as const } } : {}),
    };
    const order = [{ followUpDate: 'asc' as const }, { interest: 'asc' as const }];
    const [overdue, dueToday, upcoming] = await Promise.all([
      prisma.lead.findMany({ where: { ...base, followUpDate: { lt: t } }, orderBy: order }),
      prisma.lead.findMany({ where: { ...base, followUpDate: t }, orderBy: order }),
      prisma.lead.findMany({ where: { ...base, followUpDate: { gt: t, lte: addDays(t, 7) } }, orderBy: order }),
    ]);
    res.json({
      overdue: overdue.map(serializeLead),
      today: dueToday.map(serializeLead),
      upcoming: upcoming.map(serializeLead),
    });
  }),
);
