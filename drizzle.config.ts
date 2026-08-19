import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: [
    './src/db/schema.ts',
    './src/modules/**/schema.ts',
    './src/shared/**/*.ts',
  ],
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_FILE_NAME ?? './solan.sqlite',
  },
});
