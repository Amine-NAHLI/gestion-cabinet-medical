"use server";

import { db } from "@/db";
import { visits, prescriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateMedicalNotes(visitId: number, formData: FormData) {
  const disease = formData.get("disease") as string;
  const diagnosis = formData.get("diagnosis") as string;
  const notes = formData.get("notes") as string;

  await db.update(visits)
    .set({ disease, diagnosis, notes, status: "consulting" })
    .where(eq(visits.id, visitId));
  
  revalidatePath(`/dashboard/consultation/${visitId}`);
}

export async function savePrescription(visitId: number, medicines: { name: string; instructions: string }[]) {
  await db.delete(prescriptions).where(eq(prescriptions.visitId, visitId));
  await db.insert(prescriptions).values({
    visitId,
    medicines,
  });
  
  revalidatePath(`/dashboard/consultation/${visitId}`);
}

export async function finishConsultation(visitId: number, amountToPay: number | null) {
  await db.update(visits)
    .set({ 
      amountToPay: amountToPay !== null && !isNaN(amountToPay) ? amountToPay.toString() : null, 
      status: "finished", 
      paymentStatus: "pending" 
    })
    .where(eq(visits.id, visitId));
  
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
