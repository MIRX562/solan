import { Elysia, t } from 'elysia'
import { getJournalLines, listAccounts, listJournalEntries } from './service'

export const accountingApi = new Elysia({ name: 'accounting-api' })
  .get('/accounting/accounts', () => listAccounts())
  .get('/accounting/journal-entries', () => listJournalEntries())
  .get('/accounting/journal-entries/:journalEntryId/lines', ({ params }) => getJournalLines(params.journalEntryId), {
    params: t.Object({ journalEntryId: t.String({ minLength: 1 }) }),
  })