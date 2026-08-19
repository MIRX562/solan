# Solan ERP

## Architecture

This is a feature-first modular monolith.

- `src/routes/` contains TanStack page routes and the API catch-all only. Keep business rules out of route files.
- `src/modules/` contains business domains. A module owns its schemas, repositories, application commands, queries, API registration, UI, and tests.
- `src/server/` contains backend composition and infrastructure: Elysia, auth, database, request context, and error mapping.
- `src/shared/` contains cross-domain primitives and contracts. It must not import a business module.
- `src/components/` contains reusable presentation components. Module-specific UI stays with its module.
- `drizzle/` contains generated migrations only.

Modules communicate through application services and source-event contracts, not by importing another module's repository or querying another module's tables directly.

## Domain Ownership

- `projects`: clients, projects, requirements, proposals, revisions, deliverables, Kanban, handoffs, documents, and project history.
- `catalog/services`: service offerings, pricing, categories, and usage history.
- `catalog/products`: products, SKUs, pricing, stock options, and usage history.
- `invoicing`: invoices, immutable line snapshots, payments, status transitions, and invoice rendering requests.
- `accounting`: chart of accounts, journal entries, journal lines, expenses, source events, and reports.
- `documents`: document metadata, versions, attachments, storage, and rendering adapters.

Auth tables remain infrastructure-owned. ERP tables belong to the module that owns their business rules.

## Invariants

- Store money as integer minor units with an explicit currency. Never use floating-point money.
- Use transactions for commands that change multiple aggregates or create accounting records.
- Journal entries must balance: total debits must equal total credits.
- Accounting source events need a unique idempotency key. Retrying an event must not duplicate a posting.
- Proposals, revisions, documents, and stage history are append/version records. Preserve history instead of overwriting it.
- Invoice lines and deliverables snapshot catalog names, descriptions, prices, and currency when created.
- Foreign keys and unique constraints must prevent orphaned records and duplicate active states.
- Execution may begin before proposal acceptance for this personal workflow, but that fact must be recorded in project history. The system must never imply that pre-acceptance work was covered by an accepted proposal.
- Accepting a proposal updates project tracked value and records the previous value and source proposal in the same transaction.
- Invoice issuance and payment receipt create accounting source events; accounting must not require manual re-entry of those events.
- No time tracking is part of the domain.

## Backend Rules

- Validate external input with TypeBox. Derive database-shaped schemas with `drizzle-typebox` where useful.
- Elysia handlers should translate HTTP input into application commands. They should not contain Drizzle queries or domain decisions.
- Keep API route registration grouped by module under `src/server/api/`.
- Use typed errors and a single error-to-HTTP mapping at the API boundary.
- Keep auth/session checks in server infrastructure and application authorization policies, not in React components.
- Use Eden for frontend calls to Elysia endpoints.

## Frontend Rules

- TanStack route files compose loaders, query keys, page layouts, and module UI.
- Put reusable UI in `src/components/`; put domain-specific UI next to its module.
- Query and mutation hooks belong to the owning module or its API client boundary.
- UI must represent lifecycle states explicitly: draft, sent, accepted, rejected, paid, overdue, void, and partial payment.

## Database Rules

- Update the owning module schema and generate a migration; do not hand-edit generated SQL.
- Run `bun run db:generate` after schema changes and `bun run db:migrate` for local verification.
- Keep migrations reviewable and never delete historical data as part of a normal status transition.
- Use SQLite-compatible schema types and indexes unless a documented database migration changes the target.

## Implementation Order

1. Shared primitives and the Projects vertical slice.
2. Services and Products catalog.
3. Invoicing, payments, and shared invoice rendering.
4. Accounting postings and reports.
5. Cross-module history, audit views, and hardening.

## Validation

Before considering a change complete, run the narrowest relevant test first, then:

- `bunx tsc --noEmit`
- `bun run check`
- `bun run build`

For database changes also run migration generation and apply the migration against a temporary or local SQLite database. For accounting changes test balanced journals and idempotent retries. For invoice rendering test both selectable PDF text and JPG output dimensions/content.

## Scope

Initial scope excludes time tracking, payroll, warehouse management, multi-tenant billing, and external accounting synchronization. The auth model is single-user friendly but must remain protected and extensible to roles later.
