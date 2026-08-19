import { createFileRoute } from '@tanstack/react-router'
import { getTreaty } from './api.$'

export const Route = createFileRoute('/')({
  loader: async () => {
    const response = await getTreaty().get()

    if (response.error) {
      throw new Error('Unable to reach the Elysia API')
    }

    return response.data
  },
  component: Home,
})

function Home() {
  const data = Route.useLoaderData()

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">TanStack Start + Elysia</h1>
      <p className="mt-4 text-lg">{data.message}</p>
    </div>
  )
}
