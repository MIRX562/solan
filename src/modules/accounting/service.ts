import { desc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { DomainError } from '../../shared/errors'
import { newId } from '../../shared/ids'
import type { accountingSourceEvent } from '../../shared/source-events'
import { chartOfAccount, journalEntry, journalLine } from './schema'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type SourceEvent = typeof accountingSourceEvent.$inferSelect

const defaultAccounts = [
  { code: '1000', name: 'Cash', type: 'asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset' },
  { code: '4000', name: 'Service Revenue', type: 'revenue' },
]

function ensureAccount(transaction: Transaction, code: string) {
  const definition = defaultAccounts.find((item) => item.code === code)
  if (!definition) throw new DomainError(`Unknown account ${code}`, 'ACCOUNT_NOT_CONFIGURED')
  const existing = transaction.select().from(chartOfAccount).where(eq(chartOfAccount.code, code)).get()
  if (existing) return existing
  const record = { id: newId(), ...definition, active: true }
  transaction.insert(chartOfAccount).values(record).run()
  return record
}

function postBalancedEntry(transaction: Transaction, input: {
  sourceEvent: SourceEvent
  description: string
  debitAccount: string
  creditAccount: string
  amount: number
  currency: string
}) {
  if (input.amount <= 0) throw new DomainError('Journal amount must be positive', 'INVALID_JOURNAL_AMOUNT')
  const existing = transaction.select().from(journalEntry).where(eq(journalEntry.sourceEventId, input.sourceEvent.id)).get()
  if (existing) return existing
  const debitAccount = ensureAccount(transaction, input.debitAccount)
  const creditAccount = ensureAccount(transaction, input.creditAccount)
  const entry = {
    id: newId(),
    sourceEventId: input.sourceEvent.id,
    description: input.description,
    occurredAt: input.sourceEvent.occurredAt,
  }
  transaction.insert(journalEntry).values(entry).run()
  transaction.insert(journalLine).values([
    { id: newId(), journalEntryId: entry.id, accountId: debitAccount.id, debit: input.amount, credit: 0, currency: input.currency },
    { id: newId(), journalEntryId: entry.id, accountId: creditAccount.id, debit: 0, credit: input.amount, currency: input.currency },
  ]).run()
  return entry
}

export function postInvoiceIssued(transaction: Transaction, sourceEvent: SourceEvent) {
  const payload = sourceEvent.payload
  return postBalancedEntry(transaction, {
    sourceEvent,
    description: `Invoice issued: ${payload.invoiceId}`,
    debitAccount: '1100',
    creditAccount: '4000',
    amount: Number(payload.amount),
    currency: String(payload.currency),
  })
}

export function postPaymentReceived(transaction: Transaction, sourceEvent: SourceEvent) {
  const payload = sourceEvent.payload
  return postBalancedEntry(transaction, {
    sourceEvent,
    description: `Payment received: ${payload.paymentId}`,
    debitAccount: '1000',
    creditAccount: '1100',
    amount: Number(payload.amount),
    currency: String(payload.currency),
  })
}

export async function listAccounts() {
  return db.select().from(chartOfAccount).orderBy(chartOfAccount.code).all()
}

export async function listJournalEntries() {
  return db.select().from(journalEntry).orderBy(desc(journalEntry.occurredAt)).all()
}

export async function getJournalLines(journalEntryId: string) {
  return db.select().from(journalLine).where(eq(journalLine.journalEntryId, journalEntryId)).all()
}