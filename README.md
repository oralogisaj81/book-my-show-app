# CineHall

A full-stack movie ticket booking platform (Book My Show style): movie listings,
cinema/showtime selection, interactive seat maps with real-time hold locking,
checkout with QR-coded tickets, account/booking history, and an admin console
for theaters, scheduling, and analytics.

## Stack

- **Frontend**: React 19 + TypeScript + Vite, Tailwind CSS v4, Framer Motion,
  TanStack Query, Zustand, React Router.
- **Backend**: Fastify 5 + TypeScript, Drizzle ORM, Neon serverless Postgres.
  Seat holds use Postgres advisory locks instead of Redis, so there's no extra
  infra to run.
- **Auth**: scrypt password hashing + HMAC-signed httpOnly session cookies.
- **Deployment**: single Node process serves both the API (`/api/*`) and the
  built frontend — one artifact, no separate frontend/backend services.

## Local development

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and SESSION_SECRET
npm run db:migrate
npm run dev             # Vite (HMR) + Fastify, proxied together
```

## Production build

```bash
npm run build
npm start
```

## Admin access

Sign up through the app, then promote the account:

```bash
npm run admin:promote -- you@example.com
```
