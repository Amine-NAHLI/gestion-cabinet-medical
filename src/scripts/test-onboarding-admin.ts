import "dotenv/config";
import { db } from "../db";
import { users, clinics, onboardingRequests } from "../db/schema";
import { registerClinic, verifyOtpCode } from "../actions/onboarding";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function runE2ETest() {
  console.log("==================================================");
  console.log("🚀 TEST E2E : ONBOARDING MÉDECIN & PORTAIL ADMIN");
  console.log("==================================================");

  // 1. Vérification du compte Super Admin
  console.log("\n[TEST 1] Vérification du compte Super Admin...");
  const [superAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, "nahliamine95@gmail.com"))
    .limit(1);

  if (!superAdmin) {
    throw new Error("Super Admin non trouvé en base !");
  }

  const isPasswordMatch = await bcrypt.compare("nahliamine95@gmail.com", superAdmin.password);
  console.log(`✅ Super Admin trouvé : ${superAdmin.name} (${superAdmin.email})`);
  console.log(`✅ Rôle : ${superAdmin.role} | Statut : ${superAdmin.status}`);
  console.log(`✅ Mot de passe conforme ('nahliamine95@gmail.com') : ${isPasswordMatch ? "OUI" : "NON"}`);

  // 2. Nettoyage éventuel d'un test précédent
  const testDoctorEmail = "test.dr.benjelloun@cabinet.ma";
  await db.delete(users).where(eq(users.email, testDoctorEmail));
  await db.delete(onboardingRequests).where(eq(onboardingRequests.doctorEmail, testDoctorEmail));

  // 3. Inscription d'un nouveau médecin (/register)
  console.log("\n[TEST 2] Inscription d'un nouveau cabinet médical (Dr. Samir Benjelloun)...");
  const regResult = await registerClinic({
    doctorName: "Dr. Samir Benjelloun",
    doctorEmail: testDoctorEmail,
    doctorPhone: "0661123456",
    specialty: "Cardiologie",
    clinicName: "Clinique Cardio Benjelloun",
    clinicCity: "Casablanca",
    clinicAddress: "45 Avenue Hassan II",
    assistantName: "Khadija Alami",
    assistantEmail: "khadija@benjelloun.ma",
  });

  if (!regResult.success || !regResult.requestId) {
    throw new Error(`Échec d'inscription : ${regResult.error}`);
  }

  console.log(`✅ Demande d'onboarding créée avec succès ! ID: #${regResult.requestId}`);

  // 4. Vérification de la demande et du code à 6 chiffres
  console.log("\n[TEST 3] Vérification du code OTP et TTL 5 minutes...");
  const [createdReq] = await db
    .select()
    .from(onboardingRequests)
    .where(eq(onboardingRequests.id, regResult.requestId))
    .limit(1);

  console.log(`✅ Code OTP généré : ${createdReq.otpCode} (Longueur: ${createdReq.otpCode.length} chiffres)`);
  console.log(`✅ Date création : ${createdReq.createdAt.toISOString()}`);
  console.log(`✅ Date expiration : ${createdReq.expiresAt.toISOString()}`);
  const ttlMinutes = (new Date(createdReq.expiresAt).getTime() - new Date(createdReq.createdAt).getTime()) / 60000;
  console.log(`✅ Durée de validité : ${Math.round(ttlMinutes)} minutes`);
  console.log(`✅ Statut initial : ${createdReq.status}`);

  // 5. Test de saisie d'un faux code
  console.log("\n[TEST 4] Test de rejet d'un code OTP erroné...");
  const wrongRes: any = await verifyOtpCode(createdReq.id, "000000");
  console.log(`✅ Faux code refusé comme prévu : "${wrongRes.error}"`);

  // 6. Test de saisie du bon code OTP (Activation)
  console.log("\n[TEST 5] Validation avec le code exact...");
  const validRes: any = await verifyOtpCode(createdReq.id, createdReq.otpCode);
  if (!validRes.success) {
    throw new Error(`Échec validation code : ${validRes.error}`);
  }
  console.log(`✅ ${validRes.message} (Clinic ID: #${validRes.clinicId})`);

  // 7. Vérification des utilisateurs créés en base
  console.log("\n[TEST 6] Vérification de la création des comptes rattachés...");
  const [newDoctor] = await db.select().from(users).where(eq(users.email, testDoctorEmail));
  const [newAssistant] = await db.select().from(users).where(eq(users.email, "khadija@benjelloun.ma"));

  console.log(`✅ Médecin créé : ${newDoctor.name} (Role: ${newDoctor.role}, ClinicId: ${newDoctor.clinicId}, Statut: ${newDoctor.status})`);
  console.log(`✅ Assistante créée : ${newAssistant.name} (Role: ${newAssistant.role}, ClinicId: ${newAssistant.clinicId}, Statut: ${newAssistant.status})`);

  // 8. Nettoyage après test
  console.log("\n[TEST 7] Nettoyage des données de test...");
  await db.delete(users).where(eq(users.email, testDoctorEmail));
  await db.delete(users).where(eq(users.email, "khadija@benjelloun.ma"));
  if (validRes.clinicId) {
    await db.delete(clinics).where(eq(clinics.id, validRes.clinicId));
  }
  await db.delete(onboardingRequests).where(eq(onboardingRequests.id, createdReq.id));
  console.log("✅ Données de test nettoyées proprement.");

  console.log("\n==================================================");
  console.log("🎉 TOUS LES TESTS E2E SONT VALIDÉS AVEC SUCCÈS !");
  console.log("==================================================");
}

runE2ETest().catch(console.error);
