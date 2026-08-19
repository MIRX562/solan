import { Elysia, t } from 'elysia'
import { createProduct, listProducts } from './service'

export const productsApi = new Elysia({ name: 'products-api' })
  .get('/catalog/products', () => listProducts())
  .post('/catalog/products', ({ body }) => createProduct(body), {
    body: t.Object({
      sku: t.String({ minLength: 1 }),
      name: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      priceAmount: t.Integer({ minimum: 0 }),
      priceCurrency: t.String({ minLength: 3, maxLength: 3 }),
      stockQuantity: t.Optional(t.Integer({ minimum: 0 })),
    }),
  })