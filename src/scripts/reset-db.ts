import "dotenv/config";
import { db } from "../db";
import { 
  prescriptions, 
  visits, 
  appointments, 
  patients, 
  customMedications, 
  clinicSettings, 
  onboardingRequests, 
  users, 
  clinics 
} from "../db/schema";
import bcrypt from "bcryptjs";

async function resetDatabase() {
  console.log("\n=======================================================");
  console.log(" 🧹 RÉINITIALISATION COMPLÈTE DE LA BASE DE DONNÉES");
  console.log("=======================================================\n");

  try {
    console.log("⏳ 1/9 Suppression des ordonnances...");
    await db.delete(prescriptions);

    console.log("⏳ 2/9 Suppression des consultations et visites...");
    await db.delete(visits);

    console.log("⏳ 3/9 Suppression des rendez-vous...");
    await db.delete(appointments);

    console.log("⏳ 4/9 Suppression des dossiers patients...");
    await db.delete(patients);

    console.log("⏳ 5/9 Suppression des médicaments personnalisés...");
    await db.delete(customMedications);

    console.log("⏳ 6/9 Suppression des configurations des cabinets...");
    await db.delete(clinicSettings);

    console.log("⏳ 7/9 Suppression des demandes d'inscription & codes OTP...");
    await db.delete(onboardingRequests);

    console.log("⏳ 8/9 Suppression de tous les utilisateurs (anciens comptes tests)...");
    await db.delete(users);

    console.log("⏳ 9/9 Suppression de tous les cabinets médicaux...");
    await db.delete(clinics);

    console.log("\n✨ Toutes les tables ont été vidées avec succès !");

    // Recréation du compte Super Administrateur officiel
    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || "nahliamine95@gmail.com").trim().toLowerCase();
    const superAdminPassword = (process.env.SUPERADMIN_PASSWORD || "nahliamine95@gmail.com").trim();

    console.log(`\n🛡️ Création du compte Super Admin : ${superAdminEmail}...`);
    const passwordHash = await bcrypt.hash(superAdminPassword, 10);

    const [createdAdmin] = await db.insert(users).values({
      name: "Amine Nahli (Super Admin)",
      email: superAdminEmail,
      password: passwordHash,
      role: "superadmin",
      status: "active",
      clinicId: null,
    }).returning();

    console.log("=======================================================");
    console.log(" 🎉 RÉINITIALISATION TERMINÉE AVEC SUCCÈS !");
    console.log("=======================================================");
    console.log(`• ID Super Admin  : #${createdAdmin.id}`);
    console.log(`• Identifiant     : ${createdAdmin.email}`);
    console.log(`• Rôle            : ${createdAdmin.role}`);
    console.log(`• Statut          : ${createdAdmin.status}`);
    console.log(`• URL Admin       : https://gestion-cabinet-medical-unq3.vercel.app/admin`);
    console.log("=======================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERREUR LORS DE LA RÉINITIALISATION :", error);
    process.exit(1);
  }
}

resetDatabase();
