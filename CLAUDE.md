# Bites RMS

B2B SaaS restaurant management platform — companion to the Bites consumer discovery app. Restaurants use it to manage reservations, tables, customers, payments, staff, and operations. Includes AI-powered demand forecasting, labour optimisation, and predictive analytics.

## Tech Stack

- **Frontend:** Next.js 14+ with TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Node.js with tRPC (type-safe API layer)
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js with role-based access (owner, manager, host, staff)
- **Real-time:** Socket.io for live table status and reservation updates
- **Payments:** Stripe SDK
- **Notifications:** Twilio (SMS), Resend (email)
- **AI/ML:** Python FastAPI microservice using Prophet, XGBoost, scikit-learn
- **Deployment:** Docker containers
- **Monorepo:** Turborepo with pnpm workspaces

## Project Structure

```
apps/web        — Next.js web dashboard (primary interface for managers/owners)
apps/tablet     — Next.js PWA optimised for iPad (host stand interface)
packages/db     — Prisma schema and database client
packages/api    — tRPC router and procedures
packages/ui     — shared UI component library (shadcn/ui based)
packages/types  — shared TypeScript types
packages/utils  — shared utility functions
services/ai     — Python FastAPI microservice for ML predictions
```

## Architecture Rules

These are strict — never violate them:

1. **Multi-tenant isolation:** Every database query MUST filter by `restaurantId`. Never expose data across restaurants. This is the most critical security invariant.
2. **Role-based access:** Check permissions at the API layer (tRPC middleware), never trust the client. Roles: owner > manager > host > staff.
3. **Audit logging:** Log all write operations with `userId`, `timestamp`, and action type.
4. **Optimistic UI:** Update the UI immediately on user action, then sync with the server. Roll back on failure.
5. **Offline resilience:** The tablet app (`apps/tablet`) must queue actions when offline and sync when reconnected.
6. **Prisma transactions:** Use transactions for any operation that modifies multiple tables.

## Coding Conventions

### TypeScript & React

- TypeScript strict mode everywhere — no `any` types
- Functional components with hooks only (no class components)
- Next.js server components by default; use `"use client"` only when the component needs interactivity, browser APIs, or hooks like `useState`/`useEffect`
- Use Zod for all input validation (tRPC inputs, form data, API boundaries)

### Naming

- Files: `kebab-case.tsx` (e.g., `reservation-list.tsx`)
- Components: `PascalCase` (e.g., `ReservationList`)
- tRPC routers/procedures: `camelCase`

### Libraries

- Use `date-fns` for all date manipulation — never use raw `Date` methods
- Use Prisma for all database access — no raw SQL unless absolutely necessary
- Use shadcn/ui components from `packages/ui` — don't install component libraries directly in apps

### Environment

- Use `.env.local` for development secrets
- Never commit `.env` files or secrets

## Common Commands

```bash
pnpm install              # install dependencies
pnpm dev                  # run all apps in development
pnpm build                # build all packages and apps
pnpm lint                 # lint everything
pnpm test                 # run Vitest unit tests
pnpm test:e2e             # run Playwright E2E tests
pnpm db:push              # push Prisma schema to database
pnpm db:generate          # regenerate Prisma client
pnpm db:studio            # open Prisma Studio
```

## Testing

- **Unit tests:** Vitest — test files live next to the code they test (e.g., `reservation-list.test.ts` alongside `reservation-list.tsx`)
- **E2E tests:** Playwright — located in `apps/web/e2e/` and `apps/tablet/e2e/`
- Always add tests for new tRPC procedures and business logic
- Mock external services (Stripe, Twilio, Resend) in tests

## Git Conventions

- Branch naming: `feature/module-name`, `fix/bug-description`, `chore/task-name`
- Commit messages: conventional commits — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Never commit directly to `main` — always use feature branches

## Key Patterns

### tRPC Procedure Structure

All tRPC procedures follow this pattern:
1. Validate input with Zod schema
2. Check user permissions via middleware
3. Scope query by `restaurantId`
4. Execute business logic (use Prisma transactions for multi-table writes)
5. Log the action for audit trail
6. Return typed response

### Database Queries

Every Prisma query must include a `where` clause with `restaurantId`:

```typescript
// Correct
const reservations = await prisma.reservation.findMany({
  where: { restaurantId: ctx.restaurantId, date: today },
});

// WRONG — never do this
const reservations = await prisma.reservation.findMany({
  where: { date: today },
});
```

### AI/ML Service

The Python service in `services/ai/` is a separate FastAPI app. It communicates with the main app via REST API. When modifying ML models or endpoints, update both the Python service and the TypeScript types in `packages/types/` to keep them in sync.
