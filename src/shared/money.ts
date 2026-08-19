import { Type } from '@sinclair/typebox'

export const currencySchema = Type.String({ minLength: 3, maxLength: 3 })

export const moneySchema = Type.Object({
  amount: Type.Integer({ minimum: 0 }),
  currency: currencySchema,
})

export type Money = {
  amount: number
  currency: string
}