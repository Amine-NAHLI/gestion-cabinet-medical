"use server";

import { db } from "@/db";
import { patients, visits } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { ilike, or, eq } from "drizzle-orm";

export async function addPatientAndVisit(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const phone = formData.get("phone") as string;
  const age = parseInt(formData.get("age") as string);
  const mutuelle = formData.get("mutuelle") as string;

  try {
    const [newPatient] = await db.insert(patients).values({
      firstName,
      lastName,
      phone,
      age,
      mutuelle: mutuelle || null,
    }).returning();

    await db.insert(visits).values({
      patientId: newPatient.id,
      status: "waiting",
    });

    revalidatePath("/dashboard/queue");
    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error) {
    console.error("Erreur lors de l'ajout:", error);
    return { success: false, error: "Erreur lors de l'enregistrement." };
  }
}

export async function sendPatientToDoctor(visitId: number) {
  try {
    await db.update(visits)
      .set({ status: 'ready' })
      .where(eq(visits.id, visitId));
    revalidatePath("/dashboard/queue");
    return { success: true };
  } catch (error) {
    console.error("Erreur d'envoi au médecin:", error);
    return { success: false, error: "Erreur lors de la mise à jour du statut." };
  }
}
