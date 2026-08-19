import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { accountingSourceEvent } from '../../shared/source-events'

export const chartOfAccount = sqliteTable('chart_of_account', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
}, (table) => [uniqueIndex('account_code_unique').on(table.code)])

export const journalEntry = sqliteTable('journal_entry', {
  id: text('id').primaryKey(),
  sourceEventId: text('source_event_id').references(() => accountingSourceEvent.id, {
    onDelete: 'restrict',
  }),
  description: text('description').notNull(),
  projectId: text('project_id'),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
}, (table) => [uniqueIndex('journal_source_event_unique').on(table.sourceEventId)])

export const journalLine = sqliteTable('journal_line', {
  id: text('id').primaryKey(),
  journalEntryId: text('journal_entry_id')
    .notNull()
    .references(() => journalEntry.id, { onDelete: 'cascade' }),
  accountId: text('account_id')
    .notNull()
    .references(() => chartOfAccount.id, { onDelete: 'restrict' }),
  debit: integer('debit').notNull().default(0),
  credit: integer('credit').notNull().default(0),
  currency: text('currency').notNull(),
})

export const accountingSchema = { chartOfAccount, journalEntry, journalLine }