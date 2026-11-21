import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL manquante dans .env");
  }
  const sql = neon(process.env.DATABASE_URL);

  console.log("⏳ Application de la migration Onboarding, Thèmes, Chat & Communauté...");

  // 1. Colonnes sur la table clinics
  await sql`
    ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS slug text,
    ADD COLUMN IF NOT EXISTS logo_url text,
    ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#0f172a',
    ADD COLUMN IF NOT EXISTS is_community_member boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS quick_messages_doctor json,
    ADD COLUMN IF NOT EXISTS quick_messages_assistant json;
  `;

  // Création d'un index unique sur slug si absent
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS clinics_slug_unique ON clinics(slug) WHERE slug IS NOT NULL;
  `;

  // 2. Colonnes sur la table users
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url text,
    ADD COLUMN IF NOT EXISTS bio text,
    ADD COLUMN IF NOT EXISTS is_onboarded boolean DEFAULT false;
  `;

  // 3. Table des messages internes Médecin <-> Assistante (Interphone du cabinet)
  await sql`
    CREATE TABLE IF NOT EXISTS clinic_messages (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `;

  // Index de rapidité pour le chat interne
  await sql`
    CREATE INDEX IF NOT EXISTS idx_clinic_messages_clinic_id ON clinic_messages(clinic_id, created_at DESC);
  `;

  // 4. Table des publications de la communauté médicale (Feed / Blog confraternel)
  await sql`
    CREATE TABLE IF NOT EXISTS community_posts (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      author_doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      author_specialty TEXT NOT NULL,
      author_city TEXT NOT NULL,
      author_avatar_url TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      likes_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `;

  // Index pour le fil de la communauté
  await sql`
    CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
  `;

  // 5. Table des messages privés confraternels 1-à-1 entre médecins
  await sql`
    CREATE TABLE IF NOT EXISTS community_messages (
      id SERIAL PRIMARY KEY,
      sender_doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_community_messages_pair ON community_messages(sender_doctor_id, receiver_doctor_id, created_at DESC);
  `;

  console.log("✅ Migration Neon terminée avec succès !");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Erreur migration :", err);
  process.exit(1);
});
