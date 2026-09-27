import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/http';
import { CURRENT_SYSTEMS, WASH_TYPES } from '../lib/validation';

export const reportsRouter = Router();

reportsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [byCollectorRaw, byWashType, bySystem, avgVehicles, painRaw] = await Promise.all([
      prisma.lead.groupBy({ by: ['collectedBy', 'status'], _count: { _all: true } }),
      prisma.lead.groupBy({ by: ['washType'], _count: { _all: true }, _avg: { dailyVehicles: true } }),
      prisma.lead.groupBy({ by: ['currentSystem', 'interest'], _count: { _all: true } }),
      prisma.lead.aggregate({ _avg: { dailyVehicles: true }, _sum: { dailyVehicles: true } }),
      prisma.lead.groupBy({ by: ['district', 'status'], _count: { _all: true } }),
    ]);

    const collectors = new Map<string, { collector: string; total: number; converted: number; demo: number; lost: number }>();
    for (const r of byCollectorRaw) {
      const row = collectors.get(r.collectedBy) ?? { collector: r.collectedBy, total: 0, converted: 0, demo: 0, lost: 0 };
      row.total += r._count._all;
      if (r.status === 'CONVERTED') row.converted += r._count._all;
      if (r.status === 'DEMO_SCHEDULED') row.demo += r._count._all;
      if (r.status === 'LOST') row.lost += r._count._all;
      collectors.set(r.collectedBy, row);
    }

    const systems = CURRENT_SYSTEMS.map((s) => {
      const rows = bySystem.filter((r) => r.currentSystem === s);
      const total = rows.reduce((a, r) => a + r._count._all, 0);
      const hotWarm = rows.filter((r) => r.interest === 'HOT' || r.interest === 'WARM').reduce((a, r) => a + r._count._all, 0);
      return { key: s, total, hotWarm };
    });

    const districts = new Map<string, { district: string; total: number; converted: number; open: number }>();
    for (const r of painRaw) {
      const row = districts.get(r.district) ?? { district: r.district, total: 0, converted: 0, open: 0 };
      row.total += r._count._all;
      if (r.status === 'CONVERTED') row.converted += r._count._all;
      else if (r.status !== 'LOST') row.open += r._count._all;
      districts.set(r.district, row);
    }

    res.json({
      avgDailyVehicles: avgVehicles._avg.dailyVehicles ?? 0,
      totalDailyVehicles: avgVehicles._sum.dailyVehicles ?? 0,
      byCollector: [...collectors.values()].sort((a, b) => b.total - a.total),
      byWashType: WASH_TYPES.map((w) => {
        const r = byWashType.find((x) => x.washType === w);
        return { key: w, total: r?._count._all ?? 0, avgVehicles: r?._avg.dailyVehicles ?? 0 };
      }),
      bySystem: systems,
      byDistrict: [...districts.values()].sort((a, b) => b.total - a.total),
    });
  }),
);
