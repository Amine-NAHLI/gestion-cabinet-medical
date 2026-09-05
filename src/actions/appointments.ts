"use server";

import { db } from "@/db";
import { appointments, visits } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export async function createAppointment(patientId: number, dateStr: string) {
  try {
    await db.insert(appointments).values({
      patientId,
      date: new Date(dateStr)
    });
    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    console.error("Erreur de création de rendez-vous:", error);
    return { success: false, error: "Erreur" };
  }
}

export async function transformAppointmentToVisit(appointmentId: number, patientId: number) {
  try {
    // Créer une visite dans la file d'attente
    await db.insert(visits).values({
      patientId,
      status: "waiting",
      isAppointment: true
    });
    // Supprimer le rendez-vous
    await db.delete(appointments).where(eq(appointments.id, appointmentId));
    
    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    console.error("Erreur de transformation:", error);
    return { success: false, error: "Erreur" };
  }
}
