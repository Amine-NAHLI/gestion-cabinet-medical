import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL manquante dans .env");
  }
  const sql = neon(process.env.DATABASE_URL);

  console.log("⏳ Ajout de la colonne notification_preferences dans users...");

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS notification_preferences json;
  `;

  console.log("✅ Migration notifications Neon terminée avec succès !");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Erreur migration :", err);
  process.exit(1);
});
