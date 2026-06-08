# HotInsert AI - Technical Specification (spec.md)

## Project Overview
**Product Name**: HotInsert AI (Web Prototype)
**Version**: 1.0 Prototype
**Date**: June 2026
**Description**: A web application that allows users to insert their selfie into trending hot event videos (World Cup, concerts, Oscars, news, etc.) using AI face/person swap via fal.ai pixverse/swap API.

**Core Flow**:
1. Login with Google account (required).
2. Browse trending hot events with reference videos.
3. Upload selfie photo.
4. Call fal.ai swap API to generate output video (async, poll for result).
5. Preview, download, and share the result.
6. View generation history.

**Deployment Goal**: Fast, low-cost, globally distributed serverless architecture.

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (latest, App Router, React Server Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentication**: NextAuth.js v5 (Auth.js) with Google OAuth provider
- **Deployment**: Vercel (automatic previews, edge functions, analytics)
- **Features**: Responsive design, PWA-ready, optimized for mobile

### Backend
- **Runtime**: Cloudflare Workers
- **Language**: TypeScript (with wrangler)
- **Deployment**: Cloudflare (global edge network, low latency)
- **API Routes**: REST endpoints for events, uploads, swap jobs, admin operations
- **Communication**: Frontend (Vercel) calls Cloudflare Workers directly — no Vercel API proxy layer

### Storage & Data
- **Structured Data**: Cloudflare D1 (SQLite-compatible)
  - Tables: `users`, `events`, `jobs`, `sessions` (NextAuth adapter)
  - Migrations managed via `wrangler d1 migrations`
- **File Storage**: Cloudflare R2
  - `hot-events/` — reference videos and thumbnails (uploaded by admin)
  - `uploads/` — user selfie images
  - `outputs/` — generated swap videos from fal.ai
  - Signed URLs with short expiration for secure access
- **Caching**: Cloudflare Cache + KV (for session tokens, rate limit counters)

### AI Integration
- **Primary Model**: [fal.ai pixverse/swap](https://fal.ai/models/fal-ai/pixverse/swap)
- **Parameters**:
  - `video_url`: R2 signed URL of reference hot event video
  - `image_url`: R2 signed URL of user selfie
  - `mode`: `"person"`
  - `keyframe_id`: 1 (configurable)
  - `resolution`: `"540p"` (balance quality/cost)
- **Execution**: Async — submit job via fal.ai API, poll `GET /fal/queue/:requestId` until status is `COMPLETED`
- **Response**: A direct video URL to the generated output
- **Error Handling**: Phase 1 — display failure to user, no automatic retry
- **Cost**: ~$0.50 per generation (rate limit per user daily)

### Other Services
- **Admin Panel**: Built into the same Next.js app (`/admin`) for managing hot events
  - Admin role checked via D1 `users` table `role` field
  - Upload reference videos + thumbnails to R2, create event records in D1
- **Analytics**: Vercel Analytics + Cloudflare Web Analytics
- **Monitoring**: Cloudflare Logs + Sentry (optional)
- **Watermark**: Not implemented in Phase 1

## Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────┐
│  User Browser                                           │
│  (localhost:3000 / Vercel)                              │
└──────────┬──────────────────────────────────────────────┘
           │ HTTPS
           ▼
┌──────────────────────────────────────────────────────────┐
│  Next.js 15 (Vercel)                                     │
│  - SSR/SSG pages                                         │
│  - NextAuth.js (Google OAuth)                            │
│  - Client components call Workers directly via fetch()    │
└──────────┬──────────────────────────────────────────────┘
           │ HTTPS (direct from browser or server)
           ▼
┌──────────────────────────────────────────────────────────┐
│  Cloudflare Workers API                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ /events  │ │ /upload  │ │  /swap   │ │ /admin     │  │
│  │ GET      │ │ POST     │ │ POST     │ │ CRUD       │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘  │
│       │            │            │              │         │
│       ▼            ▼            ▼              ▼         │
│  ┌────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐   │
│  │  D1    │  │   R2    │  │ fal.ai   │  │  Auth    │   │
│  │ (SQL)  │  │ (Files) │  │ (Async)  │  │ (JWT)    │   │
│  └────────┘  └─────────┘  └──────────┘  └──────────┘   │
└──────────────────────────────────────────────────────────┘
```

## Project Structure

```
/hotinsert-ai
├── frontend/                    # Next.js app (Vercel)
│   ├── app/
│   │   ├── page.tsx             # Home / Trending events
│   │   ├── layout.tsx           # Root layout + AuthProvider
│   │   ├── create/[eventId]/    # Upload selfie + Generate
│   │   ├── result/[jobId]/      # Preview + Download + Share
│   │   ├── history/             # User's generation history
│   │   ├── admin/               # Admin panel (event CRUD, upload)
│   │   ├── api/auth/            # NextAuth API route ([...nextauth])
│   │   └── login/               # Login page
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── EventCard.tsx
│   │   ├── UploadSelfie.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── JobStatus.tsx        # Polling UI for async generation
│   │   └── Navbar.tsx
│   ├── lib/
│   │   ├── auth.ts              # NextAuth config
│   │   ├── api.ts               # Worker API client (fetch wrapper)
│   │   └── utils.ts
│   └── public/
│
├── backend/                     # Cloudflare Workers
│   ├── src/
│   │   ├── index.ts             # Router entry point
│   │   ├── routes/
│   │   │   ├── events.ts        # GET /events, admin CRUD
│   │   │   ├── upload.ts        # POST /upload (R2 presigned)
│   │   │   ├── swap.ts          # POST /swap (fal.ai trigger)
│   │   │   ├── job.ts           # GET /job/:id (poll status)
│   │   │   ├── admin.ts         # Admin-only event management
│   │   │   └── history.ts       # GET /history (user's jobs)
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT verification, admin check
│   │   └── utils/
│   │       ├── r2.ts            # R2 helpers (signed URLs)
│   │       ├── d1.ts            # D1 query helpers
│   │       └── fal.ts           # fal.ai API client
│   ├── migrations/              # D1 SQL migrations
│   ├── wrangler.toml
│   └── package.json
│
├── shared/                      # Shared TypeScript types
│   ├── types.ts                 # Event, Job, User, API responses
│   └── constants.ts             # Status enums, limits
│
├── docs/
│   └── spec.md                  # This file
└── README.md
```

## Key Features (Prototype Scope)

### Frontend Pages
| Route | Description | Auth Required |
|-------|-------------|:---:|
| `/` | Trending events grid with cards, search/filter by category | Yes |
| `/login` | Google OAuth sign-in page | No |
| `/create/[eventId]` | Upload selfie + preview + Generate button | Yes |
| `/result/[jobId]` | Poll job status, preview result video, download/share | Yes |
| `/history` | User's past generations, sorted by date | Yes |
| `/admin` | Admin panel — CRUD hot events, upload reference videos | Yes (Admin) |

### Backend Endpoints (Workers)
| Method | Path | Description | Auth |
|--------|------|-------------|:---:|
| `GET` | `/events` | List trending hot events (paginated) | Yes |
| `GET` | `/events/:id` | Get single event detail | Yes |
| `POST` | `/upload` | Upload selfie to R2, return signed URL | Yes |
| `POST` | `/swap` | Trigger fal.ai swap job, return job ID | Yes |
| `GET` | `/job/:id` | Poll job status (queued/processing/completed/failed) | Yes |
| `GET` | `/history` | List user's generation jobs | Yes |
| `POST` | `/admin/events` | Create new event (upload video to R2) | Admin |
| `PUT` | `/admin/events/:id` | Update event metadata | Admin |
| `DELETE` | `/admin/events/:id` | Delete event + associated R2 files | Admin |
| `GET` | `/admin/events` | List all events (including drafts) | Admin |

### D1 Database Schema
```sql
-- Users (synced from NextAuth on first login)
CREATE TABLE users (
  id          TEXT PRIMARY KEY,       -- NextAuth user ID
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  image       TEXT,                   -- Google avatar URL
  role        TEXT DEFAULT 'user',    -- 'user' | 'admin'
  created_at  INTEGER DEFAULT (unixepoch())
);

-- Hot Events
CREATE TABLE events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,          -- 'sports' | 'music' | 'movies' | 'news' | 'other'
  description TEXT,
  video_url   TEXT NOT NULL,          -- R2 key or signed URL
  thumbnail_url TEXT,                 -- R2 key or signed URL
  duration    INTEGER,                -- seconds
  status      TEXT DEFAULT 'active',  -- 'active' | 'draft' | 'archived'
  created_by  TEXT REFERENCES users(id),
  created_at  INTEGER DEFAULT (unixepoch())
);

-- Swap Jobs
CREATE TABLE jobs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  event_id      TEXT NOT NULL REFERENCES events(id),
  fal_request_id TEXT,                -- fal.ai queue request ID
  input_image   TEXT NOT NULL,        -- R2 key of user selfie
  output_video  TEXT,                 -- R2 key or fal.ai result URL
  status        TEXT DEFAULT 'queued',-- 'queued' | 'processing' | 'completed' | 'failed'
  error_message TEXT,
  created_at    INTEGER DEFAULT (unixepoch()),
  completed_at  INTEGER
);

-- Rate Limiting
CREATE TABLE rate_limits (
  user_id    TEXT NOT NULL REFERENCES users(id),
  date       TEXT NOT NULL,           -- 'YYYY-MM-DD'
  count      INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
```

### Data Models (shared/types.ts)
```typescript
interface Event {
  id: string;
  title: string;
  category: 'sports' | 'music' | 'movies' | 'news' | 'other';
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  status: 'active' | 'draft' | 'archived';
  createdAt: number;
}

interface Job {
  id: string;
  userId: string;
  eventId: string;
  falRequestId?: string;
  inputImage: string;
  outputVideo?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: number;
  completedAt?: number;
}

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: 'user' | 'admin';
}
```

## Non-Functional Requirements
- **Performance**: Page load < 1.5s, generation < 60s (async, user sees polling UI)
- **Cost Control**: ~$0.50 per generation; daily limit of 10 generations per user
- **Security**:
  - NextAuth.js JWT session tokens, verified on Workers via shared secret
  - Admin-only routes protected by `role` check in D1
  - Signed URLs with 15-minute expiration for R2 access
  - Rate limiting on Workers (per-user, per-IP fallback)
- **Compliance**: Privacy policy page, terms of service
- **Scalability**: Cloudflare edge handles global traffic; D1 scales reads via replication

## CORS Configuration
- Next.js (Vercel) → Cloudflare Workers: Workers must allow `Access-Control-Allow-Origin` for the Vercel domain and `http://localhost:3000` (dev)
- NextAuth callback URL: Vercel domain + `/api/auth/callback/google`

## Development & Deployment Workflow

### Local Development
```bash
# Frontend
cd frontend
pnpm install
pnpm dev                        # http://localhost:3000

# Backend
cd backend
pnpm install
wrangler dev                    # http://localhost:8787

# D1 Local
wrangler d1 execute hotinsert-db --local --file=./migrations/001_init.sql
```

### Deployment
- **Frontend**: `vercel deploy` or Git integration (auto-deploy on push to main)
- **Backend**: `wrangler deploy`
- **D1**: `wrangler d1 execute hotinsert-db --file=./migrations/001_init.sql`
- **R2**: Create bucket via `wrangler r2 bucket create hotinsert-assets`

### Environment Variables
```
# Frontend (.env.local)
AUTH_GOOGLE_ID=xxx
AUTH_GOOGLE_SECRET=xxx
AUTH_SECRET=xxx
NEXT_PUBLIC_WORKER_URL=https://api.hotinsert.workers.dev

# Backend (wrangler.toml secrets)
FAL_API_KEY=xxx
JWT_SECRET=xxx              # Shared secret for verifying NextAuth tokens
ADMIN_EMAILS=xxx@gmail.com  # Comma-separated list of admin Google emails
```

## Risks & Notes
- **D1**: SQLite-compatible with some limitations (no FK enforcement in beta, row size limits). Suitable for prototype scale; migrations are straightforward.
- **fal.ai costs**: Implement daily limit (10/user/day) and total monthly budget cap. Monitor via Cloudflare Analytics.
- **Hot event videos**: Manually curated + uploaded by admin. If scraping is added later, legal review required for copyright.
- **CORS**: Properly configure between Vercel domain and Cloudflare Workers for both auth cookies and API calls.
- **NextAuth + Workers**: Workers verify JWT tokens issued by NextAuth. Shared `AUTH_SECRET` must be identical on both sides.

## Next Steps (Updated)
1. Initialize Next.js project with NextAuth + Google OAuth
2. Set up Cloudflare Worker + D1 database + R2 bucket
3. Implement D1 schema migrations
4. Build `/admin` panel for event management
5. Implement upload + fal.ai async integration with polling
6. Seed initial hot events via admin panel
7. Deploy frontend (Vercel) + backend (Cloudflare)

---

This spec is ready for implementation.
Update as needed during development.
Last updated: June 2026 — clarified: auth (NextAuth + Google), storage (D1 + R2), admin panel, async fal.ai, no retry, per-frame replacement, $0.50/gen
