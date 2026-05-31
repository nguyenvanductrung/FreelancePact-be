import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 config — provides DATABASE_URL for migrate CLI.
 * The URL is read directly from process.env (loaded via .env by prisma CLI).
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
});
