import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { username } from 'better-auth/plugins'
import { db } from '../db'
import { schema } from '../db/schema'
import { env } from '../env'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL ?? env.SERVER_URL ?? 'http://localhost:3000',
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      immutableUsername: true,
    }),
  ],
})