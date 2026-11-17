"use server";

import { db } from "@/db";
import { appointments, visits, patients } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, asc, desc, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getTenantClinicId } from "@/lib/tenant";

export async function createAppointment(
  patientId: number,
  dateStr: string,
  timeStr: string = "09:00",
  reason: string = "Consultation générale"
) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  try {
    const targetDate = new Date(dateStr);
    await db.insert(appointments).values({
      clinicId,
      patientId,
      date: targetDate,
      time: timeStr,
      reason: reason || "Consultation générale",
      status: "scheduled",
    });

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    console.error("Erreur de création de rendez-vous:", error);
    return { success: false, error: "Erreur lors de la programmation du rendez-vous." };
  }
}

export async function createNewPatientAndAppointment(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  const firstName = (formData.get("firstName") as string || "").trim();
  const lastName = (formData.get("lastName") as string || "").trim();
  const phone = (formData.get("phone") as string || "").trim();
  const age = parseInt(formData.get("age") as string) || 0;
  const mutuelle = (formData.get("mutuelle") as string || "").trim() || null;
  const cin = (formData.get("cin") as string || "").trim() || null;
  const dateStr = formData.get("date") as string;
  const timeStr = (formData.get("time") as string || "09:30").trim();
  const reason = (formData.get("reason") as string || "Consultation générale").trim();

  try {
    // 1. Chercher si le patient existe déjà dans ce cabinet
    let targetPatientId: number | null = null;
    if (cin) {
      const existing = await db
        .select()
        .from(patients)
        .where(and(eq(patients.clinicId, clinicId), eq(patients.cin, cin)))
        .limit(1);
      if (existing.length > 0) targetPatientId = existing[0].id;
    }
    if (!targetPatientId && phone) {
      const existing = await db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            eq(patients.phone, phone),
            eq(patients.lastName, lastName)
          )
        )
        .limit(1);
      if (existing.length > 0) targetPatientId = existing[0].id;
    }

    if (!targetPatientId) {
      const [newPatient] = await db
        .insert(patients)
        .values({
          clinicId,
          firstName,
          lastName,
          phone,
          age,
          mutuelle,
          cin,
        })
        .returning();
      targetPatientId = newPatient.id;
    }

    // 2. Créer le rendez-vous pour ce cabinet
    const appointmentDate = new Date(dateStr);
    await db.insert(appointments).values({
      clinicId,
      patientId: targetPatientId,
      date: appointmentDate,
      time: timeStr,
      reason,
      status: "scheduled",
    });

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    console.error("Erreur création patient & RDV:", error);
    return { success: false, error: "Impossible de créer le rendez-vous." };
  }
}

export async function transformAppointmentToVisit(appointmentId: number, patientId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  try {
    // 1. Créer une visite dans la file d'attente d'aujourd'hui pour ce cabinet
    await db.insert(visits).values({
      clinicId,
      patientId,
      status: "waiting",
      isAppointment: true,
    });

    // 2. Mettre à jour le statut du RDV de ce cabinet
    await db
      .update(appointments)
      .set({ status: "admitted" })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, clinicId)));
    
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/queue");
    return { success: true };
  } catch (error) {
    console.error("Erreur de transformation RDV en visite:", error);
    return { success: false, error: "Erreur lors de l'admission du rendez-vous." };
  }
}

export async function cancelAppointment(appointmentId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  try {
    await db
      .update(appointments)
      .set({ status: "cancelled" })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, clinicId)));

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    console.error("Erreur annulation RDV:", error);
    return { success: false, error: "Erreur lors de l'annulation." };
  }
}
