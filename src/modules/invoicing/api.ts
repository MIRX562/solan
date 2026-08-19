import { Elysia, t } from 'elysia'
import {
  createInvoice,
  createPaymentOption,
  issueInvoice,
  listInvoicePaymentOptions,
  listInvoices,
  listPaymentOptions,
  recordPayment,
} from './service'

const invoiceParams = t.Object({ invoiceId: t.String({ minLength: 1 }) })

export const invoicingApi = new Elysia({ name: 'invoicing-api' })
  .get('/payment-options', () => listPaymentOptions())
  .post('/payment-options', ({ body }) => createPaymentOption(body), {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      method: t.String({ minLength: 1 }),
      instructions: t.String({ minLength: 1 }),
      details: t.Optional(t.String()),
      position: t.Optional(t.Integer({ minimum: 0 })),
    }),
  })
  .get('/invoices', () => listInvoices())
  .post('/invoices', ({ body }) => createInvoice(body), {
    body: t.Object({
      clientId: t.String({ minLength: 1 }),
      projectId: t.Optional(t.String({ minLength: 1 })),
      invoiceNumber: t.String({ minLength: 1 }),
      currency: t.String({ minLength: 3, maxLength: 3 }),
      dueAt: t.Optional(t.Date()),
      notes: t.Optional(t.String()),
      paymentOptionIds: t.Optional(t.Array(t.String({ minLength: 1 }))),
      lines: t.Array(t.Object({
        sourceType: t.Optional(t.Union([t.Literal('manual'), t.Literal('service'), t.Literal('product'), t.Literal('deliverable')])),
        sourceId: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String({ minLength: 1 })),
        quantity: t.Integer({ minimum: 1 }),
        unitPriceAmount: t.Optional(t.Integer({ minimum: 0 })),
        currency: t.Optional(t.String({ minLength: 3, maxLength: 3 })),
      }), { minItems: 1 }),
    }),
  })
  .get('/invoices/:invoiceId/payment-options', ({ params }) => listInvoicePaymentOptions(params.invoiceId), {
    params: invoiceParams,
  })
  .post('/invoices/:invoiceId/issue', ({ params }) => issueInvoice(params.invoiceId), { params: invoiceParams })
  .post('/invoices/:invoiceId/payments', ({ body, params }) => recordPayment({ ...body, invoiceId: params.invoiceId }), {
    params: invoiceParams,
    body: t.Object({
      amount: t.Integer({ minimum: 1 }),
      currency: t.String({ minLength: 3, maxLength: 3 }),
      method: t.String({ minLength: 1 }),
      reference: t.Optional(t.String()),
    }),
  })