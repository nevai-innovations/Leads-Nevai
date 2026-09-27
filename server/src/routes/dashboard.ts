import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/http';
import { addDays, localISODate, startOfWeek, today, toISODate, tzMidnightInstant } from '../lib/dates';
import { INTERESTS, STATUSES } from '../lib/validation';
import { serializeLead } from './leads';

export const dashboardRouter = Router();

const WEEKS_OF_HISTORY = 12;

dashboardRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const t = today();
    const weekStart = startOfWeek();
    const weekEnd = addDays(t, 6);
    const historyStart = addDays(weekStart, -7 * (WEEKS_OF_HISTORY - 1));

    const [total, byInterestRaw, byStatusRaw, byDistrictRaw, dueToday, overdue, addedThisWeek, upcoming, createdDates, locRaw] =
      await Promise.all([
        prisma.lead.count(),
        prisma.lead.groupBy({ by: ['interest'], _count: { _all: true } }),
        prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.lead.groupBy({ by: ['district', 'interest'], _count: { _all: true } }),
        prisma.lead.count({ where: { followUpDate: t, followUpCompleted: false } }),
        prisma.lead.count({ where: { followUpDate: { lt: t }, followUpCompleted: false } }),
        prisma.lead.count({ where: { createdAt: { gte: tzMidnightInstant(weekStart) } } }),
        prisma.lead.findMany({
          where: { followUpDate: { gte: t, lte: weekEnd }, followUpCompleted: false },
          orderBy: [{ followUpDate: 'asc' }, { interest: 'asc' }],
        }),
        prisma.lead.findMany({
          where: { createdAt: { gte: tzMidnightInstant(historyStart) } },
          select: { createdAt: true },
        }),
        prisma.lead.groupBy({
          by: ['location', 'district', 'interest'],
          where: { interest: { in: ['HOT', 'WARM'] } },
          _count: { _all: true },
        }),
      ]);

    // Leads added via the quick form have no interest yet: count them as UNRATED.
    const INTEREST_KEYS = [...INTERESTS, 'UNRATED'] as const;
    const interestCount = Object.fromEntries(INTEREST_KEYS.map((i) => [i, 0])) as Record<string, number>;
    for (const r of byInterestRaw) interestCount[r.interest ?? 'UNRATED'] = r._count._all;
    const statusCount = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const r of byStatusRaw) statusCount[r.status] = r._count._all;

    // District breakdown, stacked by interest
    type InterestCounts = { HOT: number; WARM: number; COLD: number; NOT_INTERESTED: number; UNRATED: number };
    const districtMap = new Map<string, InterestCounts>();
    for (const r of byDistrictRaw) {
      const row = districtMap.get(r.district) ?? { HOT: 0, WARM: 0, COLD: 0, NOT_INTERESTED: 0, UNRATED: 0 };
      row[r.interest ?? 'UNRATED'] = r._count._all;
      districtMap.set(r.district, row);
    }
    const byDistrict = [...districtMap.entries()]
      .map(([district, c]) => ({ district, ...c, total: c.HOT + c.WARM + c.COLD + c.NOT_INTERESTED + c.UNRATED }))
      .sort((a, b) => b.total - a.total || a.district.localeCompare(b.district));

    // Weekly leads over time (Mon-start weeks)
    const weekly = Array.from({ length: WEEKS_OF_HISTORY }, (_, i) => {
      const start = addDays(historyStart, i * 7);
      return { weekStart: toISODate(start)!, count: 0 };
    });
    for (const { createdAt } of createdDates) {
      const local = new Date(`${localISODate(createdAt)}T00:00:00Z`);
      const idx = Math.floor((local.getTime() - historyStart.getTime()) / (7 * 86400000));
      if (idx >= 0 && idx < weekly.length) weekly[idx].count++;
    }

    // Funnel: leads that reached at least each stage. Lost leads were contacted before being lost.
    const funnel = [
      { stage: 'New', count: total },
      {
        stage: 'Contacted',
        count: statusCount.CONTACTED + statusCount.DEMO_SCHEDULED + statusCount.CONVERTED + statusCount.LOST,
      },
      { stage: 'Demo', count: statusCount.DEMO_SCHEDULED + statusCount.CONVERTED },
      { stage: 'Converted', count: statusCount.CONVERTED },
    ];

    // Follow-ups due per day for the next 7 days
    const weekDays = Array.from({ length: 7 }, (_, i) => ({ date: toISODate(addDays(t, i))!, count: 0 }));
    for (const l of upcoming) {
      const d = toISODate(l.followUpDate);
      const slot = weekDays.find((w) => w.date === d);
      if (slot) slot.count++;
    }

    // Top locations by hot/warm concentration
    const locMap = new Map<string, { location: string; district: string; hot: number; warm: number }>();
    for (const r of locRaw) {
      const key = `${r.location}|${r.district}`;
      const row = locMap.get(key) ?? { location: r.location, district: r.district, hot: 0, warm: 0 };
      if (r.interest === 'HOT') row.hot += r._count._all;
      else row.warm += r._count._all;
      locMap.set(key, row);
    }
    // District-level concentration is more meaningful than single-shop locations, so report both.
    const topDistricts = byDistrict
      .map((d) => ({ district: d.district, hot: d.HOT, warm: d.WARM, total: d.total, share: d.total ? (d.HOT + d.WARM) / d.total : 0 }))
      .filter((d) => d.hot + d.warm > 0)
      .sort((a, b) => b.hot * 2 + b.warm - (a.hot * 2 + a.warm) || b.share - a.share)
      .slice(0, 8);
    const topLocations = [...locMap.values()]
      .sort((a, b) => b.hot * 2 + b.warm - (a.hot * 2 + a.warm) || a.location.localeCompare(b.location))
      .slice(0, 8);

    res.json({
      today: toISODate(t),
      kpis: {
        total,
        hot: interestCount.HOT,
        warm: interestCount.WARM,
        demoScheduled: statusCount.DEMO_SCHEDULED,
        converted: statusCount.CONVERTED,
        conversionRate: total ? statusCount.CONVERTED / total : 0,
        dueToday,
        overdue,
        addedThisWeek,
      },
      byInterest: INTEREST_KEYS.map((k) => ({ key: k, count: interestCount[k] })),
      byStatus: STATUSES.map((k) => ({ key: k, count: statusCount[k] })),
      byDistrict,
      overTime: weekly,
      funnel,
      followUpsThisWeek: { days: weekDays, leads: upcoming.map(serializeLead) },
      topDistricts,
      topLocations,
    });
  }),
);
