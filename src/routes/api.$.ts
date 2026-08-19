import { treaty } from '@elysia/eden'
import { openapi } from '@elysiajs/openapi'
import { createFileRoute } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { Elysia, t } from 'elysia'
import { auth } from '../lib/auth'
import { accountingApi } from '../modules/accounting/api'
import { productsApi } from '../modules/catalog/products/api'
import { servicesApi } from '../modules/catalog/services/api'
import { documentsApi } from '../modules/documents/api'
import { invoicingApi } from '../modules/invoicing/api'
import { projectsApi } from '../modules/projects/api'

export const app = new Elysia({ prefix: '/api' })
  .use(openapi({
    path: '/openapi',
    specPath: '/openapi/json',
    provider: 'swagger-ui',
    documentation: {
      info: {
        title: 'Solan ERP API',
        version: '0.1.0',
        description: 'API for projects, catalogs, invoices, payments, and accounting.',
      },
      tags: [
        { name: 'Projects', description: 'Project lifecycle and execution workflows.' },
        { name: 'Catalog', description: 'Services, products, and invoice payment options.' },
        { name: 'Invoicing', description: 'Invoices, payment options, and payments.' },
        { name: 'Accounting', description: 'Chart of accounts and journal entries.' },
      ],
    },
  }))
  .use(projectsApi).use(documentsApi).use(servicesApi).use(productsApi).use(invoicingApi).use(accountingApi).get(
  '/',
  () => ({
    message: 'Hello from Elysia',
  }),
).post(
  '/echo',
  ({ body }) => body,
  {
    body: t.Object({
      message: t.String({ minLength: 1 }),
    }),
  },
).mount(auth.handler)

const handle = ({ request }: { request: Request }) => app.fetch(request)

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
})

export const getTreaty = createIsomorphicFn()
  .server(() => treaty(app).api)
  .client(() => treaty<typeof app>(window.location.origin).api)