# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. CONTENT IS IN FRENCH as WELL as ERRORs

> **Important:** This is Next.js 16 with React 19 and Tailwind CSS 4 — APIs, conventions, and file structure may differ from training data. Read `node_modules/next/dist/docs/` before writing any Next.js-specific code. Heed deprecation notices.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint (eslint.config.mjs, Next.js config)
npx tsc --noEmit # Type-check without emitting
```

```bash
npm test          # Run tests once (Vitest)
npm run test:watch # Watch mode
```

## Architecture

**Jatigi** is a French-language B2B inventory and order management SaaS for social-commerce businesses (TikTok, Instagram, etc. sales channels). It is multi-tenant (one organization per business).

### Stack

- **Next.js 16** App Router, TypeScript, Tailwind CSS 4
- **Supabase** — Postgres + Auth + RLS (Row-Level Security enforces org isolation)
- **Zustand 5** — client-side state (three stores: auth, products, orders)
- **react-hook-form + Zod 4** — forms and validation
- **Recharts** — analytics charts

### Route groups

| Group | Path prefix | Who |
|-------|-------------|-----|
| `(landing)` | `/` | Public |
| `(app)` | `/dashboard`, `/products`, `/orders`, `/analytics`, `/team`, `/account` | Authenticated |
| `app/api/` | `/api/*` | Server-only |
| `app/auth/` | `/auth/login`, `/auth/callback`, `/auth/signup` | Unauthenticated |

`middleware.ts` enforces session and role (admin vs employee). Admin-only routes: `/dashboard`, `/products`, `/analytics`, `/team`. Non-admins hitting those are redirected to `/orders`.

### Data flow

```
Page component
  └─ useProducts() / useOrders()        (hooks/)
       ├─ fetches /api/products etc.
       ├─ writes to Zustand store        (stores/)
       └─ re-reads from store for UI

API Route (app/api/)
  ├─ validates with productSchema        (lib/schemas/)
  ├─ checks auth via createClient()      (services/supabase/server.ts)
  └─ calls service function             (services/)
       └─ Supabase query (RLS applied)
```

### Key design rules

**Role-based data filtering in API routes**: the `GET /api/products` handler strips all cost columns (`purchase_cost`, `import_cost`, `import_cost_raw`, `import_cost_type`, `import_batch_size`, `packaging_cost`) before returning data to non-admin users. Always maintain this strip when adding new sensitive fields.

**Import cost is a derived field**: `products.import_cost` stores the computed per-unit cost. The raw entry data lives in `import_cost_type` ('unit' | 'carton' | 'lot' | 'container'), `import_cost_raw`, and `import_batch_size`. The API route computes `import_cost = import_cost_raw / import_batch_size` (or just `import_cost_raw` when type is 'unit'). Never let the form submit `import_cost` directly.

**FIFO lot-based stock**: costs must never be edited directly on a product — they flow through `stock_lots` via `POST /api/products/:id/lots`. The PUT `/api/products/:id` rejects any cost fields. Each lot has its own `unit_cost`; when an order is placed, the `consume_stock_fifo` Postgres RPC allocates lots oldest-first and returns the weighted unit cost stored in `order_lines.unit_cost`. The FIFO allocation logic lives as a pure, tested function in `lib/lot-allocation.ts`.

**Cost snapshot on order creation**: `services/order-service.ts` calls `consume_stock_fifo` RPC per order line, which handles lot depletion atomically with row-level locking. The returned weighted cost is stored in `order_lines.unit_cost` — accurate even if lot costs differ across shipments.

**Analytics are always period-scoped**: `useAnalytics(range)` takes a `DateRange` and re-fetches when it changes. The `/api/analytics?from=&to=` endpoint defaults to "today" if params are absent. Date-range helpers live in `lib/date-periods.ts` (`getPeriodDates`, `formatISODate`) — tested in `lib/__tests__/date-periods.test.ts`. The `PeriodSelector` component in `components/dashboard/period-selector.tsx` is shared by both the dashboard and analytics pages.

**Zustand stores are append-only caches**: hooks fetch once on mount (skipping if data already present), then mutate the store optimistically. There is no cache invalidation beyond page reload.

**Auth context flows through AuthProvider**: `components/layout/auth-provider.tsx` bootstraps the Zustand auth store by calling `/api/me` on mount and subscribing to `supabase.auth.onAuthStateChange`. Use `useAuthStore()` (and its `isAdmin()` selector) anywhere in client components.

### Database migrations

Migrations live in `supabase/migrations/` and must be applied in order:
1. `001_initial_schema.sql` — core tables, RLS, stock-decrement trigger
2. `002_multi_tenant.sql` — `organizations` table, `organization_id` on all tables, org-scoped RLS
3. `003_import_cost_batch.sql` — `import_cost_type`, `import_cost_raw`, `import_batch_size` on products
4. `004_stock_lots.sql` — `stock_lots` and `order_line_lots` tables, `consume_stock_fifo` and `increment_product_stock` RPCs, drops `after_order_line_insert` trigger

### UI components

`components/ui/` has a minimal set: `Button`, `Input`, `Select`, `Card`/`CardContent`/`CardHeader`, `Badge`, `Skeleton`. These are thin wrappers; there is no shadcn/ui or Radix dependency. Build new primitives in the same style if needed rather than importing a component library.

### Localization

The UI is entirely in French. Currency is formatted as XOF (FCFA) via `formatCurrency()` in `lib/utils.ts`. Keep all user-facing strings in French.

### Environment variables

Required (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
