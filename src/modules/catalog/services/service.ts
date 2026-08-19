import { desc, eq } from 'drizzle-orm'
import { db } from '../../../db'
import { DomainError } from '../../../shared/errors'
import { newId } from '../../../shared/ids'
import { service } from './schema'

export type OfferingSnapshot = {
  name: string
  description?: string
  priceAmount: number
  priceCurrency: string
}

export async function createService(input: {
  name: string
  description?: string
  category?: string
  pricingModel?: 'fixed' | 'per-unit' | 'tiered'
  defaultPriceAmount: number
  defaultPriceCurrency: string
}) {
  const now = new Date()
  const record = {
    id: newId(),
    ...input,
    pricingModel: input.pricingModel ?? 'fixed',
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(service).values(record)
  return record
}

export async function listServices() {
  return db.select().from(service).orderBy(desc(service.updatedAt)).all()
}

export async function getServiceSnapshot(id: string): Promise<OfferingSnapshot> {
  const record = await db.select().from(service).where(eq(service.id, id)).get()
  if (!record || !record.active) {
    throw new DomainError('Active service not found', 'SERVICE_NOT_FOUND')
  }
  return {
    name: record.name,
    description: record.description ?? undefined,
    priceAmount: record.defaultPriceAmount,
    priceCurrency: record.defaultPriceCurrency,
  }
}