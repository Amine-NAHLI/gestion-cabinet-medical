import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL manquante dans .env");
  }
  const sql = neon(process.env.DATABASE_URL);

  console.log("⏳ Ajout des colonnes de personnalisation (cases + template ordonnance)...");

  await sql`
    ALTER TABLE clinic_settings
    ADD COLUMN IF NOT EXISTS consultation_fields json,
    ADD COLUMN IF NOT EXISTS prescription_template_url text,
    ADD COLUMN IF NOT EXISTS prescription_template_name text,
    ADD COLUMN IF NOT EXISTS prescription_template_layout json;
  `;

  await sql`
    ALTER TABLE visits
    ADD COLUMN IF NOT EXISTS custom_data json;
  `;

  console.log("✅ Migration Neon terminée avec succès !");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Erreur migration :", err);
  process.exit(1);
});
