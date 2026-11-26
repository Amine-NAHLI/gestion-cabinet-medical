"use server";

import { db } from "@/db";
import { clinics, users, onboardingRequests, clinicSettings } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendAdminOtpNotification, sendNewRegistrationRequestNotification } from "@/lib/email";
import { slugifyClinic } from "@/lib/slug";

export async function registerClinic(data: {
  doctorName: string;
  doctorEmail: string;
  doctorPhone: string;
  specialty: string;
  clinicName: string;
  clinicCity: string;
  clinicAddress?: string;
  assistantName: string;
  assistantEmail: string;
  selectedPlan?: "standard" | "pro";
  selectedCycle?: "monthly" | "quarterly" | "yearly";
  selectedPrice?: number;
}) {
  try {
    const cleanDoctorEmail = data.doctorEmail.trim().toLowerCase();
    const cleanAssistantEmail = data.assistantEmail.trim().toLowerCase();
    const cleanAssistantName = data.assistantName.trim();

    if (!data.doctorName.trim() || !cleanDoctorEmail) {
      return { error: "Veuillez renseigner le nom et l'email du médecin." };
    }

    if (!data.clinicName.trim() || !data.clinicCity.trim()) {
      return { error: "Veuillez renseigner le nom du cabinet et sa ville." };
    }

    // Validation obligatoire du compte Assistante
    if (!cleanAssistantName || !cleanAssistantEmail) {
      return {
        error: "Les informations de l'assistante médicale (nom et email) sont obligatoires.",
      };
    }

    if (cleanAssistantEmail === cleanDoctorEmail) {
      return {
        error: "L'adresse email de l'assistante doit être différente de celle du médecin.",
      };
    }

    // Déterminer le plan, le cycle et le montant
    const plan = data.selectedPlan === "standard" ? "standard" : "pro";
    const cycle = data.selectedCycle === "yearly" ? "yearly" : data.selectedCycle === "quarterly" ? "quarterly" : "monthly";
    const price = data.selectedPrice || (plan === "standard" ? (cycle === "yearly" ? 1900 : cycle === "quarterly" ? 550 : 200) : (cycle === "yearly" ? 2500 : cycle === "quarterly" ? 700 : 250));

    // Vérifier si l'email de l'assistante existe déjà
    const existingAssistant = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, cleanAssistantEmail))
      .limit(1);

    if (existingAssistant.length > 0) {
      return { error: "Cet email d'assistante est déjà attribué à un autre compte." };
    }

    // 1. Vérifier si l'email du médecin existe déjà dans les utilisateurs actifs
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, cleanDoctorEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return { error: "Un compte praticien existe déjà avec cet email." };
    }

    // 2. Code interne & validité 30 jours
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 3. Mot de passe initial temporaire (sera défini ou communiqué par le Super Admin)
    const tempDocPassword = crypto.randomBytes(8).toString("hex");
    const doctorPasswordHash = await bcrypt.hash(tempDocPassword, 10);
    const assistantPasswordHash = cleanAssistantEmail
      ? await bcrypt.hash(crypto.randomBytes(8).toString("hex"), 10)
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
        assistantName: cleanAssistantName || null,
        assistantEmail: cleanAssistantEmail || null,
        assistantPassword: assistantPasswordHash,
        otpCode,
        expiresAt,
        status: "pending",
        attempts: 0,
        selectedPlan: plan,
        selectedCycle: cycle,
        selectedPrice: price,
      })
      .returning({ id: onboardingRequests.id });

    // 5. Envoyer la notification par email au Super Admin avec tous les détails
    sendNewRegistrationRequestNotification({
      doctorName: data.doctorName.trim(),
      doctorEmail: cleanDoctorEmail,
      doctorPhone: data.doctorPhone.trim(),
      specialty: data.specialty.trim(),
      clinicName: data.clinicName.trim(),
      clinicCity: data.clinicCity.trim(),
      clinicAddress: data.clinicAddress?.trim() || null,
      assistantName: cleanAssistantName || null,
      assistantEmail: cleanAssistantEmail || null,
      requestId: insertedRequest.id,
      selectedPlan: plan,
      selectedCycle: cycle,
      selectedPrice: price,
    }).catch((err) => {
      console.error("[ONBOARDING ERROR] Notification email admin non bloquante :", err);
    });

    console.log(`[ONBOARDING] Nouvelle demande d'inscription créée #${insertedRequest.id} • Dr. ${data.doctorName} (${data.clinicName})`);

    return {
      success: true,
      requestId: insertedRequest.id,
      message: "Votre demande d'inscription a été envoyée avec succès.",
    };
  } catch (error: any) {
    console.error("[REGISTER CLINIC ERROR]", error);
    return {
      error: error.message || "Une erreur est survenue lors de l'enregistrement de votre demande.",
    };
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
export async function activateClinicFromRequest(
  request: typeof onboardingRequests.$inferSelect,
  customSlug?: string
) {
  // Générer un slug (sous-domaine) unique
  let baseSlug = customSlug?.trim() ? slugifyClinic(customSlug) : slugifyClinic(request.clinicName);
  if (!baseSlug || baseSlug.length < 2) {
    baseSlug = slugifyClinic(request.doctorName) || `cabinet-${request.id}`;
  }
  let candidateSlug = baseSlug;
  let counter = 1;
  while (true) {
    const [existing] = await db
      .select({ id: clinics.id })
      .from(clinics)
      .where(eq(clinics.slug, candidateSlug))
      .limit(1);
    if (!existing) break;
    counter++;
    candidateSlug = `${baseSlug}-${counter}`;
  }

  // Déterminer le plan et le cycle choisis
  const plan = request.selectedPlan === "standard" ? "standard" : "pro";
  const cycle = request.selectedCycle === "yearly" ? "yearly" : request.selectedCycle === "quarterly" ? "quarterly" : "monthly";
  const price = request.selectedPrice || (plan === "standard" ? (cycle === "yearly" ? 1900 : cycle === "quarterly" ? 550 : 200) : (cycle === "yearly" ? 2500 : cycle === "quarterly" ? 700 : 250));

  // 1 semaine de test offerte (7 jours d'essai gratuit) avant le premier règlement
  const trialDays = 7;
  const subscriptionExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

  // 1. Créer le cabinet avec sous-domaine & abonnement en période d'essai 7 jours
  const [newClinic] = await db
    .insert(clinics)
    .values({
      name: request.clinicName,
      slug: candidateSlug,
      city: request.clinicCity,
      address: request.clinicAddress,
      phone: request.doctorPhone,
      status: "active",
      plan,
      billingCycle: cycle,
      planPrice: price,
      subscriptionExpiresAt,
      subscriptionStatus: "trial",
      isCommunityMember: false,
    })
    .returning({ id: clinics.id });

  // 2. Créer l'utilisateur Médecin (isOnboarded: false pour déclencher sa configuration initiale lors de son premier accès)
  await db.insert(users).values({
    clinicId: newClinic.id,
    name: request.doctorName,
    email: request.doctorEmail,
    password: request.doctorPassword,
    role: "doctor",
    phone: request.doctorPhone,
    status: "active",
    isOnboarded: false,
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
      isOnboarded: false,
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
    address: request.clinicAddress || "",
    orderNumber: "",
    taxId: "",
    defaultFee: "250.00",
  });

  // 5. Mettre à jour le statut de la demande
  await db
    .update(onboardingRequests)
    .set({ status: "approved" })
    .where(eq(onboardingRequests.id, request.id));

  return {
    success: true,
    clinicId: newClinic.id,
    slug: candidateSlug,
    message: `Félicitations ! Le cabinet médical ${request.clinicName} a été activé avec le sous-domaine https://${candidateSlug}.toncabinet.me`,
  };
}
