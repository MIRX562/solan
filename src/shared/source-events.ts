import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const accountingSourceEvent = sqliteTable('accounting_source_event', {
  id: text('id').primaryKey(),
  idempotencyKey: text('idempotency_key').notNull(),
  type: text('type').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
}, (table) => [uniqueIndex('accounting_source_event_key_unique').on(table.idempotencyKey)])

export const sourceEventSchema = { accountingSourceEvent }