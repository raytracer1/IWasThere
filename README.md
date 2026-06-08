# HotInsert AI 🔥

Put yourself in the hottest moments. Upload a selfie and AI inserts you into trending event videos (World Cup, concerts, Oscars, etc.).

## Tech Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | Next.js 15 (App Router, TypeScript) | Vercel |
| Backend | Cloudflare Workers (Hono, TypeScript) | Cloudflare |
| Database | Cloudflare D1 (SQLite) | Cloudflare |
| Storage | Cloudflare R2 | Cloudflare |
| Auth | NextAuth.js v5 + Google OAuth | — |
| AI | fal.ai pixverse/swap | fal.ai |
| Styling | Tailwind CSS + shadcn/ui | — |

## Project Structure

```
hotinsert-ai/
├── frontend/       # Next.js 15 app (Vercel)
│   ├── app/        # App Router pages
│   ├── components/ # React components
│   └── lib/        # Auth, API client, utilities
├── backend/        # Cloudflare Workers API
│   ├── src/
│   │   ├── routes/      # API route handlers
│   │   ├── middleware/   # Auth, rate limiting
│   │   └── utils/       # D1, R2, fal.ai helpers
│   └── migrations/ # D1 SQL migrations
├── shared/         # Shared TypeScript types
└── SPEC.md         # Technical specification
```

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm 10+
- Cloudflare account (for Workers, D1, R2)
- Vercel account (for frontend deployment)
- Google Cloud Console project (for OAuth)
- fal.ai API key

### Setup

1. **Install dependencies**
```bash
pnpm install
```

2. **Set up environment variables**

Copy `frontend/.env.local.example` to `frontend/.env.local` and fill in:
- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `AUTH_GOOGLE_ID` — Google OAuth client ID
- `AUTH_GOOGLE_SECRET` — Google OAuth client secret
- `NEXT_PUBLIC_WORKER_URL=http://localhost:8787`

3. **Set up Cloudflare D1**
```bash
cd backend
wrangler d1 create hotinsert-db
wrangler d1 execute hotinsert-db --local --file=./migrations/0001_init.sql
```

4. **Set up Cloudflare R2**
```bash
wrangler r2 bucket create hotinsert-assets
```

5. **Set up Cloudflare Worker secrets**
```bash
wrangler secret put FAL_API_KEY       # Your fal.ai API key
wrangler secret put AUTH_SECRET       # Same as AUTH_SECRET in frontend
wrangler secret put ADMIN_EMAILS      # Comma-separated admin emails
```

6. **Update `backend/wrangler.toml`** with your D1 database ID.

### Development

```bash
# Run both frontend and backend
pnpm dev

# Or individually:
cd frontend && pnpm dev    # http://localhost:3000
cd backend && pnpm dev     # http://localhost:8787
```

### Deployment

```bash
cd backend && wrangler deploy
cd frontend && vercel deploy
```

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|:---:|
| `GET` | `/events` | List active events | Yes |
| `GET` | `/events/:id` | Event detail | Yes |
| `POST` | `/upload` | Upload selfie to R2 | Yes |
| `POST` | `/swap` | Trigger AI swap job | Yes |
| `GET` | `/job/:id` | Poll job status | Yes |
| `GET` | `/history` | User's generation history | Yes |
| `POST` | `/admin/events` | Create event | Admin |
| `PUT` | `/admin/events/:id` | Update event | Admin |
| `DELETE` | `/admin/events/:id` | Delete event | Admin |

## Features
- Google OAuth sign-in (required)
- Browse trending events by category
- Upload selfie (drag & drop)
- AI face swap generation (~$0.50/gen, 10/day limit)
- Real-time job status polling
- Video download and sharing
- Generation history with pagination
- Admin panel for event management

## License

MIT
