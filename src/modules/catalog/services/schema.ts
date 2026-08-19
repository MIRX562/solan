import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}

export const service = sqliteTable('service', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  pricingModel: text('pricing_model').notNull().default('fixed'),
  defaultPriceAmount: integer('default_price_amount').notNull(),
  defaultPriceCurrency: text('default_price_currency').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex('service_name_unique').on(table.name)])

export const serviceSchema = { service }