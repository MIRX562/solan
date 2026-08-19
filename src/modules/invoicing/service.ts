import { asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../db'
import { DomainError } from '../../shared/errors'
import { newId } from '../../shared/ids'
import { accountingSourceEvent } from '../../shared/source-events'
import { postInvoiceIssued, postPaymentReceived } from '../accounting/service'
import { getProductSnapshot } from '../catalog/products/service'
import { getServiceSnapshot, type OfferingSnapshot } from '../catalog/services/service'
import { getDeliverableSnapshot } from '../projects/service'
import {
  invoice,
  invoiceEvent,
  invoiceLine,
  invoicePaymentOption,
  payment,
  paymentOption,
} from './schema'

type LineInput = {
  sourceType?: 'manual' | 'service' | 'product' | 'deliverable'
  sourceId?: string
  description?: string
  quantity: number
  unitPriceAmount?: number
  currency?: string
}

async function resolveLine(input: LineInput) {
  const sourceType = input.sourceType ?? 'manual'
  const sourceId = input.sourceId
  if (sourceType !== 'manual' && !sourceId) {
    throw new DomainError('A sourced invoice line requires a source ID', 'MISSING_INVOICE_SOURCE')
  }
  let snapshot: OfferingSnapshot | undefined
  if (sourceType === 'service' && sourceId) {
    snapshot = await getServiceSnapshot(sourceId)
  } else if (sourceType === 'product' && sourceId) {
    snapshot = await getProductSnapshot(sourceId)
  } else if (sourceType === 'deliverable' && sourceId) {
    snapshot = await getDeliverableSnapshot(sourceId)
  }
  const description = input.description ?? snapshot?.name
  const unitPriceAmount = input.unitPriceAmount ?? snapshot?.priceAmount
  const currency = input.currency ?? snapshot?.priceCurrency
  if (!description || unitPriceAmount === undefined || !currency) {
    throw new DomainError('Invoice line details are incomplete', 'INCOMPLETE_INVOICE_LINE')
  }
  return { sourceType, sourceId, description, unitPriceAmount, currency }
}

export async function createInvoice(input: {
  clientId: string
  projectId?: string
  invoiceNumber: string
  currency: string
  dueAt?: Date
  notes?: string
  paymentOptionIds?: string[]
  lines: LineInput[]
}) {
  if (input.lines.length === 0) throw new DomainError('An invoice requires at least one line', 'EMPTY_INVOICE')
  const lines = await Promise.all(input.lines.map(resolveLine))
  const now = new Date()
  const invoiceId = newId()
  const totalAmount = lines.reduce((total, line, index) => total + line.unitPriceAmount * input.lines[index].quantity, 0)
  const selectedPaymentOptions = input.paymentOptionIds?.length
    ? await db.select().from(paymentOption).where(inArray(paymentOption.id, input.paymentOptionIds)).all()
    : []
  if (selectedPaymentOptions.length !== (input.paymentOptionIds?.length ?? 0)) {
    throw new DomainError('One or more payment options were not found', 'PAYMENT_OPTION_NOT_FOUND')
  }
  if (selectedPaymentOptions.some((option) => !option.active)) {
    throw new DomainError('Inactive payment options cannot be added to an invoice', 'INACTIVE_PAYMENT_OPTION')
  }

  return db.transaction((transaction) => {
    const invoiceRecord = {
      id: invoiceId,
      invoiceNumber: input.invoiceNumber,
      clientId: input.clientId,
      projectId: input.projectId,
      status: 'draft',
      currency: input.currency,
      subtotalAmount: totalAmount,
      totalAmount,
      amountPaid: 0,
      dueAt: input.dueAt,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    }
    transaction.insert(invoice).values(invoiceRecord).run()
    lines.forEach((line, index) => {
      transaction.insert(invoiceLine).values({
        id: newId(),
        invoiceId,
        sourceType: line.sourceType,
        sourceId: line.sourceId,
        description: line.description,
        quantity: input.lines[index].quantity,
        unitPriceAmount: line.unitPriceAmount,
        lineTotalAmount: line.unitPriceAmount * input.lines[index].quantity,
        currency: line.currency,
      }).run()
    })
    selectedPaymentOptions
      .sort((left, right) => left.position - right.position)
      .forEach((option, index) => {
        transaction.insert(invoicePaymentOption).values({
          id: newId(),
          invoiceId,
          paymentOptionId: option.id,
          name: option.name,
          method: option.method,
          instructions: option.instructions,
          details: option.details,
          position: index,
        }).run()
      })
    return invoiceRecord
  })
}

export async function listInvoices() {
  return db.select().from(invoice).orderBy(desc(invoice.updatedAt)).all()
}

export async function createPaymentOption(input: {
  name: string
  method: string
  instructions: string
  details?: string
  position?: number
}) {
  const now = new Date()
  const record = {
    id: newId(),
    name: input.name,
    method: input.method,
    instructions: input.instructions,
    details: input.details,
    active: true,
    position: input.position ?? 0,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(paymentOption).values(record)
  return record
}

export async function listPaymentOptions() {
  return db.select().from(paymentOption).orderBy(asc(paymentOption.position), asc(paymentOption.name)).all()
}

export async function listInvoicePaymentOptions(invoiceId: string) {
  const record = await db.select().from(invoice).where(eq(invoice.id, invoiceId)).get()
  if (!record) throw new DomainError('Invoice not found', 'INVOICE_NOT_FOUND')
  return db
    .select()
    .from(invoicePaymentOption)
    .where(eq(invoicePaymentOption.invoiceId, invoiceId))
    .orderBy(asc(invoicePaymentOption.position))
    .all()
}

export async function issueInvoice(invoiceId: string) {
  const now = new Date()
  return db.transaction((transaction) => {
    const record = transaction.select().from(invoice).where(eq(invoice.id, invoiceId)).get()
    if (!record) throw new DomainError('Invoice not found', 'INVOICE_NOT_FOUND')
    if (record.status !== 'draft') return record
    transaction.update(invoice).set({ status: 'sent', issuedAt: now, updatedAt: now }).where(eq(invoice.id, invoiceId)).run()
    transaction.insert(invoiceEvent).values({ id: newId(), invoiceId, type: 'invoice.issued', occurredAt: now }).run()
    const sourceEvent = {
      id: newId(),
      idempotencyKey: `invoice-issued:${invoiceId}`,
      type: 'invoice.issued',
      aggregateType: 'invoice',
      aggregateId: invoiceId,
      payload: { invoiceId, amount: record.totalAmount, currency: record.currency },
      occurredAt: now,
    }
    transaction.insert(accountingSourceEvent).values(sourceEvent).run()
    postInvoiceIssued(transaction, sourceEvent)
    return { ...record, status: 'sent' as const, issuedAt: now, updatedAt: now }
  })
}

export async function recordPayment(input: {
  invoiceId: string
  amount: number
  currency: string
  method: string
  reference?: string
}) {
  const now = new Date()
  return db.transaction((transaction) => {
    const record = transaction.select().from(invoice).where(eq(invoice.id, input.invoiceId)).get()
    if (!record) throw new DomainError('Invoice not found', 'INVOICE_NOT_FOUND')
    if (input.currency !== record.currency) throw new DomainError('Payment currency must match invoice', 'PAYMENT_CURRENCY_MISMATCH')
    if (input.amount <= 0 || record.amountPaid + input.amount > record.totalAmount) {
      throw new DomainError('Payment exceeds invoice balance', 'INVALID_PAYMENT_AMOUNT')
    }
    const paymentRecord = {
      id: newId(), invoiceId: input.invoiceId, amount: input.amount, currency: input.currency,
      paidAt: now, method: input.method, reference: input.reference, createdAt: now, updatedAt: now,
    }
    transaction.insert(payment).values(paymentRecord).run()
    const amountPaid = record.amountPaid + input.amount
    const status = amountPaid === record.totalAmount ? 'paid' : 'partially_paid'
    transaction.update(invoice).set({ amountPaid, status, updatedAt: now }).where(eq(invoice.id, input.invoiceId)).run()
    transaction.insert(invoiceEvent).values({ id: newId(), invoiceId: input.invoiceId, type: 'payment.received', payload: { amount: input.amount }, occurredAt: now }).run()
    const sourceEvent = {
      id: newId(), idempotencyKey: `payment-received:${paymentRecord.id}`, type: 'payment.received',
      aggregateType: 'invoice', aggregateId: input.invoiceId,
      payload: { paymentId: paymentRecord.id, invoiceId: input.invoiceId, amount: input.amount, currency: input.currency }, occurredAt: now,
    }
    transaction.insert(accountingSourceEvent).values(sourceEvent).run()
    postPaymentReceived(transaction, sourceEvent)
    return { payment: paymentRecord, invoice: { ...record, amountPaid, status } }
  })
}