import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

// Voici une table d'exemple pour les utilisateurs du cabinet (médecins, secrétaires)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('secretaire'), // 'medecin' ou 'secretaire'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
