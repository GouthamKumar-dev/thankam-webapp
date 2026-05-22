# Thankam Events Management

Production-ready event quotation management platform.

## Apps

- `apps/api` - NestJS + Prisma + PostgreSQL
- `apps/web` - React + TypeScript + Vite + Tailwind + shadcn/ui

## Quick Start

1. Copy `.env.example` to `.env`
2. Start PostgreSQL
3. Copy `apps/web/.env.example` to `apps/web/.env`
4. Install deps: `npm install`
5. Run Prisma commands from `apps/api`:
   - `npx prisma generate`
   - `npx prisma migrate dev`
   - `npm run seed`
6. Start apps:
   - API: `npm run dev:api`
   - Web: `npm run dev:web`

## Default Admin Login

- Email: `gouthamkumar091@gmail.com`
- Password: `Admin@123`

## Domains

- Website: https://thankamevents.in
- Admin: https://app.thankamevents.in
