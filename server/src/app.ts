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

app.disable('x-powered-by');
// Behind Vercel's / a reverse proxy, trust the first hop so rate limiting sees real client IPs.
if (process.env.VERCEL || process.env.TRUST_PROXY) app.set('trust proxy', 1);
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

// When run as a standalone server, serve the built client from ../client/dist if present.
// (On Vercel the client is served by the CDN instead.)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (!process.env.VERCEL && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

export default app;
