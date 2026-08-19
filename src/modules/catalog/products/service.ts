import { desc, eq } from 'drizzle-orm'
import { db } from '../../../db'
import { DomainError } from '../../../shared/errors'
import { newId } from '../../../shared/ids'
import type { OfferingSnapshot } from '../services/service'
import { product } from './schema'

export async function createProduct(input: {
  sku: string
  name: string
  description?: string
  priceAmount: number
  priceCurrency: string
  stockQuantity?: number
}) {
  const now = new Date()
  const record = {
    id: newId(),
    ...input,
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(product).values(record)
  return record
}

export async function listProducts() {
  return db.select().from(product).orderBy(desc(product.updatedAt)).all()
}

export async function getProductSnapshot(id: string): Promise<OfferingSnapshot> {
  const record = await db.select().from(product).where(eq(product.id, id)).get()
  if (!record || !record.active) {
    throw new DomainError('Active product not found', 'PRODUCT_NOT_FOUND')
  }
  return {
    name: record.name,
    description: record.description ?? undefined,
    priceAmount: record.priceAmount,
    priceCurrency: record.priceCurrency,
  }
}