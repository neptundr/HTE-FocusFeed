# FocusFeed

A TikTok-style educational video platform built with Next.js 14, featuring short vertical video reels and mini quizzes for university courses.

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js (Credentials provider)
- **Styling**: Tailwind CSS (Moon Dust palette)
- **State**: Zustand (client-side preferences)
- **Integrations**: AWS (S3, Transcribe, Bedrock), Featherless (Qwen), MiniMax

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or use Docker)

### Local Development

1. **Clone and install dependencies**

```bash
git clone <repo-url>
cd HTE-FocusFeed
npm install
```

2. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your values
```

3. **Start the database** (via Docker)

```bash
docker compose up db -d
```

4. **Set up Prisma**

```bash
npx prisma generate
npx prisma db push
npm run db:seed   # optional: seed mock data
```

5. **Run the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Hosting (Production) — focusfeed.study

The app is configured for **http://focusfeed.study** (no SSL).

**Storage:** Vercel’s free tier gives ~100 MB static and **no writable disk** at runtime—so you can’t store generated reels there. You need S3 (or similar) for media either way. **AWS is a good fit**: you already have S3; host the app on Amplify and keep reels in S3.

---

#### Option A: AWS Amplify (recommended)

Free tier: 1,000 build min/month, 5 GB CDN, 15 GB transfer, 500k SSR requests. Use your existing S3 for reels/upload storage.

1. Push code to GitHub. In [AWS Amplify Console](https://console.aws.amazon.com/amplify/) → **New app** → **Host web app** → connect repo.
2. Build: Amplify usually auto-detects Next.js. Ensure Node 20 in build image settings if needed.
3. **Environment variables** (App settings → Environment variables): add all from `.env.example`—`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL=http://focusfeed.study`, `NEXT_PUBLIC_APP_URL=http://focusfeed.study`, `ACCESS_KEY_ID_AWS`, `SECRET_ACCESS_KEY_AWS`, `REGION_AWS`, `S3_BUCKET_AWS`, MiniMax, Featherless, `USE_MOCK_DATA=false`.
4. **Domain:** App settings → Domain management → add **focusfeed.study** (and www if you want). Add the CNAME/A record at your registrar. Amplify serves HTTP by default.
5. Run DB migrations against production: `DATABASE_URL="postgresql://..." npx prisma db push` (or `prisma migrate deploy`).
6. **Important:** The create-video pipeline writes reels to local disk. Amplify has a read-only filesystem, so **video generation that saves to disk won’t run on Amplify**. Either use seed/mock data and store reel URLs in DB pointing to S3, or run the pipeline on EC2 and upload reels to S3, then host only the Next.js app on Amplify.

After deploy, the app is at the Amplify URL; once DNS points to Amplify, it’s at **http://focusfeed.study**.

---

#### Option B: Vercel

Free tier has limited storage and no writable disk. Use S3 for all reels; same pipeline limitation as Amplify. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to **http://focusfeed.study** and add the domain in Vercel.

---

#### Option C: EC2 (app + pipeline on one server)

Run Node, Postgres (or RDS), and the pipeline on one EC2 instance so reels can be written to disk (or upload to S3 from EC2). Reverse proxy (Nginx/Caddy), env vars, and point **focusfeed.study** DNS to the instance IP.

---

**Checklist:** Production DB + migrations, `NEXTAUTH_URL` and `NEXTAUTH_SECRET` set, DNS for focusfeed.study → host, API keys in env.

### Docker (Full Stack)

```bash
docker compose up --build
```

This starts both the PostgreSQL database and the Next.js app.

## Project Structure

```
app/                  Next.js App Router pages and API routes
  feed/               Main video/quiz feed
  create/             Create video and course pages
  messages/           Chat and messaging
  profile/            User profile
  (auth)/             Login and register
  api/                REST API endpoints
components/           React components
  layout/             BottomNav, TopBar
  feed/               VideoReel, PlaybackSlider, QuizCard, modals
  create/             TopicEditor, VideoUploader
  messages/           Chat components
  profile/            Avatar, FriendSearch, CourseList, VideoGrid
  ui/                 Reusable UI primitives (Button, Modal, Input, Toggle, Tabs)
lib/                  Shared utilities
  api/                Third-party integration stubs (AWS, MiniMax, Featherless, ffmpeg)
  stores/             Zustand stores
  auth.ts             NextAuth configuration
  prisma.ts           Prisma client singleton
  mock-data.ts        Mock data for development
prisma/               Database schema and seed
```

## Mock Data Mode

Set `USE_MOCK_DATA=true` in `.env` to run the app with mock data without a database connection. This is the default for development.

Mock credentials for login:
- Username: `alice`, `bob`, or `charlie`
- Password: `password123`

## Features

- Vertical scroll video feed with snap scrolling
- Video playback slider (hover on desktop, tap on mobile)
- Quiz cards interleaved in the feed
- Like, dislike (with reason), comment, and share actions
- Course creation with PDF syllabus topic extraction
- Video upload with multi-step processing wizard
- Real-time messaging with shared video links
- User profiles with courses and videos tabs
- Friend search and management
- Customizable feed preferences (video length, content types, course visibility)

## Color Palette (Moon Dust)

| Name     | Hex       |
|----------|-----------|
| Lavender | `#D3D3FF` |
| Purple   | `#CEB5FF` |
| Sky      | `#8EC1DE` |
| Blue     | `#80A8FF` |
