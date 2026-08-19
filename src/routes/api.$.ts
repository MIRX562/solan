import { treaty } from '@elysia/eden'
import { createFileRoute } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { Elysia, t } from 'elysia'
import { auth } from '../lib/auth'

export const app = new Elysia({ prefix: '/api' }).get(
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