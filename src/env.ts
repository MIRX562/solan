import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

const envSchema = Type.Object({
  DB_FILE_NAME: Type.Optional(Type.String({ minLength: 1 })),
  SERVER_URL: Type.Optional(Type.String({ format: 'uri' })),
  BETTER_AUTH_URL: Type.Optional(Type.String({ format: 'uri' })),
  VITE_APP_TITLE: Type.Optional(Type.String({ minLength: 1 })),
})

const runtimeEnv = {
  DB_FILE_NAME: import.meta.env.DB_FILE_NAME,
  SERVER_URL: import.meta.env.SERVER_URL,
  BETTER_AUTH_URL: import.meta.env.BETTER_AUTH_URL,
  VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
}

if (!Value.Check(envSchema, runtimeEnv)) {
  throw new Error('Invalid environment configuration')
}

export const env = runtimeEnv
