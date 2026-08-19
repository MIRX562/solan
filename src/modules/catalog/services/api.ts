import { Elysia, t } from 'elysia'
import { createService, listServices } from './service'

export const servicesApi = new Elysia({ name: 'services-api' })
  .get('/catalog/services', () => listServices())
  .post('/catalog/services', ({ body }) => createService(body), {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      category: t.Optional(t.String()),
      pricingModel: t.Optional(t.Union([
        t.Literal('fixed'),
        t.Literal('per-unit'),
        t.Literal('tiered'),
      ])),
      defaultPriceAmount: t.Integer({ minimum: 0 }),
      defaultPriceCurrency: t.String({ minLength: 3, maxLength: 3 }),
    }),
  })