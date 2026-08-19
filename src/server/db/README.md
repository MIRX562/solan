# Database Infrastructure

Owns the Drizzle client, transaction helpers, database connection lifecycle, and infrastructure schemas such as Better Auth.

Business table definitions should move into their owning modules as each vertical slice is implemented. Generated migrations remain under `/drizzle`.
