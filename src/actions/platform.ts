"use server";

import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

export interface PlatformSettingsData {
  supportWhatsapp: string;
  supportWhatsappMessage: string;
  supportEmail: string;
  supportPhone: string;
}

// Récupérer les paramètres globaux de la plateforme (WhatsApp, contact, support)
export async function getPlatformSettings(): Promise<PlatformSettingsData> {
  try {
    const [existing] = await db
      .select({
        supportWhatsapp: platformSettings.supportWhatsapp,
        supportWhatsappMessage: platformSettings.supportWhatsappMessage,
        supportEmail: platformSettings.supportEmail,
        supportPhone: platformSettings.supportPhone,
      })
      .from(platformSettings)
      .where(eq(platformSettings.id, 1))
      .limit(1);

    if (existing) {
      return {
        supportWhatsapp: existing.supportWhatsapp,
        supportWhatsappMessage: existing.supportWhatsappMessage,
        supportEmail: existing.supportEmail,
        supportPhone: existing.supportPhone || "",
      };
    }

    // Valeurs par défaut si non trouvé
    return {
      supportWhatsapp: "+212600000000",
      supportWhatsappMessage: "Bonjour, je vous contacte concernant l'abonnement de mon cabinet MonCabinet.",
      supportEmail: "contact@toncabinet.me",
      supportPhone: "+212600000000",
    };
  } catch (error) {
    console.error("[GET_PLATFORM_SETTINGS_ERROR]", error);
    return {
      supportWhatsapp: "+212600000000",
      supportWhatsappMessage: "Bonjour, je vous contacte concernant l'abonnement de mon cabinet MonCabinet.",
      supportEmail: "contact@toncabinet.me",
      supportPhone: "+212600000000",
    };
  }
}

// Mettre à jour les paramètres de support (Super Admin uniquement)
export async function updatePlatformSettings(data: Partial<PlatformSettingsData>) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string; email?: string } | undefined;

    if (!user || user.role !== "superadmin") {
      return { error: "Accès non autorisé. Réservé au Super Administrateur." };
    }

    const cleanWhatsapp = (data.supportWhatsapp || "+212600000000").trim();
    const cleanMessage = (data.supportWhatsappMessage || "").trim();
    const cleanEmail = (data.supportEmail || "contact@toncabinet.me").trim();
    const cleanPhone = (data.supportPhone || "").trim();

    const [existing] = await db
      .select({ id: platformSettings.id })
      .from(platformSettings)
      .where(eq(platformSettings.id, 1))
      .limit(1);

    if (existing) {
      await db
        .update(platformSettings)
        .set({
          supportWhatsapp: cleanWhatsapp,
          supportWhatsappMessage: cleanMessage,
          supportEmail: cleanEmail,
          supportPhone: cleanPhone,
          updatedAt: new Date(),
        })
        .where(eq(platformSettings.id, 1));
    } else {
      await db.insert(platformSettings).values({
        id: 1,
        supportWhatsapp: cleanWhatsapp,
        supportWhatsappMessage: cleanMessage,
        supportEmail: cleanEmail,
        supportPhone: cleanPhone,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

    return { success: true, message: "Configuration du support enregistrée avec succès." };
  } catch (error: any) {
    console.error("[UPDATE_PLATFORM_SETTINGS_ERROR]", error);
    return { error: error.message || "Erreur lors de la mise à jour des paramètres du support." };
  }
}
