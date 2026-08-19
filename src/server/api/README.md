# API Composition

Owns Elysia composition, module route registration, request context, authentication middleware, and error-to-HTTP mapping.

Handlers translate validated HTTP input into module application commands and queries. They do not contain Drizzle queries or business rules.
