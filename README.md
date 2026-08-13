# BathPass 🚿📱

> A lightweight, privacy-conscious virtual queue & waitlist system for shared venue bathrooms at schools, workplaces, and events.

BathPass replaces physical standing lines with a digital waitlist. Guests join a queue from their mobile browser without creating an account, track their place in real-time, and get notified when it is their turn. Staff operators manage live calls and bathroom availability from a secure dashboard.

---

## ✨ Features

- 📱 **Accountless Guest Journeys**: Guests join a queue in seconds via QR code without creating an account or providing PII. Authentication relies on 32-byte secret possession tokens stored in HttpOnly cookies.
- ⚡ **Autonomous Queue Dispatch**: When a guest finishes their visit and taps *"I'm Finished"*, the system automatically completes the pass and dispatches a call to the next waiting guest in line.
- ⏱️ **Auto-Expiring Response Windows**: Server-enforced response window timer (default: 5 minutes). If a called guest fails to report, the background sweeper marks them `skipped` and auto-calls the next guest.
- 🔒 **10 Core Invariants Enforced**: Server-authoritative state transitions preventing double-queuing, concurrent calling races, or state tampering.
- ⚙️ **User-Editable Location Config (`bathpass.config.json`)**: Configure venue name, slug, timezone, response window, and bathroom layout in a single JSON configuration file.
- 🎨 **Modern Mobile-First UI**: Built with Next.js, Tailwind CSS, shadcn/ui components, and Lucide icons.
- 🛡️ **Type-Safe & Secure**: T3 Env environment validation with Zod, constant-time HMAC signature checks (`crypto.timingSafeEqual`), and RFC 7231 HTTP security headers.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (Pages Router, TypeScript)
- **Runtime**: [Bun](https://bun.sh/)
- **Database & ORM**: PostgreSQL, [Drizzle ORM](https://orm.drizzle.team/)
- **Styling & UI**: Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/), Lucide React
- **Validation**: [Zod](https://zod.dev/), [@t3-oss/env-nextjs](https://env.t3.gg/)
- **Testing**: [Vitest](https://vitest.dev/)

---

## 🚀 Quick Start

### 1. Prerequisites
- [Bun](https://bun.sh/) installed
- PostgreSQL database running locally or hosted (e.g. Supabase, Neon)

### 2. Installation
```bash
git clone <repository-url>
cd bathpass
bun install
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your `.env` variables:
```env
DATABASE_URL=postgres://localhost:5432/bathpass
SESSION_SECRET=bathpass-dev-secret-key-do-not-use-in-prod
NODE_ENV=development
```

### 4. Venue Location Configuration
Customize your venue name and bathroom layout in `bathpass.config.json`:
```json
{
  "venue": {
    "id": "venue-main",
    "slug": "main",
    "name": "Lincoln High School",
    "responseWindowSeconds": 300,
    "timeZone": "America/Chicago"
  },
  "bathrooms": [
    { "id": "bm-1", "name": "First Floor - West", "locationHint": "Near Main Entrance", "state": "open" },
    { "id": "bm-2", "name": "Second Floor - East", "locationHint": "Adjacent to Lab 204", "state": "open" }
  ],
  "defaultOperator": {
    "id": "op-1",
    "authSubject": "operator",
    "displayLabel": "Staff Operator Sam",
    "role": "operator"
  }
}
```

### 5. Database Seed & Migrations
```bash
# Push database schema
bun run db:push # or drizzle-kit migrate

# Seed database from bathpass.config.json
bun run seed
```

### 6. Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Guest View**: `http://localhost:3000`
- **Operator Dashboard**: `http://localhost:3000/operator` (Default login: `operator` / `bathpass2026`)

---

## 🧪 Testing

Run the Vitest integration and domain test suite:
```bash
bun run test
```

Run TypeScript verification:
```bash
bun run typecheck
```

---

## 📦 Deployment (Vercel + PostgreSQL)

1. Deploy the codebase to **[Vercel](https://vercel.com/)** (automatically uses `vercel.json` settings).
2. Configure Environment Variables in Vercel Dashboard:
   - `DATABASE_URL` (PostgreSQL connection string)
   - `SESSION_SECRET` (Secure random string, e.g. `openssl rand -hex 32`)
3. Run `bun run seed` on your database instance to initialize venue configuration.

---

## 📜 License

MIT License. Built for seamless venue queue coordination.
