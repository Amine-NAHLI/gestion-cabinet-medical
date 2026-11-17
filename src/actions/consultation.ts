"use server";

import { db } from "@/db";
import { visits, prescriptions, customMedications, patients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getTenantClinicId } from "@/lib/tenant";

export async function updateMedicalNotes(visitId: number, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  const disease = (formData.get("disease") as string || "").trim() || null;
  const diagnosis = (formData.get("diagnosis") as string || "").trim() || null;
  const notes = (formData.get("notes") as string || "").trim() || null;
  const bloodPressure = (formData.get("bloodPressure") as string || "").trim() || null;
  const heartRate = parseInt(formData.get("heartRate") as string) || null;
  const temperature = formData.get("temperature") as string || null;
  const weight = formData.get("weight") as string || null;
  const height = formData.get("height") as string || null;

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
      })
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)));
    
    revalidatePath(`/dashboard/consultation/${visitId}`);
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

  const finalAmount = amountToPay !== null && !isNaN(amountToPay) && amountToPay >= 0 
    ? amountToPay.toFixed(2) 
    : "0.00";

  try {
    await db
      .update(visits)
      .set({ 
        amountToPay: finalAmount, 
        status: "finished", 
        paymentStatus: amountToPay === 0 ? "paid" : "pending",
        paymentMethod: paymentMethod || "cash",
        paidAt: amountToPay === 0 ? new Date() : null,
      })
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)));
    
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/history");
    revalidatePath("/dashboard/payments");
    return { success: true };
  } catch (error) {
    console.error("Erreur clôture consultation:", error);
    return { success: false, error: "Erreur lors de la clôture de la consultation." };
  }
}
