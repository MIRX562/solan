import { Type } from '@sinclair/typebox'
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox'
import { user } from './schema'

const userInsertSchema = createInsertSchema(user)

export const createUserSchema = Type.Omit(userInsertSchema, [
  'id',
  'createdAt',
  'updatedAt',
])

export const userSchema = createSelectSchema(user)