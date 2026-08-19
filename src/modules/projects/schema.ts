import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}

export const client = sqliteTable(
  'client',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email'),
    notes: text('notes'),
    ...timestamps,
  },
  (table) => [uniqueIndex('client_email_unique').on(table.email)],
)

export const project = sqliteTable('project', {
  id: text('id').primaryKey(),
  clientId: text('client_id')
    .notNull()
    .references(() => client.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  description: text('description'),
  stage: text('stage').notNull().default('requirements'),
  trackedValueAmount: integer('tracked_value_amount').notNull().default(0),
  trackedValueCurrency: text('tracked_value_currency').notNull().default('USD'),
  executionStartedBeforeProposal: integer('execution_started_before_proposal', {
    mode: 'boolean',
  })
    .notNull()
    .default(false),
  ...timestamps,
})

export const projectEvent = sqliteTable('project_event', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
})

export const requirement = sqliteTable('requirement', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  priority: text('priority').notNull().default('medium'),
  status: text('status').notNull().default('open'),
  notes: text('notes'),
  ...timestamps,
})

export const proposal = sqliteTable('proposal', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  scopeSummary: text('scope_summary').notNull(),
  priceAmount: integer('price_amount').notNull(),
  priceCurrency: text('price_currency').notNull(),
  status: text('status').notNull().default('draft'),
  ...timestamps,
}, (table) => [uniqueIndex('proposal_project_version_unique').on(table.projectId, table.version)])

export const deliverable = sqliteTable('deliverable', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  sourceType: text('source_type').notNull().default('manual'),
  sourceId: text('source_id'),
  priceAmount: integer('price_amount').notNull().default(0),
  priceCurrency: text('price_currency').notNull().default('USD'),
  status: text('status').notNull().default('planned'),
  ...timestamps,
})

export const changeRequest = sqliteTable('change_request', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  proposalId: text('proposal_id').references(() => proposal.id, {
    onDelete: 'cascade',
  }),
  deliverableId: text('deliverable_id').references(() => deliverable.id, {
    onDelete: 'cascade',
  }),
  version: integer('version').notNull(),
  changeNotes: text('change_notes').notNull(),
  status: text('status').notNull().default('open'),
  ...timestamps,
})

export const kanbanColumn = sqliteTable('kanban_column', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  ...timestamps,
}, (table) => [uniqueIndex('kanban_column_project_position_unique').on(table.projectId, table.position)])

export const kanbanCard = sqliteTable('kanban_card', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  columnId: text('column_id')
    .notNull()
    .references(() => kanbanColumn.id, { onDelete: 'cascade' }),
  deliverableId: text('deliverable_id').references(() => deliverable.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  description: text('description'),
  position: integer('position').notNull(),
  ...timestamps,
})

export const handoff = sqliteTable('handoff', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  deliveryNotes: text('delivery_notes'),
  clientSignoff: text('client_signoff'),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }).notNull(),
  ...timestamps,
})

export const handoffItem = sqliteTable('handoff_item', {
  id: text('id').primaryKey(),
  handoffId: text('handoff_id')
    .notNull()
    .references(() => handoff.id, { onDelete: 'cascade' }),
  deliverableId: text('deliverable_id').references(() => deliverable.id, {
    onDelete: 'restrict',
  }),
  documentId: text('document_id'),
  label: text('label'),
})

export const projectSchema = {
  client,
  project,
  projectEvent,
  requirement,
  proposal,
  deliverable,
  changeRequest,
  kanbanColumn,
  kanbanCard,
  handoff,
  handoffItem,
}