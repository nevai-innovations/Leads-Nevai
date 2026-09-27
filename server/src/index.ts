import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { prisma } from './lib/prisma';
import { asyncHandler, errorHandler } from './lib/http';
import { leadsRouter } from './routes/leads';
import { dashboardRouter } from './routes/dashboard';
import { followupsRouter } from './routes/followups';
import { reportsRouter } from './routes/reports';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get(
  '/api/meta',
  asyncHandler(async (_req, res) => {
    const [districts, collectors] = await Promise.all([
      prisma.lead.findMany({ distinct: ['district'], select: { district: true }, orderBy: { district: 'asc' } }),
      prisma.lead.findMany({ distinct: ['collectedBy'], select: { collectedBy: true }, orderBy: { collectedBy: 'asc' } }),
    ]);
    res.json({ districts: districts.map((d) => d.district), collectors: collectors.map((c) => c.collectedBy) });
  }),
);

app.use('/api/leads', leadsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/followups', followupsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// In production, serve the built client from ../client/dist if present.
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
