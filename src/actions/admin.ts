"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { clinics, users, onboardingRequests, clinicSettings } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { activateClinicFromRequest } from "./onboarding";
import { revalidatePath } from "next/cache";

async function verifySuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "superadmin") {
    throw new Error("Accès refusé. Privilèges Super Administrateur requis.");
  }
  return session;
}

export async function getAdminDashboardData() {
  await verifySuperAdmin();

  // 1. Demandes en attente (avec leur OTP et temps restant)
  const pendingRequests = await db
    .select()
    .from(onboardingRequests)
    .where(eq(onboardingRequests.status, "pending"))
    .orderBy(desc(onboardingRequests.createdAt));

  // 2. Historique complet des demandes
  const allRequests = await db
    .select()
    .from(onboardingRequests)
    .orderBy(desc(onboardingRequests.createdAt))
    .limit(50);

  // 3. Liste de tous les cabinets médicaux
  const allClinics = await db
    .select()
    .from(clinics)
    .orderBy(desc(clinics.createdAt));

  // 4. Liste de tous les utilisateurs (avec informations du cabinet)
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      clinicId: users.clinicId,
      createdAt: users.createdAt,
      clinicName: clinics.name,
      clinicCity: clinics.city,
    })
    .from(users)
    .leftJoin(clinics, eq(users.clinicId, clinics.id))
    .orderBy(desc(users.createdAt));

  return {
    pendingRequests,
    allRequests,
    allClinics,
    allUsers,
    stats: {
      totalClinics: allClinics.length,
      totalUsers: allUsers.length,
      pendingCount: pendingRequests.length,
      activeClinics: allClinics.filter((c) => c.status === "active").length,
    },
  };
}

// 1-Click Approval direct par le Super Admin
export async function adminApproveRequest(requestId: number) {
  await verifySuperAdmin();

  const [request] = await db
    .select()
    .from(onboardingRequests)
    .where(eq(onboardingRequests.id, requestId))
    .limit(1);

  if (!request) {
    return { error: "Demande introuvable." };
  }

  if (request.status === "verified" || request.status === "approved") {
    return { error: "Cette demande est déjà validée." };
  }

  const result = await activateClinicFromRequest(request);

  await db
    .update(onboardingRequests)
    .set({ status: "approved" })
    .where(eq(onboardingRequests.id, requestId));

  revalidatePath("/admin");
  return result;
}

// Rejeter une demande
export async function adminRejectRequest(requestId: number) {
  await verifySuperAdmin();

  await db
    .update(onboardingRequests)
    .set({ status: "rejected" })
    .where(eq(onboardingRequests.id, requestId));

  revalidatePath("/admin");
  return { success: true, message: "Demande rejetée avec succès." };
}

// Modifier / Réinitialiser le mot de passe d'un utilisateur
export async function adminUpdateUserPassword(userId: number, newPassword: string) {
  await verifySuperAdmin();

  if (!newPassword || newPassword.trim().length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  const newHash = await bcrypt.hash(newPassword.trim(), 10);

  await db
    .update(users)
    .set({ password: newHash })
    .where(eq(users.id, userId));

  revalidatePath("/admin");
  return {
    success: true,
    message: "Mot de passe mis à jour avec succès !",
  };
}

// Activer ou Suspendre un compte utilisateur
export async function adminToggleUserStatus(userId: number, currentStatus: string) {
  await verifySuperAdmin();

  const nextStatus = currentStatus === "active" ? "suspended" : "active";

  await db
    .update(users)
    .set({ status: nextStatus })
    .where(eq(users.id, userId));

  revalidatePath("/admin");
  return {
    success: true,
    nextStatus,
    message: `Utilisateur passé au statut : ${nextStatus}`,
  };
}

// Activer ou Suspendre un Cabinet entier (Ex: abonnement non payé)
export async function adminToggleClinicStatus(clinicId: number, currentStatus: string) {
  await verifySuperAdmin();

  const nextStatus = currentStatus === "active" ? "suspended" : "active";

  await db
    .update(clinics)
    .set({ status: nextStatus })
    .where(eq(clinics.id, clinicId));

  // Suspendre ou réactiver aussi tous les utilisateurs rattachés
  await db
    .update(users)
    .set({ status: nextStatus })
    .where(eq(users.clinicId, clinicId));

  revalidatePath("/admin");
  return {
    success: true,
    nextStatus,
    message: `Cabinet ${nextStatus === "active" ? "réactivé" : "suspendu"} avec succès.`,
  };
}
