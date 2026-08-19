import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}

export const document = sqliteTable('document', {
  id: text('id').primaryKey(),
  ownerType: text('owner_type').notNull(),
  ownerId: text('owner_id').notNull(),
  title: text('title').notNull(),
  kind: text('kind').notNull(),
  ...timestamps,
})

export const documentVersion = sqliteTable('document_version', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => document.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  contentType: text('content_type').notNull(),
  storageKey: text('storage_key'),
  textContent: text('text_content'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [uniqueIndex('document_version_unique').on(table.documentId, table.version)])

export const documentSchema = { document, documentVersion }