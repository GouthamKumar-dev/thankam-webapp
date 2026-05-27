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

## Production Media Uploads

The API accepts media uploads up to `UPLOAD_MAX_FILE_SIZE_MB` per file, defaulting to `50` MB. Set `VITE_UPLOAD_MAX_FILE_SIZE_MB` to the same value when changing it, so the admin UI presents the correct limit. Gallery multi-select uploads are sent one file per request so the proxy limit does not need to allow an entire batch at once.

When the API is behind Nginx, set the request limit above the configured per-file limit in the server block that proxies `/api`:

```nginx
client_max_body_size 55M;
```

After changing Nginx configuration, validate and reload it:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Equivalent body-size limits must also be increased in any hosting platform, load balancer, or CDN in front of the API.
