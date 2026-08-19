import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { accountingSchema } from '../modules/accounting/schema'
import { productSchema } from '../modules/catalog/products/schema'
import { serviceSchema } from '../modules/catalog/services/schema'
import { documentSchema } from '../modules/documents/schema'
import { invoicingSchema } from '../modules/invoicing/schema'
import { projectSchema } from '../modules/projects/schema'
import { sourceEventSchema } from '../shared/source-events'
import { authSchema } from './schema'

const schema = {
	...authSchema,
	...projectSchema,
	...documentSchema,
	...serviceSchema,
	...productSchema,
	...sourceEventSchema,
	...invoicingSchema,
	...accountingSchema,
}

const sqlite = new Database(process.env.DB_FILE_NAME ?? './solan.sqlite')
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })

if (process.env.NODE_ENV === 'production') {
	console.log('Running Drizzle migrations...')
	migrate(db, { migrationsFolder: './drizzle' })
	console.log('Migrations complete.')
}