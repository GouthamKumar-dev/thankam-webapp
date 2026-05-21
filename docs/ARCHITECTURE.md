# Thankam Events Management - Architecture

## Monorepo Layout

- `apps/api`: NestJS backend
- `apps/web`: React admin/staff app

## Backend Architecture (NestJS)

### Core Modules

- `auth`: login, refresh rotation, forgot/reset password, logout
- `users`: admin user management for staff/admin users
- `categories`: infinite nested categories with self-relation
- `items`: leaf-level item management with category constraints
- `menus`: menu builder with ordered multi-item composition
- `quotations`: draft/finalize quotations with total calculations and templates
- `gallery`: media upload metadata, gallery/social/featured flags, reorder
- `website-review`: testimonial/homepage review asset management
- `settings`: company/GST/footer/contact settings
- `upload`: file ingestion via Multer with local filesystem storage
- `dashboard`: role-aware statistics and recent activity

### Security

- JWT access token (`Authorization: Bearer`)
- JWT refresh token in secure HTTP-only cookie (`refreshToken`)
- refresh token rotation via persisted hashed refresh token records
- role-based authorization (`ADMIN`, `STAFF`) using `RolesGuard`
- password hashing with bcrypt

### Validation

- DTO validation with `class-validator`
- global whitelist/forbid unknown payload using Nest `ValidationPipe`

## Database Design (Prisma + PostgreSQL)

### Key Relationships

- `Category` self-relation (`parentId`) enables infinite nesting
- `Category -> Item` one-to-many
- `Menu <-> Item` via `MenuItem` (ordered)
- `Quotation -> QuotationItem` one-to-many (ordered)
- `Quotation -> Menu` optional relation
- `Quotation -> User(createdBy)`
- `Media -> User(uploadedBy)`
- `User -> RefreshToken`
- `User -> PasswordResetToken`

### Hierarchy Constraint Rule

- A category can contain **subcategories OR items**, not both.
- Enforced by:
  - category creation: parent cannot already have items
  - item creation: target category cannot already have subcategories

## Quotation Engine

### Supported Templates

- `MODERN_MINIMAL`
- `PREMIUM_GOLD`
- `TRADITIONAL_KERALA`
- `ELEGANT_CORPORATE`
- `CLEAN_SIMPLE`

### Calculation Flow

1. Normalize item lines (merge menu items + manual/custom items)
2. Compute line amount = quantity * unitPrice
3. Compute `subTotal`
4. Apply `discountAmount`
5. Add `extraChargesAmount`
6. Apply `gstPercent`
7. Compute `grandTotal`

### States

- `DRAFT`
- `FINALIZED` (locked from updates)

## Frontend Architecture (React + TypeScript + Vite)

### UI System

- Tailwind CSS utility-first layout
- shadcn-style reusable components in `components/ui`
- reusable app primitives:
  - `DataTable` (Material React Table)
  - `Modal`
  - `FormField`
  - `FileUpload`
  - `StatCard`

### App Structure

- `layouts`: sidebar dashboard shell, page shell
- `routes`: protected and role-scoped routes
- `store`: Redux Toolkit auth slice
- `services`: centralized Axios client with interceptors
- `features`: domain service modules
- `pages`: role-based pages for admin/staff

### Routing

- Public: login/forgot/reset
- Protected:
  - `/admin/*` for `ADMIN`
  - `/staff/*` for `STAFF`

## API Surface (High Level)

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/logout`

- `GET/POST/PATCH/DELETE /api/categories`
- `GET/POST/PATCH/DELETE /api/items`
- `GET/POST/PATCH/DELETE /api/menus`
- `POST /api/menus/:id/duplicate`

- `GET/POST/PATCH/DELETE /api/quotations`
- `POST /api/quotations/:id/finalize`
- `POST /api/quotations/:id/draft`
- `POST /api/quotations/:id/duplicate`
- `GET /api/quotations/:id/pdf-data`

- `GET/POST/PATCH/DELETE /api/gallery`
- `POST /api/gallery/reorder`

- `GET/POST/PATCH/DELETE /api/website-review`
- `POST /api/website-review/reorder`

- `GET/PUT /api/settings`
- `POST /api/upload/media`
- `GET /api/dashboard/stats`

## Deployment-Ready Notes

- Environment-driven config via `.env`
- PostgreSQL via `docker-compose.yml`
- Prisma migrations + seed support
- Local uploads enabled for VPS filesystem persistence
- CORS + cookie auth configured for separate app domain
