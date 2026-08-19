import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}

export const product = sqliteTable('product', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  priceAmount: integer('price_amount').notNull(),
  priceCurrency: text('price_currency').notNull(),
  stockQuantity: integer('stock_quantity'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex('product_sku_unique').on(table.sku)])

export const productSchema = { product }