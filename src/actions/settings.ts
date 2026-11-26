"use server";

import { db } from "@/db";
import { clinicSettings, clinics, users, patients, visits } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getTenantClinicId } from "@/lib/tenant";
import { sendPlanChangeRequestNotification } from "@/lib/email";
import {
  ConsultationFieldConfig,
  PrescriptionTemplateLayout,
  DEFAULT_CONSULTATION_FIELDS,
  DEFAULT_PRESCRIPTION_LAYOUT,
  normalizeConsultationFields,
  normalizePrescriptionLayout,
} from "@/lib/consultationConfig";

async function buildDefaultSettingsForClinic(clinicId: number) {
  const clinicRows = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);
  const doctorRows = await db
    .select()
    .from(users)
    .where(and(eq(users.clinicId, clinicId), eq(users.role, "doctor")))
    .limit(1);

  const c = clinicRows[0];
  const d = doctorRows[0];

  return {
    clinicId,
    clinicName: c?.name || "Cabinet Médical",
    doctorName: d?.name ? (d.name.toLowerCase().startsWith("dr") ? d.name : `Dr. ${d.name}`) : "",
    specialty: "Médecine Générale",
    phone: c?.phone || d?.phone || "",
    email: d?.email || "",
    address: c?.address || "",
    city: c?.city || "",
    avatarUrl: d?.avatarUrl || null,
    bio: d?.bio || "",
    orderNumber: "",
    taxId: "",
    defaultFee: "250.00",
    consultationFields: DEFAULT_CONSULTATION_FIELDS,
    prescriptionTemplateUrl: null as string | null,
    prescriptionTemplateName: null as string | null,
    prescriptionTemplateLayout: DEFAULT_PRESCRIPTION_LAYOUT,
  };
}

export async function getClinicSettings(targetClinicId?: number) {
  let clinicId = targetClinicId;
  if (!clinicId) {
    try {
      clinicId = await getTenantClinicId(false);
    } catch {
      clinicId = 1;
    }
  }
  if (!clinicId) clinicId = 1;

  try {
    const [clinicRow] = await db
      .select({
        plan: clinics.plan,
        billingCycle: clinics.billingCycle,
        planPrice: clinics.planPrice,
        subscriptionExpiresAt: clinics.subscriptionExpiresAt,
        subscriptionStatus: clinics.subscriptionStatus,
        pendingPlanChange: clinics.pendingPlanChange,
      })
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    const subscription = {
      plan: clinicRow?.plan || "pro",
      billingCycle: clinicRow?.billingCycle || "monthly",
      planPrice: clinicRow?.planPrice || 250,
      subscriptionExpiresAt: clinicRow?.subscriptionExpiresAt ? clinicRow.subscriptionExpiresAt.toISOString() : null,
      subscriptionStatus: clinicRow?.subscriptionStatus || "active",
      pendingPlanChange: (clinicRow?.pendingPlanChange as any) || null,
      daysRemaining: clinicRow?.subscriptionExpiresAt
        ? Math.max(0, Math.ceil((new Date(clinicRow.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 30,
    };

    const list = await db
      .select()
      .from(clinicSettings)
      .where(eq(clinicSettings.clinicId, clinicId))
      .limit(1);

    const [doctorUser] = await db
      .select({ avatarUrl: users.avatarUrl, bio: users.bio })
      .from(users)
      .where(and(eq(users.clinicId, clinicId), eq(users.role, "doctor")))
      .limit(1);

    if (list.length > 0) {
      const row = list[0];
      return {
        ...row,
        subscription,
        avatarUrl: doctorUser?.avatarUrl || null,
        bio: doctorUser?.bio || "",
        consultationFields: normalizeConsultationFields(row.consultationFields),
        prescriptionTemplateUrl: row.prescriptionTemplateUrl || null,
        prescriptionTemplateName: row.prescriptionTemplateName || null,
        prescriptionTemplateLayout: normalizePrescriptionLayout(row.prescriptionTemplateLayout),
      };
    }

    const defaults = await buildDefaultSettingsForClinic(clinicId);
    return {
      id: clinicId,
      ...defaults,
      subscription,
      updatedAt: new Date(),
    };
  } catch (e) {
    console.error("Erreur récupération paramètres cabinet:", e);
    return {
      id: clinicId,
      clinicId,
      clinicName: "Cabinet Médical",
      doctorName: "",
      specialty: "Médecine Générale",
      phone: "",
      email: "",
      address: "",
      city: "",
      orderNumber: "",
      taxId: "",
      defaultFee: "250.00",
      consultationFields: DEFAULT_CONSULTATION_FIELDS,
      prescriptionTemplateUrl: null,
      prescriptionTemplateName: null,
      prescriptionTemplateLayout: DEFAULT_PRESCRIPTION_LAYOUT,
      subscription: {
        plan: "pro",
        billingCycle: "monthly",
        planPrice: 250,
        subscriptionExpiresAt: null,
        subscriptionStatus: "active",
        daysRemaining: 30,
      },
      updatedAt: new Date(),
    };
  }
}

export async function updateClinicSettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: "Non autorisé" };
  }

  const clinicId = await getTenantClinicId();

  const clinicName = formData.get("clinicName") as string;
  const doctorName = formData.get("doctorName") as string;
  const specialty = formData.get("specialty") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const orderNumber = formData.get("orderNumber") as string;
  const taxId = formData.get("taxId") as string;
  const defaultFee = formData.get("defaultFee") as string;

  try {
    const list = await db
      .select()
      .from(clinicSettings)
      .where(eq(clinicSettings.clinicId, clinicId))
      .limit(1);

    if (list.length > 0) {
      await db
        .update(clinicSettings)
        .set({
          clinicName,
          doctorName,
          specialty,
          phone,
          email,
          address,
          city,
          orderNumber,
          taxId,
          defaultFee: defaultFee || "250.00",
          updatedAt: new Date(),
        })
        .where(eq(clinicSettings.id, list[0].id));
    } else {
      await db.insert(clinicSettings).values({
        clinicId,
        clinicName,
        doctorName,
        specialty,
        phone,
        email,
        address,
        city,
        orderNumber,
        taxId,
        defaultFee: defaultFee || "250.00",
      });
    }

    // Synchroniser aussi la table clinics (nom, ville, adresse, téléphone)
    await db
      .update(clinics)
      .set({
        name: clinicName || "Cabinet Médical",
        city: city || "",
        address: address || null,
        phone: phone || null,
      })
      .where(eq(clinics.id, clinicId));

    // Mettre à jour le profil praticien dans la table users (nom, téléphone, avatar, bio)
    const userId = parseInt((session.user as any)?.id || "0");
    const avatarUrl = formData.get("avatarUrl") as string | null;
    const bio = formData.get("bio") as string | null;

    if (userId) {
      await db
        .update(users)
        .set({
          name: doctorName || undefined,
          phone: phone || undefined,
          avatarUrl: avatarUrl !== null ? (avatarUrl.trim() || null) : undefined,
          bio: bio !== null ? (bio.trim() || null) : undefined,
        })
        .where(eq(users.id, userId));
    }

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/stats");
    revalidatePath("/dashboard/payments");
    return { success: true };
  } catch (error) {
    console.error("Erreur mise à jour paramètres:", error);
    return { success: false, error: "Erreur lors de l'enregistrement des paramètres." };
  }
}

export async function updateConsultationFields(fields: ConsultationFieldConfig[]) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "doctor") {
    return { success: false, error: "Réservé au médecin titulaire du cabinet." };
  }

  const clinicId = await getTenantClinicId();

  if (!Array.isArray(fields) || fields.length === 0) {
    return { success: false, error: "Veuillez conserver au moins une case dans la fiche consultation." };
  }

  // Nettoyer les champs avant enregistrement
  const sanitized: ConsultationFieldConfig[] = fields.map((f) => ({
    id: f.id,
    label: (f.label || "Champ sans nom").trim(),
    type: f.type,
    section: f.section === "vitals" ? "vitals" : "clinical",
    placeholder: f.placeholder?.trim() || "",
    unit: f.unit?.trim() || "",
    options:
      f.type === "select"
        ? (f.options || []).map((o) => o.trim()).filter(Boolean)
        : undefined,
    required: Boolean(f.required),
    systemKey: f.systemKey,
  }));

  try {
    const existing = await db
      .select({ id: clinicSettings.id })
      .from(clinicSettings)
      .where(eq(clinicSettings.clinicId, clinicId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(clinicSettings)
        .set({
          consultationFields: sanitized,
          updatedAt: new Date(),
        })
        .where(eq(clinicSettings.id, existing[0].id));
    } else {
      const defaults = await buildDefaultSettingsForClinic(clinicId);
      await db.insert(clinicSettings).values({
        ...defaults,
        consultationFields: sanitized,
      });
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/consultation/[visitId]", "page");
    return { success: true };
  } catch (error) {
    console.error("Erreur sauvegarde champs consultation:", error);
    return { success: false, error: "Impossible d'enregistrer les cases de consultation." };
  }
}

export async function updatePrescriptionTemplate(payload: {
  templateUrl: string | null;
  templateName: string | null;
  layout: PrescriptionTemplateLayout;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "doctor") {
    return { success: false, error: "Réservé au médecin titulaire du cabinet." };
  }

  const clinicId = await getTenantClinicId();

  if (payload.templateUrl && payload.templateUrl.length > 5_000_000) {
    return {
      success: false,
      error: "Le fichier est trop volumineux (max 3.5 Mo). Essayez une image ou un PDF plus léger.",
    };
  }

  const safeLayout = normalizePrescriptionLayout(payload.layout);

  try {
    const existing = await db
      .select({ id: clinicSettings.id })
      .from(clinicSettings)
      .where(eq(clinicSettings.clinicId, clinicId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(clinicSettings)
        .set({
          prescriptionTemplateUrl: payload.templateUrl,
          prescriptionTemplateName: payload.templateName,
          prescriptionTemplateLayout: safeLayout,
          updatedAt: new Date(),
        })
        .where(eq(clinicSettings.id, existing[0].id));
    } else {
      const defaults = await buildDefaultSettingsForClinic(clinicId);
      await db.insert(clinicSettings).values({
        ...defaults,
        prescriptionTemplateUrl: payload.templateUrl,
        prescriptionTemplateName: payload.templateName,
        prescriptionTemplateLayout: safeLayout,
      });
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/consultation/[visitId]", "page");
    return { success: true };
  } catch (error) {
    console.error("Erreur sauvegarde template ordonnance:", error);
    return { success: false, error: "Impossible d'enregistrer le template d'ordonnance." };
  }
}

// Export des dossiers et patients au format Excel (CSV encodé UTF-8 BOM)
export async function exportClinicPatientsData() {
  const clinicId = await getTenantClinicId(true);
  const clinicPatients = await db
    .select()
    .from(patients)
    .where(eq(patients.clinicId, clinicId))
    .orderBy(desc(patients.createdAt));

  const allClinicVisits = await db
    .select()
    .from(visits)
    .where(eq(visits.clinicId, clinicId))
    .orderBy(desc(visits.createdAt));

  const header = [
    "ID Patient",
    "Nom",
    "Prénom",
    "CIN",
    "Téléphone",
    "Âge",
    "Genre",
    "Mutuelle",
    "Total Consultations",
    "Dernière Consultation",
    "Date Inscription",
  ];

  const rows = clinicPatients.map((p) => {
    const pVisits = allClinicVisits.filter((v) => v.patientId === p.id);
    const lastVisit = pVisits[0]?.createdAt
      ? new Date(pVisits[0].createdAt).toLocaleDateString("fr-FR")
      : "Aucune";
    return [
      p.id,
      `"${(p.lastName || "").replace(/"/g, '""')}"`,
      `"${(p.firstName || "").replace(/"/g, '""')}"`,
      `"${(p.cin || "").replace(/"/g, '""')}"`,
      `"${(p.phone || "").replace(/"/g, '""')}"`,
      p.age || "",
      p.gender || "",
      `"${(p.mutuelle || "").replace(/"/g, '""')}"`,
      pVisits.length,
      lastVisit,
      new Date(p.createdAt).toLocaleDateString("fr-FR"),
    ].join(";");
  });

  const csvContent = "\uFEFF" + [header.join(";"), ...rows].join("\r\n");
  const filename = `sauvegarde_cabinet_patients_${new Date().toISOString().split("T")[0]}.csv`;

  return {
    success: true,
    csv: csvContent,
    count: clinicPatients.length,
    filename,
  };
}

export async function requestSubscriptionChange(input: {
  plan: "standard" | "pro";
  cycle: "monthly" | "quarterly" | "yearly";
}) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string; email?: string; name?: string } | undefined;
    if (!user || user.role !== "doctor") {
      return { error: "Action réservée au praticien titulaire du cabinet." };
    }

    const clinicId = await getTenantClinicId(true);
    const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);
    if (!clinic) {
      return { error: "Cabinet introuvable." };
    }

    const plan = input.plan === "standard" ? "standard" : "pro";
    const cycle = input.cycle === "yearly" ? "yearly" : input.cycle === "quarterly" ? "quarterly" : "monthly";

    // Tarifs officiels MonCabinet
    const price =
      plan === "standard"
        ? cycle === "yearly"
          ? 1900
          : cycle === "quarterly"
          ? 550
          : 200
        : cycle === "yearly"
        ? 2500
        : cycle === "quarterly"
        ? 700
        : 250;

    const pendingPayload = {
      requestedPlan: plan,
      requestedCycle: cycle,
      requestedPrice: price,
      requestedAt: new Date().toISOString(),
      status: "pending",
      requestedBy: user.email || user.name || "Médecin",
    };

    await db
      .update(clinics)
      .set({
        pendingPlanChange: pendingPayload,
      })
      .where(eq(clinics.id, clinicId));

    // Envoyer la notification email à l'administrateur
    sendPlanChangeRequestNotification({
      clinicName: clinic.name,
      doctorName: user.name || "Dr. Praticien",
      doctorEmail: user.email || clinic.phone || "",
      doctorPhone: clinic.phone || "",
      currentPlan: clinic.plan || "standard",
      currentCycle: clinic.billingCycle || "monthly",
      requestedPlan: plan,
      requestedCycle: cycle,
      requestedPrice: price,
    }).catch((err) => console.error("[EMAIL NOTIF ERROR]", err));

    revalidatePath("/dashboard/settings");
    revalidatePath("/admin");

    return {
      success: true,
      message: "Votre demande de modification d'abonnement a été transmise à l'administrateur.",
    };
  } catch (error: any) {
    console.error("[REQUEST_SUBSCRIPTION_CHANGE_ERROR]", error);
    return { error: error.message || "Erreur lors de la demande de modification." };
  }
}
