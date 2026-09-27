# Car Wash Lead Collector

A mobile-first web app for collecting market-survey leads from car-wash centres, tracking follow-ups, and analysing the pipeline on a dashboard.

- **Frontend:** React 19 + TypeScript (Vite), React Router, Recharts
- **Backend:** Node.js + Express + TypeScript, Zod validation, Helmet, rate limiting
- **Database:** PostgreSQL 16 + Prisma (migrations + seed script)

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** | 8 KPI cards (total, hot, warm, demo scheduled, converted, conversion rate, follow-ups due today, added this week) and charts: interest donut, status bar, district breakdown stacked by interest, weekly leads over time, conversion funnel, follow-ups due this week, top hot/warm districts and hotspot locations. Every chart has a **Table** toggle for accessible data view. |
| **Add / Edit Lead** | Sectioned form built for phones: large tap targets, choice chips, `tel` keypads, "Same as mobile" for WhatsApp, "Use my location" for GPS coordinates, quick follow-up dates, and "Save & add another". Serial numbers (`CW-0001`…) are auto-generated. Client + server validation (Indian 10-digit mobile, required fields). |
| **Leads** | Search (name, contact, mobile, location, district, serial), filters (interest, status, district, collector, follow-up preset and date range), sorting (latest, oldest, follow-up date, interest, serial), pagination, detail view, edit, delete with confirmation, **CSV / Excel export of the filtered set**. Filters live in the URL, so a filtered view can be bookmarked or shared. |
| **Follow-ups** | Overdue (highlighted red), due today, and next 7 days. Mark completed with a note, outcome, optional status change and next follow-up date. Full follow-up history on each lead. |
| **Reports** | Collector performance, wash-type mix with average daily vehicles, current-system vs interest, district summary, full exports. |

## Prerequisites

- Node.js 20+ (tested on 22)
- Docker Desktop (for PostgreSQL) — or any PostgreSQL 14+ you already run

## Quick start

```bash
npm run setup     # installs all deps, starts Postgres in Docker, runs migrations, seeds 32 Kerala leads
npm run dev       # API on http://localhost:4000, web app on http://localhost:5173
```

Open **http://localhost:5173** — it opens straight into the dashboard.

### Step by step (what `setup` does)

```bash
npm install && npm --prefix server install && npm --prefix client install
docker compose up -d                          # Postgres on localhost:5433 (user/pass/db: carwash/carwash/carwash_leads)
cp server/.env.example server/.env            # already present; edit if you use your own Postgres
npm --prefix server run prisma:deploy         # apply migrations
npm --prefix server run seed                  # load sample data
```

### Using your own PostgreSQL

Set `DATABASE_URL` in `server/.env`, e.g.

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/carwash_leads?schema=public"
```

then run `npm run db:migrate && npm run db:seed`.

## Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run API (tsx watch) and web app (Vite) together |
| `npm run db:seed` | Reset leads and reload the sample data (dates are relative to today, so "due today"/"overdue" always have data) |
| `npm --prefix server run db:reset` | Drop, re-migrate and re-seed the database |
| `npm --prefix server run prisma:migrate` | Create a new migration after editing `schema.prisma` |
| `npm run build` | Type-check and build API and client |
| `npm start` | Run the built API; it also serves the built client from `client/dist` on port 4000 |

## Environment variables (`server/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | local Docker DB | PostgreSQL connection string |
| `PORT` | `4000` | API port |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins |
| `APP_TIMEZONE` | `Asia/Kolkata` | Timezone used to decide "today" for follow-ups and "this week" |

## API overview

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/leads` | Query: `q, interest, status, district, collectedBy, followUp (today/overdue/week/any/none), followUpFrom, followUpTo, sort, page, pageSize`. `interest`/`status` accept comma lists. |
| GET | `/api/leads/export?format=csv\|xlsx` | Same filters as the list, unpaginated |
| GET | `/api/leads/:id` | Lead with follow-up history |
| POST | `/api/leads` | Create (validated with Zod) |
| PUT | `/api/leads/:id` | Update; changing the follow-up date re-opens the follow-up |
| DELETE | `/api/leads/:id` | Delete lead and its history |
| POST | `/api/leads/:id/followups` | `{ note, outcome?, markComplete, nextFollowUpDate?, status? }` |
| GET | `/api/followups` | Pending follow-ups grouped into overdue / today / upcoming |
| GET | `/api/dashboard` | KPIs and chart data |
| GET | `/api/reports` | Report tables |
| GET | `/api/meta` | Distinct districts and collectors for filters |

Validation errors return `400 { error, fieldErrors: { field: message } }`, which the form maps onto the matching inputs.

## Security notes

- All request bodies, query strings and route params are validated with Zod; unknown enum values and malformed IDs are rejected.
- Mobile numbers are normalised to 10 digits (`+91`, `91`, `0` prefixes and spaces accepted).
- Helmet security headers, a 100 KB JSON body limit, and a 300 req/min rate limit on `/api`.
- CSV/Excel exports neutralise spreadsheet formula injection (cells starting with `= + - @`).
- Error responses never leak stack traces.
- There is no authentication yet. Put the app behind a login (or a VPN / reverse-proxy auth) before exposing it on the internet.

## Project structure

```
├── docker-compose.yml        Postgres for local dev
├── server/
│   ├── prisma/
│   │   ├── schema.prisma     Lead + FollowUpNote models
│   │   ├── migrations/       SQL migrations
│   │   └── seed.ts           32 sample car-wash centres across all 14 Kerala districts
│   └── src/
│       ├── index.ts          Express app
│       ├── lib/              validation, dates, error handling
│       └── routes/           leads, dashboard, followups, reports
└── client/
    └── src/
        ├── components/       Layout (sidebar + mobile bottom nav), UI kit, follow-up dialog
        ├── pages/            Dashboard, LeadForm, LeadsList, LeadDetail, FollowUps, Reports
        └── lib/              API client, constants, formatting
```

The sample businesses, people and phone numbers in the seed data are fictional.
