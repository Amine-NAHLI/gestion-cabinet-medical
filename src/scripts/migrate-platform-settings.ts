import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL manquante dans l'environnement");
  }

  const sql = neon(process.env.DATABASE_URL);
  console.log("⏳ Exécution de la migration platform_settings et colonnes d'abonnement...");

  // 1. Ajouter la colonne pending_plan_change sur clinics
  await sql`
    ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS pending_plan_change json;
  `;

  // 2. Créer la table platform_settings
  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      id SERIAL PRIMARY KEY,
      support_whatsapp TEXT NOT NULL DEFAULT '+212600000000',
      support_whatsapp_message TEXT NOT NULL DEFAULT 'Bonjour, je vous contacte concernant l''abonnement de mon cabinet MonCabinet.',
      support_email TEXT NOT NULL DEFAULT 'contact@toncabinet.me',
      support_phone TEXT DEFAULT '+212600000000',
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  // 3. Insérer la ligne unique par défaut si non existante
  await sql`
    INSERT INTO platform_settings (id, support_whatsapp, support_whatsapp_message, support_email, support_phone)
    SELECT 1, '+212600000000', 'Bonjour, je vous contacte concernant l''abonnement de mon cabinet MonCabinet.', 'contact@toncabinet.me', '+212600000000'
    WHERE NOT EXISTS (SELECT 1 FROM platform_settings WHERE id = 1);
  `;

  console.log("✅ Migration platform_settings terminée avec succès !");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("❌ Erreur lors de la migration :", err);
  process.exit(1);
});
