import { db } from './src/db';
import { patients, visits, prescriptions, appointments } from './src/db/schema';

async function main() {
  console.log("Suppression des données en cours...");
  
  // L'ordre est important à cause des clés étrangères (Foreign Keys)
  await db.delete(prescriptions);
  console.log("- Ordonnances supprimées");
  
  await db.delete(appointments);
  console.log("- Rendez-vous supprimés");
  
  await db.delete(visits);
  console.log("- Consultations supprimées");
  
  await db.delete(patients);
  console.log("- Patients supprimés");

  console.log("✅ Base de données réinitialisée avec succès ! (Les comptes médecin/assistante sont conservés)");
  process.exit(0);
}

main().catch(err => {
  console.error("Erreur lors de la suppression:", err);
  process.exit(1);
});
