"use server";

import { db } from "@/db";
import { visits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getTenantClinicId } from "@/lib/tenant";

export async function processPayment(
  visitId: number,
  amountToPay?: number,
  paymentMethod: string = "cash"
) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  try {
    const updateData: any = {
      paymentStatus: "paid",
      paidAt: new Date(),
      paymentMethod: paymentMethod || "cash",
    };
    if (amountToPay !== undefined && !isNaN(amountToPay)) {
      updateData.amountToPay = amountToPay.toFixed(2);
    }

    await db
      .update(visits)
      .set(updateData)
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)));
    
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/history");
    return { success: true };
  } catch (error) {
    console.error("Erreur enregistrement encaissement:", error);
    return { success: false, error: "Erreur lors de l'encaissement." };
  }
}
