# Rhine Alps Express

A production-style MVP for a bottled water ordering and delivery platform serving Nairobi, Kenya.

## Roles

| Role | What they do |
|---|---|
| **Customer** | Register, place orders, track deliveries, view credit and loyalty |
| **Rider** | View assigned deliveries, advance delivery status, confirm with OTP |
| **Admin** | Manage orders, customers, riders, payments, slots, and reports |
| **Super Admin** | Create admin/rider accounts, unlock locked users, manage system settings, view full audit log |

---

## Tech Stack

- **Next.js 15** (App Router, React 19, TypeScript)
- **Tailwind CSS v3** + shadcn/ui
- **Prisma ORM** + **PostgreSQL**
- **Auth.js v5** (next-auth@5 beta, JWT strategy, Credentials provider)
- **Zod** + **React Hook Form**

---

## Prerequisites

- **Node.js** ≥ 20 (tested on v20 LTS and v22)
- **PostgreSQL** ≥ 14 running locally, or use Docker Compose (see below)
- **npm** ≥ 9

---

## Local Setup (without Docker)

### 1. Clone and install

```bash
git clone <repo-url>
cd rhine-alps-express
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the required values:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Run `openssl rand -base64 32` to generate |
| `AUTH_URL` | Yes | `http://localhost:3000` in dev |
| `MPESA_*` | No (MVP) | Leave blank; M-Pesa integration is stubbed |
| `GOOGLE_MAPS_API_KEY` | No (MVP) | Leave blank; map pin is optional at checkout |
| `SMS_PROVIDER_API_KEY` | No (MVP) | Leave blank; notifications fall back to in-app |

### 3. Set up the database

Create the database first if it doesn't exist:

```bash
createdb rhine_alps_express
# or: psql -c "CREATE DATABASE rhine_alps_express;"
```

Run migrations:

```bash
npm run db:migrate
```

Seed with sample data (users, slots, zones, orders):

```bash
npm run db:seed
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

---

## Seed Credentials

All passwords are for **development only**.

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@rhinealpss.co.ke | `SuperAdmin123!` |
| Admin | admin@rhinealpss.co.ke | `Admin123!` |
| Admin (ops) | ops@rhinealpss.co.ke | `Admin123!` |
| Rider | rider.james@rhinealpss.co.ke | `Rider123!` |
| Rider | rider.peter@rhinealpss.co.ke | `Rider123!` |
| Customer (Band 1) | jane.kamau@example.com | `Customer123!` |
| Customer (Band 2) | john.njoroge@example.com | `Customer123!` |
| Customer (Band 3) | mary.achieng@example.com | `Customer123!` |

After login, each user is redirected to their role's dashboard automatically.

---

## Local Setup (with Docker Compose)

Docker Compose runs both the app and a PostgreSQL database in containers.

### 1. Configure environment

```bash
cp .env.example .env.local
```

Set `DATABASE_URL` to the Docker Compose internal hostname:

```
DATABASE_URL="postgresql://postgres:postgres@db:5432/rhine_alps_express"
AUTH_SECRET="<run: openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"
```

### 2. Build and start

```bash
docker compose up --build
```

The app will be available at [http://localhost:3000](http://localhost:3000).

On first run, the entrypoint automatically runs `prisma migrate deploy` and `prisma db seed` before starting the server.

### 3. Stop

```bash
docker compose down
# To also remove the database volume:
docker compose down -v
```

---

## npm Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Start production server (requires build) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:migrate` | Run migrations in dev (creates new migration if schema changed) |
| `npm run db:migrate:deploy` | Apply existing migrations without generating new ones (prod/CI) |
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:reset` | Drop and recreate the database, re-run migrations and seed |

---

## Route Structure

```
/                         → redirects to role dashboard
/login                    → sign in
/register                 → customer self-registration

/customer/dashboard       → customer home
/customer/orders          → order history
/customer/orders/new      → place a new order
/customer/orders/[id]     → order detail, cancel, track
/customer/profile         → account settings, address, credit, loyalty

/rider/dashboard          → assigned deliveries queue
/rider/deliveries/[id]    → delivery detail, OTP entry, status updates

/admin/dashboard          → operations overview
/admin/orders             → all orders (filterable)
/admin/orders/[id]        → order detail + admin controls
/admin/customers          → customer list
/admin/customers/[id]     → customer detail, credit ledger
/admin/riders             → rider list
/admin/slots              → delivery slot management
/admin/reports            → sales, unpaid, credit, rider performance (CSV export)

/super-admin/dashboard    → system overview, locked accounts
/super-admin/users        → all admins and riders
/super-admin/users/new    → create admin or rider account
/super-admin/audit        → full audit log with date/action filter
/super-admin/settings     → system settings editor
```

---

## Environment Variable Reference

See `.env.example` for the full list with inline comments. Key variables:

### Required for the app to start

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:pass@host:port/db`) |
| `AUTH_SECRET` | Random secret for JWT signing. Generate: `openssl rand -base64 32` |
| `AUTH_URL` | Full base URL of the app, including port in dev (`http://localhost:3000`) |

### Optional (stubbed in MVP)

| Variable | Description | When to fill in |
|---|---|---|
| `MPESA_CONSUMER_KEY` | Safaricom Daraja API key | When wiring M-Pesa STK push |
| `MPESA_CONSUMER_SECRET` | Daraja secret | Same |
| `MPESA_SHORTCODE` | Business shortcode | Same |
| `MPESA_PASSKEY` | Lipa Na M-Pesa passkey | Same |
| `MPESA_ENVIRONMENT` | `sandbox` or `production` | Same |
| `GOOGLE_MAPS_API_KEY` | Google Maps Platform key | When enabling map-pin delivery location |
| `SMS_PROVIDER_API_KEY` | Africa's Talking / Twilio | When activating SMS notifications |
| `SMS_PROVIDER_SENDER_ID` | Sender name for SMS | Same |
| `NEXT_PUBLIC_APP_URL` | Public-facing URL | Required in production |

---

## Key Business Rules (summary)

- **Pricing bands**: Band 1 (0–2 km, KES 150/bottle), Band 2 (named areas, KES 200/bottle), Band 3 (all else, KES 150 + KES 30/km)
- **COD**: not allowed for Band 3 orders
- **OTP**: required for delivery confirmation; max 3 attempts, max 3 resends with 30 s cooldown
- **Loyalty**: 1 free bottle after every 10 completed qualifying orders
- **Credit**: no cash refunds; all approved balances become account credit, auto-applied to next order
- **Audit**: all protected actions (price overrides, force-complete, OTP override) are logged with mandatory reason codes

See `docs/business-rules.md` for the full specification.

---

## Project Structure

```
app/
  (auth)/           login, register
  (customer)/       customer portal
  (rider)/          rider console
  (admin)/          admin panel
  (super-admin)/    super admin panel
  api/              API routes
lib/
  audit/            append-only audit logger
  auth/             session helpers, API auth guards
  credit/           customer credit ledger service
  notifications/    notification service + templates
  orders/           status transition guards
  otp/              OTP generation and verification
  pricing/          pricing engine + zone matcher
  reporting/        report queries
  slots/            slot availability validator
  validations/      Zod schemas
prisma/
  schema.prisma     full data model
  seed.ts           dev seed data
components/
  nav/              role-specific navigation shells
  shared/           status badges, page header, empty state
  ui/               shadcn components
docs/
  business-rules.md source of truth for all business logic
  build-prompt.md   original build specification
```
