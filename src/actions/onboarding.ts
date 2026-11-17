"use server";

import { db } from "@/db";
import { clinics, users, onboardingRequests, clinicSettings } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendAdminOtpNotification } from "@/lib/email";

export async function registerClinic(data: {
  doctorName: string;
  doctorEmail: string;
  doctorPassword: string;
  doctorPhone: string;
  specialty: string;
  clinicName: string;
  clinicCity: string;
  clinicAddress?: string;
  assistantName?: string;
  assistantEmail?: string;
  assistantPassword?: string;
}) {
  try {
    const cleanDoctorEmail = data.doctorEmail.trim().toLowerCase();
    const cleanAssistantEmail = data.assistantEmail?.trim().toLowerCase();

    // 1. Vérifier si l'email du médecin existe déjà dans les utilisateurs actifs
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, cleanDoctorEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return { error: "Un compte praticien existe déjà avec cet email." };
    }

    // Si assistante renseignée, vérifier son email
    if (cleanAssistantEmail) {
      const existingAssistant = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, cleanAssistantEmail))
        .limit(1);

      if (existingAssistant.length > 0) {
        return { error: "Cet email d'assistante est déjà attribué à un autre compte." };
      }
    }

    // 2. Générer le code OTP sécurisé à 6 chiffres
    const otpCode = crypto.randomInt(100000, 999999).toString();
    // Validité : 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 3. Hasher les mots de passe
    const doctorPasswordHash = await bcrypt.hash(data.doctorPassword, 10);
    const assistantPasswordHash = data.assistantPassword
      ? await bcrypt.hash(data.assistantPassword, 10)
      : null;

    // 4. Insérer dans la table des demandes
    const [insertedRequest] = await db
      .insert(onboardingRequests)
      .values({
        clinicName: data.clinicName.trim(),
        clinicCity: data.clinicCity.trim(),
        clinicAddress: data.clinicAddress?.trim() || null,
        doctorName: data.doctorName.trim(),
        doctorEmail: cleanDoctorEmail,
        doctorPassword: doctorPasswordHash,
        doctorPhone: data.doctorPhone.trim(),
        specialty: data.specialty.trim(),
        assistantName: data.assistantName?.trim() || null,
        assistantEmail: cleanAssistantEmail || null,
        assistantPassword: assistantPasswordHash,
        otpCode,
        expiresAt,
        status: "pending",
        attempts: 0,
      })
      .returning({ id: onboardingRequests.id });

    // 5. Envoyer la notification par email au Super Admin (asynchrone sans bloquer)
    sendAdminOtpNotification({
      doctorName: data.doctorName.trim(),
      doctorEmail: cleanDoctorEmail,
      doctorPhone: data.doctorPhone.trim(),
      specialty: data.specialty.trim(),
      clinicName: data.clinicName.trim(),
      clinicCity: data.clinicCity.trim(),
      assistantName: data.assistantName?.trim(),
      assistantEmail: cleanAssistantEmail,
      otpCode,
      requestId: insertedRequest.id,
    }).catch((err) => {
      console.error("[ONBOARDING ERROR] Notification email non bloquante :", err);
    });

    console.log(`[ONBOARDING] Nouvelle demande créée #${insertedRequest.id} • Dr. ${data.doctorName} • OTP: ${otpCode}`);

    return {
      success: true,
      requestId: insertedRequest.id,
    };
  } catch (error: any) {
    console.error("[REGISTER CLINIC ERROR]", error);
    return { error: error.message || "Une erreur est survenue lors de l'enregistrement." };
  }
}

export async function verifyOtpCode(requestId: number, inputCode: string) {
  try {
    const cleanCode = inputCode.trim();

    const [request] = await db
      .select()
      .from(onboardingRequests)
      .where(eq(onboardingRequests.id, requestId))
      .limit(1);

    if (!request) {
      return { error: "Demande d'inscription introuvable." };
    }

    if (request.status === "verified" || request.status === "approved") {
      return { success: true, message: "Ce cabinet a déjà été activé. Vous pouvez vous connecter." };
    }

    if (request.status === "rejected") {
      return { error: "Cette demande a été rejetée ou verrouillée suite à de trop nombreuses tentatives." };
    }

    // Vérifier l'expiration (5 minutes)
    if (new Date() > new Date(request.expiresAt)) {
      await db
        .update(onboardingRequests)
        .set({ status: "expired" })
        .where(eq(onboardingRequests.id, requestId));
      return { error: "Le code a expiré (validité de 5 minutes dépassée). Cliquez sur 'Renvoyer un nouveau code'." };
    }

    // Vérifier tentatives anti-brute force
    if (request.attempts >= 5) {
      await db
        .update(onboardingRequests)
        .set({ status: "rejected" })
        .where(eq(onboardingRequests.id, requestId));
      return { error: "Nombre maximum de tentatives atteint (5). Veuillez recommencer l'inscription." };
    }

    // Incrémenter les tentatives
    await db
      .update(onboardingRequests)
      .set({ attempts: request.attempts + 1 })
      .where(eq(onboardingRequests.id, requestId));

    if (request.otpCode !== cleanCode) {
      return { error: "Code incorrect. Veuillez vérifier avec l'administrateur." };
    }

    // CODE CORRECT ! -> Activer le cabinet et créer les utilisateurs
    return await activateClinicFromRequest(request);
  } catch (error: any) {
    console.error("[VERIFY OTP ERROR]", error);
    return { error: error.message || "Erreur de vérification du code." };
  }
}

export async function resendOtpCode(requestId: number) {
  try {
    const [request] = await db
      .select()
      .from(onboardingRequests)
      .where(eq(onboardingRequests.id, requestId))
      .limit(1);

    if (!request) {
      return { error: "Demande introuvable." };
    }

    if (request.status === "verified" || request.status === "approved") {
      return { error: "Cette demande a déjà été validée." };
    }

    // Nouveau code et nouveau timer de 5 minutes
    const newOtpCode = crypto.randomInt(100000, 999999).toString();
    const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db
      .update(onboardingRequests)
      .set({
        otpCode: newOtpCode,
        expiresAt: newExpiresAt,
        status: "pending",
        attempts: 0,
      })
      .where(eq(onboardingRequests.id, requestId));

    // Envoyer à nouveau l'email au Super Admin
    sendAdminOtpNotification({
      doctorName: request.doctorName,
      doctorEmail: request.doctorEmail,
      doctorPhone: request.doctorPhone,
      specialty: request.specialty,
      clinicName: request.clinicName,
      clinicCity: request.clinicCity,
      assistantName: request.assistantName,
      assistantEmail: request.assistantEmail,
      otpCode: newOtpCode,
      requestId: request.id,
    }).catch(console.error);

    return { success: true, message: "Nouveau code généré et transmis à l'administrateur !" };
  } catch (error: any) {
    return { error: error.message || "Erreur lors du renvoi du code." };
  }
}

export async function getOnboardingRequestStatus(requestId: number) {
  try {
    const [request] = await db
      .select({
        id: onboardingRequests.id,
        status: onboardingRequests.status,
        expiresAt: onboardingRequests.expiresAt,
        clinicName: onboardingRequests.clinicName,
        doctorName: onboardingRequests.doctorName,
        doctorEmail: onboardingRequests.doctorEmail,
      })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.id, requestId))
      .limit(1);

    if (!request) return null;

    return {
      id: request.id,
      status: request.status,
      expiresAt: request.expiresAt.toISOString(),
      clinicName: request.clinicName,
      doctorName: request.doctorName,
      doctorEmail: request.doctorEmail,
    };
  } catch {
    return null;
  }
}

// Fonction interne partagée pour activer le cabinet et les utilisateurs
export async function activateClinicFromRequest(request: typeof onboardingRequests.$inferSelect) {
  // 1. Créer le cabinet
  const [newClinic] = await db
    .insert(clinics)
    .values({
      name: request.clinicName,
      city: request.clinicCity,
      address: request.clinicAddress,
      phone: request.doctorPhone,
      status: "active",
    })
    .returning({ id: clinics.id });

  // 2. Créer l'utilisateur Médecin
  await db.insert(users).values({
    clinicId: newClinic.id,
    name: request.doctorName,
    email: request.doctorEmail,
    password: request.doctorPassword,
    role: "doctor",
    phone: request.doctorPhone,
    status: "active",
  });

  // 3. Créer l'utilisateur Assistante si renseignée
  if (request.assistantEmail && request.assistantPassword) {
    await db.insert(users).values({
      clinicId: newClinic.id,
      name: request.assistantName || "Assistante",
      email: request.assistantEmail,
      password: request.assistantPassword,
      role: "assistant",
      status: "active",
    });
  }

  // 4. Paramètres par défaut de la clinique
  await db.insert(clinicSettings).values({
    clinicId: newClinic.id,
    clinicName: request.clinicName,
    doctorName: request.doctorName,
    specialty: request.specialty,
    phone: request.doctorPhone,
    email: request.doctorEmail,
    city: request.clinicCity,
    address: request.clinicAddress || "Adresse du cabinet",
    orderNumber: `INPE: ${crypto.randomInt(100000000, 999999999)}`,
    taxId: `IF: ${crypto.randomInt(10000000, 99999999)}`,
    defaultFee: "250.00",
  });

  // 5. Mettre à jour le statut de la demande
  await db
    .update(onboardingRequests)
    .set({ status: "verified" })
    .where(eq(onboardingRequests.id, request.id));

  return {
    success: true,
    clinicId: newClinic.id,
    message: "Félicitations ! Votre cabinet médical est activé avec succès.",
  };
}
