"use server";

import { db } from "@/db";
import { clinicSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function getClinicSettings() {
  try {
    const list = await db.select().from(clinicSettings).limit(1);
    if (list.length > 0) {
      return list[0];
    }
    // Return default values if table is empty
    return {
      id: 1,
      clinicName: "Cabinet Médical Dr. Vance",
      doctorName: "Dr. Amine Vance",
      specialty: "Médecine Générale",
      phone: "05 22 45 67 89",
      email: "contact@medicabinet.ma",
      address: "120 Boulevard d'Anfa, 4ème étage",
      city: "Casablanca",
      orderNumber: "INPE: 045812903 • Ordre: 14209",
      taxId: "ICE: 002938475000012 • IF: 45091823",
      defaultFee: "250.00",
      updatedAt: new Date(),
    };
  } catch (e) {
    console.error("Erreur récupération paramètres:", e);
    return {
      id: 1,
      clinicName: "Cabinet Médical Dr. Vance",
      doctorName: "Dr. Amine Vance",
      specialty: "Médecine Générale",
      phone: "05 22 45 67 89",
      email: "contact@medicabinet.ma",
      address: "120 Boulevard d'Anfa, 4ème étage",
      city: "Casablanca",
      orderNumber: "INPE: 045812903 • Ordre: 14209",
      taxId: "ICE: 002938475000012 • IF: 45091823",
      defaultFee: "250.00",
      updatedAt: new Date(),
    };
  }
}

export async function updateClinicSettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: "Non autorisé" };
  }

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
    const list = await db.select().from(clinicSettings).limit(1);
    if (list.length > 0) {
      await db.update(clinicSettings)
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

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    console.error("Erreur mise à jour paramètres:", error);
    return { success: false, error: "Erreur lors de l'enregistrement des paramètres." };
  }
}
