# IfIWasThere — Technical Specification

## Product Overview

**Product Name**: IfIWasThere
**Tagline**: "Step into historic sports moments"
**Version**: 1.0 MVP
**Date**: June 2026

**Description**: An AI-powered sports imagination generator. Users select a historic sports moment, upload a selfie, and get a photorealistic image of themselves inside that scene — plus viral captions for sharing.

**This is**: A sports imagination generator / viral content creation tool / POV experience engine
**This is NOT**: A photo editor / a video editor / a real attendance simulator

Never imply the user actually attended the event. Frame everything as "What if / POV / imagination".

**Core Flow** (3 clicks):
1. Browse historic sports moments (sorted by viral potential)
2. Upload selfie + tap "Step Into History"
3. Get AI image + viral captions + share to social

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4, custom dark theme
- **Authentication**: NextAuth.js v5 (Auth.js) with Google OAuth
- **State Management**: Zustand, React hooks
- **Deployment**: Vercel

### Backend
- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Language**: TypeScript
- **Deployment**: Cloudflare edge network

### Storage & Data
- **Structured Data**: Cloudflare D1 (SQLite-compatible)
  - Tables: `users`, `events`, `generations`
- **File Storage**: Cloudflare R2
  - `uploads/` — user selfie images
  - `outputs/` — AI-generated images
  - Signed URLs with 15-minute expiration for secure access

### AI Integration
- **Provider**: Agnes AI
- **Model**: `agnes-image-2.0-flash` (image-to-image mode)
- **Endpoint**: `POST https://apihub.agnes-ai.com/v1/images/generations`
- **Protocol**: OpenAI-compatible
- **Pricing**: Free (unlimited)
- **Execution**: Async (submit → poll pattern, for UX and resilience)

### Auth
- **Method**: HS256 JWT (signed with AUTH_SECRET)
- **Provider**: Google OAuth via NextAuth
- **Storage**: JWT in HTTP-only cookies (NextAuth session)
- **Admin**: Determined by ADMIN_EMAILS env var

---

## Architecture

```
User Browser (Mobile-First)
    │
    ▼
Next.js 16 (Vercel)
├── SSR/SSG pages
├── NextAuth.js (Google OAuth)
└── Client components → fetch() Workers API
    │
    ▼
Cloudflare Workers API (Hono)
├── /events         → D1 events table
├── /upload         → R2 uploads/
├── /generate       → Agnes AI + D1 generations
├── /generation/:id → Poll status
├── /generations    → User history
└── /admin/events   → Admin CRUD
    │
    ├── D1 (SQLite)  — users, events, generations
    ├── R2 (Object)  — uploads/, outputs/
    └── Agnes AI     — Image generation (img2img)
```

---

## Database Schema (D1)

```sql
-- Users (synced from NextAuth on first login, RETAINED from HotInsert)
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  image       TEXT,
  role        TEXT DEFAULT 'user',    -- 'user' | 'admin'
  credits     REAL DEFAULT 1.0,
  created_at  INTEGER DEFAULT (unixepoch())
);

-- Historic Sports Events
CREATE TABLE events (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,        -- e.g. "1998 World Cup Final: France vs Brazil"
  year              INTEGER NOT NULL,
  location          TEXT,                 -- e.g. "Stade de France, Paris"
  sport_type        TEXT NOT NULL,        -- football, basketball, tennis, athletics, cricket, boxing, american_football, other
  description       TEXT,
  key_moment        TEXT,                 -- e.g. "Zidane's first header in the 27th minute"
  era_clothing      TEXT,                 -- e.g. "late 90s casual wear, France jerseys"
  image_prompt      TEXT NOT NULL,        -- img2img prompt template with placeholders
  caption_templates TEXT,                 -- JSON array of 3-5 caption strings
  hashtags          TEXT,                 -- Space-separated hashtags
  viral_score       REAL NOT NULL DEFAULT 5.0,  -- 1.0-10.0
  thumbnail_url     TEXT,                 -- R2 key for event cover image
  status            TEXT NOT NULL DEFAULT 'active',  -- active, draft, archived
  created_at        INTEGER NOT NULL DEFAULT (unixepoch())
);

-- AI Generations
CREATE TABLE generations (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  event_id        TEXT NOT NULL REFERENCES events(id),
  input_image     TEXT NOT NULL,          -- R2 key of user selfie
  output_image    TEXT,                   -- R2 key of generated image
  agnes_job_id    TEXT,                   -- Agnes AI request ID for tracking
  status          TEXT NOT NULL DEFAULT 'queued'  -- queued, processing, completed, failed,
  error_message   TEXT,
  captions        TEXT,                   -- JSON array of generated captions
  selected_caption TEXT,                  -- User's chosen caption
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at    INTEGER
);
```

---

## Data Models (TypeScript)

```typescript
type SportType = 'football' | 'basketball' | 'tennis' | 'athletics' | 'cricket' | 'boxing' | 'american_football' | 'other';
type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed';

interface Event {
  id: string;
  title: string;
  year: number;
  location?: string;
  sportType: SportType;
  description?: string;
  keyMoment?: string;
  eraClothing?: string;
  imagePrompt: string;
  captionTemplates: string;  // JSON string
  hashtags: string;
  viralScore: number;        // 1-10
  thumbnailUrl?: string;
  status: 'active' | 'draft' | 'archived';
  createdAt: number;
}

interface Generation {
  id: string;
  userId: string;
  eventId: string;
  inputImage: string;        // R2 key
  outputImage?: string;      // R2 key
  agnesJobId?: string;
  status: GenerationStatus;
  errorMessage?: string;
  captions?: string[];       // parsed from JSON
  selectedCaption?: string;
  createdAt: number;
  completedAt?: number;
  // Enriched fields (from joins / API)
  event?: Event;
  inputImageUrl?: string;    // signed URL
  outputImageUrl?: string;   // signed URL
}
```

---

## API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/events` | List active events, sorted by `viral_score` DESC. Query: `?sportType=` filter, `?page=`, `?pageSize=`. Returns signed thumbnail URLs |
| GET | `/events/:id` | Single event detail |

### Authenticated

| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | Upload selfie to R2 (multipart/form-data). Returns `{ key, signedUrl }` |
| POST | `/generate` | Trigger generation. Body: `{ eventId, imageKey }`. Returns `{ generationId, status }` |
| GET | `/generation/:id` | Poll generation status. Returns full generation with signed URLs + captions |
| GET | `/generations` | User's generation history, paginated. Query: `?page=`, `?pageSize=` |
| GET | `/me` | Current user profile |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/events` | List all events (including drafts) |
| POST | `/admin/events` | Create event (multipart: thumbnail + JSON metadata) |
| PUT | `/admin/events/:id` | Update event |
| DELETE | `/admin/events/:id` | Delete event + associated R2 files |

---

## AI Pipeline

```
User selfie (R2 signed URL) + Event template
        │
        ▼
PromptBuilder.compile(event)
  → imagePrompt (img2img editing instruction)
  → captions (3-5 filled templates)
  → hashtags
        │
        ▼
Agnes AI — agnes-image-2.0-flash
  POST /v1/images/generations
  Body: {
    model: "agnes-image-2.0-flash",
    prompt: "<editing instruction>",
    size: "1024x768",
    extra_body: {
      tags: ["img2img"],
      image: ["<selfie signed URL>"],
      response_format: "url"
    }
  }
        │
        ▼
Generated image URL → Download → Upload to R2 outputs/
        │
        ▼
Return signed R2 URL + captions to frontend
```

### Prompt Template (Example — 1998 World Cup Final)

```
"Place this person naturally into the crowd at Stade de France during the
1998 World Cup Final. The person is wearing a late 90s France home jersey,
arms raised in the air, face showing pure euphoria, mouth open cheering.

Zidane just scored his first header in the 27th minute. The crowd is
exploding — people jumping, hugging strangers, French flags waving.
Confetti and paper streamers in the air. Stadium floodlights blazing down.
Night atmosphere, dramatic shadows.

The person should look like they are genuinely part of this crowd — same
lighting, same color temperature, same emotional intensity.

Visual style: Ultra-realistic DSLR sports photograph, ESPN broadcast
aesthetic, shallow depth of field, cinematic framing, 8K, Canon 35mm.

Keep the person's facial features and identity intact. Do NOT add text,
logos, or watermarks. Do NOT make it look like a collage or illustration."
```

---

## Frontend Routes

| Route | Description | Auth |
|-------|-------------|:---:|
| `/` | Home — Hero + sport tabs + event grid (viral score sorted) | No |
| `/login` | Google OAuth sign-in | No |
| `/create/[eventId]` | Event detail + selfie upload + "Step Into History" button | No* |
| `/result/[generationId]` | Generation progress + image display + caption picker + share | Yes |
| `/history` | User's generation history | Yes |
| `/admin` | Event management (CRUD) | Admin |

*Browse is public; generating requires login (redirects to `/login`)

### Click Flow (3 clicks)
1. **Home** (`/`) — Browse events by sport, tap one
2. **Create** (`/create/[eventId]`) — Upload selfie, tap "Step Into History"
3. **Result** (`/result/[id]`) — See image, pick caption, share

---

## Seed Events (15 events, by viral_score)

| # | Event | Sport | Year | Viral |
|---|-------|-------|------|-------|
| 1 | World Cup Final: Argentina vs France (Messi's crowning) | Football | 2022 | 9.5 |
| 2 | World Cup Semi: Germany 7-1 Brazil | Football | 2014 | 9.0 |
| 3 | World Cup Final: France vs Brazil (Zidane headers) | Football | 1998 | 8.5 |
| 4 | NBA Finals G7: LeBron's Block | Basketball | 2016 | 8.5 |
| 5 | UCL Final: Miracle of Istanbul | Football | 2005 | 8.0 |
| 6 | World Cup: Maradona "Goal of the Century" | Football | 1986 | 8.0 |
| 7 | World Cup Final: Iniesta 116th min winner | Football | 2010 | 8.0 |
| 8 | Beijing 2008: Usain Bolt 100m WR | Athletics | 2008 | 7.5 |
| 9 | UCL Final: Man Utd stoppage-time comeback | Football | 1999 | 7.5 |
| 10 | Super Bowl XLII: Helmet Catch | Am. Football | 2008 | 7.5 |
| 11 | Wimbledon Final: Federer vs Nadal | Tennis | 2009 | 7.0 |
| 12 | Barcelona 1992: Dream Team | Basketball | 1992 | 7.0 |
| 13 | Athens 2004: Liu Xiang 110m Hurdles Gold | Athletics | 2004 | 7.0 |
| 14 | Cricket World Cup Final (Super Over) | Cricket | 2019 | 6.0 |
| 15 | World Cup Final: Germany vs Argentina (Götze) | Football | 2014 | 7.0 |

---

## Environment Variables

```
# Frontend (.env.local)
AUTH_GOOGLE_ID=xxx
AUTH_GOOGLE_SECRET=xxx
AUTH_SECRET=xxx
NEXT_PUBLIC_WORKER_URL=https://api.example.workers.dev

# Backend (wrangler.toml / secrets)
AGNES_API_KEY=xxx
AUTH_SECRET=xxx
ADMIN_EMAILS=xxx@gmail.com
ENVIRONMENT=development
```

---

## 1-Week MVP Build Plan

| Day | Focus | Deliverables |
|-----|-------|-------------|
| **D1** | Cleanup + Database | Delete HotInsert code. Migration: drop old tables, create events + generations. Seed 15 events |
| **D2** | Backend Core | Types, PromptBuilder, Agnes AI client, D1 helpers. GET /events, GET /events/:id |
| **D3** | Backend Generate | POST /generate, GET /generation/:id (polling), GET /generations (history). Admin CRUD. curl E2E test |
| **D4** | Frontend Core | Types, API client. Layout + brand styling. Home page (event grid + sport tabs). EventCard component |
| **D5** | Frontend Flow | Create page (event detail + UploadSelfie + "Step Into History"). Result page (progress + image + captions + share) |
| **D6** | Frontend Polish | Share buttons (X/Twitter + copy link). History page. Admin page. Mobile responsive verification (375px) |
| **D7** | Deploy + Verify | wrangler deploy + Vercel deploy. Full E2E smoke test. Bug fixes |

---

## V2 Roadmap

1. **Video generation** — Agnes AI video / Kling image-to-video (3-5 sec cinematic)
2. **LLM captions** — Claude-enhanced personalized captions
3. **Flutter app** — Native mobile experience
4. **Payment** — Credit purchase system (if video costs increase)
5. **Community events** — User-submitted event templates + review
6. **A/B testing** — viral_score ranking vs random

---

## Verification

```bash
# 1. Migration
wrangler d1 execute DB --file=./migrations/0007_rebuild.sql

# 2. Seed events
# Run seed script to insert 15 events

# 3. API E2E test
# Upload selfie
curl -X POST {WORKER_URL}/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@selfie.jpg"

# Trigger generation
curl -X POST {WORKER_URL}/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"1998-wc-final","imageKey":"uploads/xxx/selfie.jpg"}'

# Poll result
curl {WORKER_URL}/generation/{id} \
  -H "Authorization: Bearer $TOKEN"

# 4. Frontend
# Open / → Select event → Upload selfie → Generate → View image → Share
```

---

This spec is ready for implementation.
Last updated: June 2026 — migrated from HotInsert to IfIWasThere. Agnes AI (img2img), image-first MVP, viral scoring, free.
