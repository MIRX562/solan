import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}

export const invoice = sqliteTable('invoice', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull(),
  clientId: text('client_id').notNull(),
  projectId: text('project_id'),
  status: text('status').notNull().default('draft'),
  currency: text('currency').notNull(),
  subtotalAmount: integer('subtotal_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  amountPaid: integer('amount_paid').notNull().default(0),
  issuedAt: integer('issued_at', { mode: 'timestamp' }),
  dueAt: integer('due_at', { mode: 'timestamp' }),
  notes: text('notes'),
  ...timestamps,
}, (table) => [uniqueIndex('invoice_number_unique').on(table.invoiceNumber)])

export const invoiceLine = sqliteTable('invoice_line', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoice.id, { onDelete: 'cascade' }),
  sourceType: text('source_type').notNull().default('manual'),
  sourceId: text('source_id'),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPriceAmount: integer('unit_price_amount').notNull(),
  lineTotalAmount: integer('line_total_amount').notNull(),
  currency: text('currency').notNull(),
})

export const invoiceEvent = sqliteTable('invoice_event', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoice.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
})

export const payment = sqliteTable('payment', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoice.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull(),
  paidAt: integer('paid_at', { mode: 'timestamp' }).notNull(),
  method: text('method').notNull(),
  reference: text('reference'),
  ...timestamps,
})

export const paymentOption = sqliteTable('payment_option', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  method: text('method').notNull(),
  instructions: text('instructions').notNull(),
  details: text('details'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  position: integer('position').notNull().default(0),
  ...timestamps,
})

export const invoicePaymentOption = sqliteTable('invoice_payment_option', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoice.id, { onDelete: 'cascade' }),
  paymentOptionId: text('payment_option_id').references(() => paymentOption.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  method: text('method').notNull(),
  instructions: text('instructions').notNull(),
  details: text('details'),
  position: integer('position').notNull(),
})

export const invoicingSchema = {
  invoice,
  invoiceLine,
  invoiceEvent,
  payment,
  paymentOption,
  invoicePaymentOption,
}