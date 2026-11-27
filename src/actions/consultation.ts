"use server";

import { db } from "@/db";
import { visits, prescriptions, customMedications, patients, appointments } from "@/db/schema";
import { eq, and, ne, desc, gte, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getTenantClinicId } from "@/lib/tenant";

export async function updateMedicalNotes(visitId: number, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  const parseNumericStr = (val: FormDataEntryValue | null) => {
    const cleaned = ((val as string) || "").trim().replace(",", ".");
    if (!cleaned || isNaN(Number(cleaned))) return null;
    return cleaned;
  };

  const disease = ((formData.get("disease") as string) || "").trim() || null;
  const diagnosis = ((formData.get("diagnosis") as string) || "").trim() || null;
  const notes = ((formData.get("notes") as string) || "").trim() || null;
  const bloodPressure = ((formData.get("bloodPressure") as string) || "").trim() || null;
  const heartRateRaw = parseInt(((formData.get("heartRate") as string) || "").trim(), 10);
  const heartRate = !isNaN(heartRateRaw) ? heartRateRaw : null;
  const temperature = parseNumericStr(formData.get("temperature"));
  const weight = parseNumericStr(formData.get("weight"));
  const height = parseNumericStr(formData.get("height"));

  let customData: unknown = null;
  const customDataRaw = formData.get("customData") as string | null;
  if (customDataRaw) {
    try {
      const parsed = JSON.parse(customDataRaw);
      if (Array.isArray(parsed)) {
        customData = parsed;
      }
    } catch {
      customData = null;
    }
  }

  try {
    await db
      .update(visits)
      .set({
        disease,
        diagnosis,
        notes,
        bloodPressure,
        heartRate,
        temperature,
        weight,
        height,
        customData,
      })
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)));

    revalidatePath(`/dashboard/consultation/${visitId}`);
    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error) {
    console.error("Erreur mise à jour notes médicales:", error);
    return { success: false, error: "Erreur lors de l'enregistrement de l'examen." };
  }
}

export async function savePrescription(
  visitId: number,
  medicines: { name: string; instructions: string }[]
) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  try {
    // 1. Vérifier que la visite appartient à ce cabinet
    const visitCheck = await db
      .select({ id: visits.id })
      .from(visits)
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)))
      .limit(1);

    if (visitCheck.length === 0) {
      return { success: false, error: "Visite introuvable dans ce cabinet." };
    }

    // 2. Enregistrer ou remplacer l'ordonnance
    await db.delete(prescriptions).where(eq(prescriptions.visitId, visitId));
    if (medicines.length > 0) {
      await db.insert(prescriptions).values({
        clinicId,
        visitId,
        medicines,
      });

      // 3. Persister les médicaments dans la base du cabinet
      for (const med of medicines) {
        if (med.name && med.name.trim().length > 1) {
          const medName = med.name.trim();
          const existing = await db
            .select()
            .from(customMedications)
            .where(and(eq(customMedications.clinicId, clinicId), eq(customMedications.name, medName)))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(customMedications).values({
              clinicId,
              name: medName,
              defaultInstructions: med.instructions || null,
            }).catch(() => {});
          }
        }
      }
    }
    
    revalidatePath(`/dashboard/consultation/${visitId}`);
    return { success: true };
  } catch (error) {
    console.error("Erreur enregistrement ordonnance:", error);
    return { success: false, error: "Erreur lors de l'enregistrement de l'ordonnance." };
  }
}

export async function finishConsultation(
  visitId: number,
  amountToPay: number | null,
  paymentMethod: string = "cash"
) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  const isFree = amountToPay === 0 || paymentMethod === "free";
  const finalAmount = !isFree && amountToPay !== null && !isNaN(amountToPay) && amountToPay > 0 
    ? amountToPay.toFixed(2) 
    : "0.00";

  try {
    const [finishedVisit] = await db
      .update(visits)
      .set({ 
        amountToPay: finalAmount, 
        status: "finished", 
        paymentStatus: isFree ? "paid" : "pending",
        paymentMethod: isFree ? "free" : (paymentMethod || "cash"),
        paidAt: isFree ? new Date() : null,
      })
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)))
      .returning({ patientId: visits.patientId, createdAt: visits.createdAt });

    if (finishedVisit) {
      // Clôturer automatiquement le rendez-vous correspondant d'aujourd'hui s'il existe
      const startOfDay = new Date(finishedVisit.createdAt);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      await db
        .update(appointments)
        .set({ status: "completed" })
        .where(
          and(
            eq(appointments.clinicId, clinicId),
            eq(appointments.patientId, finishedVisit.patientId),
            ne(appointments.status, "cancelled"),
            gte(appointments.date, startOfDay),
            lt(appointments.date, endOfDay)
          )
        );
    }
    
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/history");
    revalidatePath("/dashboard/payments");
    return { success: true };
  } catch (error) {
    console.error("Erreur clôture consultation:", error);
    return { success: false, error: "Erreur lors de la clôture de la consultation." };
  }
}

export async function markConsultationActive(visitId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false };

  const clinicId = await getTenantClinicId();

  try {
    await db
      .update(visits)
      .set({ status: "consulting" })
      .where(
        and(
          eq(visits.id, visitId),
          eq(visits.clinicId, clinicId),
          ne(visits.status, "finished"),
          ne(visits.status, "cancelled")
        )
      );

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    console.error("Erreur activation consultation:", error);
    return { success: false };
  }
}

export async function getActiveConsultation() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "doctor") return null;

  const clinicId = await getTenantClinicId();

  try {
    const activeVisits = await db
      .select({
        id: visits.id,
        createdAt: visits.createdAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientAge: patients.age,
        patientPhone: patients.phone,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(
        and(
          eq(visits.clinicId, clinicId),
          eq(visits.status, "consulting")
        )
      )
      .orderBy(desc(visits.createdAt))
      .limit(1);

    if (activeVisits.length === 0) return null;

    const active = activeVisits[0];
    return {
      visitId: active.id,
      patientName: `${active.patientLastName} ${active.patientFirstName}`,
      patientAge: active.patientAge,
      patientPhone: active.patientPhone,
      sinceTime: new Date(active.createdAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  } catch (error) {
    console.error("Erreur récupération consultation active:", error);
    return null;
  }
}

export interface ClinicalDocument {
  id: string;
  title: string;
  type: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  notes?: string | null;
  createdAt: string;
}

export async function addVisitDocument(
  visitId: number,
  document: {
    title: string;
    type: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileType?: string | null;
    notes?: string | null;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  try {
    const visitRes = await db
      .select({ id: visits.id, documents: visits.documents })
      .from(visits)
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)))
      .limit(1);

    if (visitRes.length === 0) {
      return { success: false, error: "Consultation introuvable." };
    }

    const currentDocs: ClinicalDocument[] = Array.isArray(visitRes[0].documents)
      ? (visitRes[0].documents as any)
      : [];

    const newDoc: ClinicalDocument = {
      id: "doc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      title: document.title.trim() || "Document médical",
      type: document.type || "autre",
      fileUrl: document.fileUrl || null,
      fileName: document.fileName || null,
      fileType: document.fileType || null,
      notes: document.notes?.trim() || null,
      createdAt: new Date().toISOString(),
    };

    const updatedDocs = [newDoc, ...currentDocs];

    await db
      .update(visits)
      .set({ documents: updatedDocs })
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)));

    revalidatePath(`/dashboard/consultation/${visitId}`);
    revalidatePath("/dashboard/history");
    return { success: true, document: newDoc };
  } catch (error) {
    console.error("Erreur ajout document:", error);
    return { success: false, error: "Erreur lors de l'enregistrement du document." };
  }
}

export async function deleteVisitDocument(visitId: number, documentId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  try {
    const visitRes = await db
      .select({ id: visits.id, documents: visits.documents })
      .from(visits)
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)))
      .limit(1);

    if (visitRes.length === 0) {
      return { success: false, error: "Consultation introuvable." };
    }

    const currentDocs: ClinicalDocument[] = Array.isArray(visitRes[0].documents)
      ? (visitRes[0].documents as any)
      : [];

    const updatedDocs = currentDocs.filter((d) => d.id !== documentId);

    await db
      .update(visits)
      .set({ documents: updatedDocs })
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)));

    revalidatePath(`/dashboard/consultation/${visitId}`);
    revalidatePath("/dashboard/history");
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression document:", error);
    return { success: false, error: "Erreur lors de la suppression du document." };
  }
}
