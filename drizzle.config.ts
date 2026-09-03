import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Charge les variables d'environnement depuis le fichier .env
dotenv.config({ path: '.env' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
