"use server";

import { db } from "@/db";
import { clinicSettings, clinics, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getTenantClinicId } from "@/lib/tenant";

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
    const list = await db
      .select()
      .from(clinicSettings)
      .where(eq(clinicSettings.clinicId, clinicId))
      .limit(1);

    if (list.length > 0) {
      return list[0];
    }

    // Récupérer les informations réelles de la clinique et du praticien
    const clinicRows = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);
    const doctorRows = await db
      .select()
      .from(users)
      .where(and(eq(users.clinicId, clinicId), eq(users.role, "doctor")))
      .limit(1);

    const c = clinicRows[0];
    const d = doctorRows[0];

    const fallback = {
      id: clinicId,
      clinicId,
      clinicName: c?.name || "Cabinet Médical",
      doctorName: d?.name ? (d.name.toLowerCase().startsWith("dr") ? d.name : `Dr. ${d.name}`) : "Dr. Praticien",
      specialty: "Médecine Générale",
      phone: c?.phone || d?.phone || "05 22 00 00 00",
      email: d?.email || "contact@cabinet.ma",
      address: c?.address || "Adresse du cabinet",
      city: c?.city || "Casablanca",
      orderNumber: "INPE: 123456789 • Ordre: 9876",
      taxId: "ICE: 001234567000089 • IF: 12345678",
      defaultFee: "250.00",
      updatedAt: new Date(),
    };

    return fallback;
  } catch (e) {
    console.error("Erreur récupération paramètres cabinet:", e);
    return {
      id: clinicId,
      clinicId,
      clinicName: "Cabinet Médical",
      doctorName: "Dr. Praticien",
      specialty: "Médecine Générale",
      phone: "05 22 00 00 00",
      email: "contact@cabinet.ma",
      address: "Adresse du cabinet",
      city: "Casablanca",
      orderNumber: "INPE: 123456789 • Ordre: 9876",
      taxId: "ICE: 001234567000089 • IF: 12345678",
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

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Erreur mise à jour paramètres:", error);
    return { success: false, error: "Erreur lors de l'enregistrement des paramètres." };
  }
}
