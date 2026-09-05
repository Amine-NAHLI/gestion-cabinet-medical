"use server";

import { db } from "@/db";
import { visits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function processPayment(visitId: number, amountToPay?: number) {
  const updateData: any = { paymentStatus: "paid" };
  if (amountToPay !== undefined) {
    updateData.amountToPay = amountToPay.toString();
  }

  await db.update(visits)
    .set(updateData)
    .where(eq(visits.id, visitId));
  
  revalidatePath("/dashboard", "layout");
}
