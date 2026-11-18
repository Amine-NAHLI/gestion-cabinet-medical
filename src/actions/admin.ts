"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import {
  clinics,
  users,
  onboardingRequests,
  clinicSettings,
  patients,
  visits,
  prescriptions,
  appointments,
  customMedications,
} from "@/db/schema";
import { eq, desc, and, ne } from "drizzle-orm";
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

  const [
    pendingRequestsRaw,
    allRequestsRaw,
    allClinicsRaw,
    allSettingsRaw,
    allUsersRaw,
    allPatientsRaw,
    allVisitsRaw,
    allAppointmentsRaw,
  ] = await Promise.all([
    db
      .select()
      .from(onboardingRequests)
      .where(eq(onboardingRequests.status, "pending"))
      .orderBy(desc(onboardingRequests.createdAt)),

    db
      .select()
      .from(onboardingRequests)
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(100),

    db.select().from(clinics).orderBy(desc(clinics.createdAt)),

    db.select().from(clinicSettings),

    db.select().from(users).orderBy(desc(users.createdAt)),

    db
      .select({
        id: patients.id,
        clinicId: patients.clinicId,
        createdAt: patients.createdAt,
      })
      .from(patients),

    db
      .select({
        id: visits.id,
        clinicId: visits.clinicId,
        status: visits.status,
        amountToPay: visits.amountToPay,
        paymentStatus: visits.paymentStatus,
        createdAt: visits.createdAt,
      })
      .from(visits),

    db
      .select({
        id: appointments.id,
        clinicId: appointments.clinicId,
        status: appointments.status,
      })
      .from(appointments),
  ]);

  const settingsByClinic = new Map<number, typeof allSettingsRaw[number]>();
  for (const s of allSettingsRaw) {
    if (s.clinicId) settingsByClinic.set(s.clinicId, s);
  }

  // Construire la vue structurée : Chaque Médecin + son Cabinet + ses Assistantes + ses stats
  const doctorsWithAssistants = allClinicsRaw.map((clinic) => {
    const clinicUsers = allUsersRaw.filter((u) => u.clinicId === clinic.id && u.role !== "superadmin");
    const doctor = clinicUsers.find((u) => u.role === "doctor") || null;
    const assistants = clinicUsers.filter((u) => u.role === "assistant");
    const settings = settingsByClinic.get(clinic.id);

    const clinicPatients = allPatientsRaw.filter((p) => p.clinicId === clinic.id);
    const clinicVisits = allVisitsRaw.filter((v) => v.clinicId === clinic.id);
    const clinicAppointments = allAppointmentsRaw.filter(
      (a) => a.clinicId === clinic.id && a.status !== "cancelled"
    );

    const revenue = clinicVisits.reduce((sum, v) => {
      const amt = v.amountToPay ? parseFloat(String(v.amountToPay)) : 0;
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    return {
      clinic: {
        id: clinic.id,
        name: clinic.name,
        city: clinic.city,
        address: clinic.address || settings?.address || "",
        phone: clinic.phone || doctor?.phone || settings?.phone || "",
        specialty: settings?.specialty || "Médecine Générale",
        createdAt: clinic.createdAt.toISOString(),
      },
      doctor: doctor
        ? {
            id: doctor.id,
            name: doctor.name,
            email: doctor.email,
            phone: doctor.phone || clinic.phone || "",
            createdAt: doctor.createdAt.toISOString(),
          }
        : null,
      assistants: assistants.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone || "",
        createdAt: a.createdAt.toISOString(),
      })),
      metrics: {
        patientsCount: clinicPatients.length,
        visitsCount: clinicVisits.length,
        finishedVisitsCount: clinicVisits.filter((v) => v.status === "finished").length,
        appointmentsCount: clinicAppointments.length,
        revenue,
      },
    };
  });

  // Calculs statistiques globaux
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const nonAdminUsers = allUsersRaw.filter((u) => u.role !== "superadmin");
  const totalDoctors = nonAdminUsers.filter((u) => u.role === "doctor").length;
  const totalAssistants = nonAdminUsers.filter((u) => u.role === "assistant").length;

  const visitsToday = allVisitsRaw.filter((v) => new Date(v.createdAt) >= todayStart).length;
  const visitsThisMonth = allVisitsRaw.filter((v) => new Date(v.createdAt) >= monthStart).length;
  const finishedVisits = allVisitsRaw.filter((v) => v.status === "finished").length;

  const totalRevenue = allVisitsRaw.reduce((sum, v) => {
    const amt = v.amountToPay ? parseFloat(String(v.amountToPay)) : 0;
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const paidRevenue = allVisitsRaw
    .filter((v) => v.paymentStatus === "paid")
    .reduce((sum, v) => {
      const amt = v.amountToPay ? parseFloat(String(v.amountToPay)) : 0;
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

  const collectionRate = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;

  // Répartition par ville
  const cityCounts = new Map<string, number>();
  for (const c of allClinicsRaw) {
    const city = c.city || "Non précisée";
    cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
  }
  const citiesBreakdown = Array.from(cityCounts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  // Répartition par spécialité
  const specialtyCounts = new Map<string, number>();
  for (const item of doctorsWithAssistants) {
    const spec = item.clinic.specialty || "Médecine Générale";
    specialtyCounts.set(spec, (specialtyCounts.get(spec) || 0) + 1);
  }
  const specialtiesBreakdown = Array.from(specialtyCounts.entries())
    .map(([specialty, count]) => ({ specialty, count }))
    .sort((a, b) => b.count - a.count);

  // Activité mensuelle sur les 6 derniers mois
  const monthlyActivity: { label: string; clinics: number; visits: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");

    const clinicsInMonth = allClinicsRaw.filter((c) => {
      const dt = new Date(c.createdAt);
      return dt >= d && dt < nextMonth;
    }).length;

    const visitsInMonth = allVisitsRaw.filter((v) => {
      const dt = new Date(v.createdAt);
      return dt >= d && dt < nextMonth;
    }).length;

    monthlyActivity.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      clinics: clinicsInMonth,
      visits: visitsInMonth,
    });
  }

  const pendingRequests = pendingRequestsRaw.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));

  const allRequests = allRequestsRaw.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));

  return {
    pendingRequests,
    allRequests,
    doctorsWithAssistants,
    stats: {
      totalClinics: allClinicsRaw.length,
      totalDoctors,
      totalAssistants,
      totalUsers: nonAdminUsers.length,
      totalPatients: allPatientsRaw.length,
      totalVisits: allVisitsRaw.length,
      finishedVisits,
      visitsToday,
      visitsThisMonth,
      totalAppointments: allAppointmentsRaw.filter((a) => a.status !== "cancelled").length,
      totalRevenue,
      paidRevenue,
      collectionRate,
      pendingCount: pendingRequests.length,
      approvedRequestsCount: allRequestsRaw.filter(
        (r) => r.status === "verified" || r.status === "approved"
      ).length,
      rejectedRequestsCount: allRequestsRaw.filter((r) => r.status === "rejected").length,
      expiredRequestsCount: allRequestsRaw.filter((r) => r.status === "expired").length,
      citiesBreakdown,
      specialtiesBreakdown,
      monthlyActivity,
      resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
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

// Supprimer définitivement une demande de l'historique
export async function adminDeleteRequest(requestId: number) {
  await verifySuperAdmin();

  await db.delete(onboardingRequests).where(eq(onboardingRequests.id, requestId));

  revalidatePath("/admin");
  return { success: true, message: "Demande supprimée définitivement." };
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

// Supprimer DÉFINITIVEMENT un Médecin, son Cabinet, son Assistante et toutes ses données
export async function adminDeleteClinic(clinicId: number) {
  await verifySuperAdmin();

  const [targetClinic] = await db
    .select({ id: clinics.id, name: clinics.name })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  if (!targetClinic) {
    return { error: "Cabinet introuvable." };
  }

  // Suppression ordonnée de toutes les données du cabinet (isolation totale préservée)
  await db.delete(prescriptions).where(eq(prescriptions.clinicId, clinicId));
  await db.delete(visits).where(eq(visits.clinicId, clinicId));
  await db.delete(appointments).where(eq(appointments.clinicId, clinicId));
  await db.delete(patients).where(eq(patients.clinicId, clinicId));
  await db.delete(customMedications).where(eq(customMedications.clinicId, clinicId));
  await db.delete(clinicSettings).where(eq(clinicSettings.clinicId, clinicId));
  await db
    .delete(users)
    .where(and(eq(users.clinicId, clinicId), ne(users.role, "superadmin")));
  await db.delete(clinics).where(eq(clinics.id, clinicId));

  revalidatePath("/admin");
  return {
    success: true,
    message: `Le cabinet "${targetClinic.name}", le médecin et son assistante ont été supprimés définitivement.`,
  };
}
