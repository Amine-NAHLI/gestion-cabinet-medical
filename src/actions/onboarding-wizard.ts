"use server";

import { db } from "@/db";
import { clinics, users } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getTenantClinicId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "dashboard",
  "login",
  "logout",
  "register",
  "settings",
  "stats",
  "help",
  "support",
  "moncabinet",
  "toncabinet",
  "mail",
  "billing",
  "www",
  "root",
]);

function cleanSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Enlever accents
    .replace(/[^a-z0-9-]/g, "-") // Remplacer espaces et caractères spéciaux par des tirets
    .replace(/-+/g, "-") // Pas de doubles tirets
    .replace(/^-|-$/g, ""); // Enlever tirets début/fin
}

export async function checkSlugAvailability(rawSlug: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { available: false, error: "Non autorisé" };
  }

  const user = session.user as { clinicId?: number };
  const currentClinicId = user?.clinicId;

  const slug = cleanSlug(rawSlug);

  if (slug.length < 3) {
    return {
      available: false,
      slug,
      error: "L'identifiant doit comporter au moins 3 caractères.",
    };
  }

  if (slug.length > 30) {
    return {
      available: false,
      slug,
      error: "L'identifiant ne doit pas dépasser 30 caractères.",
    };
  }

  if (RESERVED_SLUGS.has(slug)) {
    return {
      available: false,
      slug,
      error: "Ce nom est réservé par le système. Choisissez un autre identifiant.",
    };
  }

  // Vérifier en base si ce slug est déjà pris par un AUTRE cabinet
  const existing = await db
    .select({ id: clinics.id, slug: clinics.slug })
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);

  if (existing.length > 0 && (!currentClinicId || existing[0].id !== currentClinicId)) {
    return {
      available: false,
      slug,
      error: "Cet identifiant est déjà utilisé par un autre cabinet.",
      suggestions: [`${slug}-med`, `dr-${slug}`, `${slug}-cabinet`],
    };
  }

  return {
    available: true,
    slug,
  };
}

export async function getDoctorOnboardingData() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const userSession = session.user as { id?: string; role?: string; clinicId?: number; email?: string };
  if (userSession.role !== "doctor") return null;

  const clinicId = await getTenantClinicId();

  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);
  const [doctor] = await db.select().from(users).where(eq(users.id, parseInt(userSession.id || "0"))).limit(1);

  if (!clinic || !doctor) return null;

  return {
    clinic: {
      id: clinic.id,
      name: clinic.name,
      city: clinic.city,
      slug: clinic.slug || "",
      logoUrl: clinic.logoUrl || null,
      primaryColor: clinic.primaryColor || "#0f172a",
      isCommunityMember: clinic.isCommunityMember || false,
    },
    doctor: {
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone || "",
      avatarUrl: doctor.avatarUrl || null,
      bio: doctor.bio || "",
      isOnboarded: doctor.isOnboarded || false,
    },
  };
}

export async function completeDoctorOnboarding(data: {
  slug: string;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  primaryColor?: string | null;
  isCommunityMember: boolean;
  bio?: string | null;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: "Non autorisé" };
  }

  const userSession = session.user as { id?: string; role?: string; clinicId?: number };
  if (userSession.role !== "doctor") {
    return { success: false, error: "Réservé au médecin titulaire" };
  }

  const clinicId = await getTenantClinicId();
  const userId = parseInt(userSession.id || "0");

  // Vérifier et nettoyer le slug
  const slugCheck = await checkSlugAvailability(data.slug);
  if (!slugCheck.available || !slugCheck.slug) {
    return { success: false, error: slugCheck.error || "Identifiant invalide" };
  }

  const validSlug: string = slugCheck.slug;
  const primaryColor = data.primaryColor?.trim() || "#0f172a";

  // 1. Mettre à jour la clinique
  await db
    .update(clinics)
    .set({
      slug: validSlug,
      logoUrl: data.logoUrl || null,
      primaryColor,
      isCommunityMember: !!data.isCommunityMember,
      quickMessagesDoctor: [
        "Faites entrer le patient suivant",
        "Merci de préparer le dossier",
        "J'ai environ 10 min de retard",
        "Patient à préparer pour soins",
      ],
      quickMessagesAssistant: [
        "Le patient de l'heure est en salle",
        "Appel urgent en attente au standard",
        "Une urgence s'est présentée à l'accueil",
      ],
    })
    .where(eq(clinics.id, clinicId));

  // 2. Mettre à jour l'utilisateur médecin
  await db
    .update(users)
    .set({
      avatarUrl: data.avatarUrl || null,
      bio: data.bio || null,
      isOnboarded: true,
    })
    .where(eq(users.id, userId));

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function completeAssistantOnboarding(data: { avatarUrl?: string | null }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: "Non autorisé" };
  }

  const userSession = session.user as { id?: string };
  const userId = parseInt(userSession.id || "0");

  await db
    .update(users)
    .set({
      avatarUrl: data.avatarUrl || null,
      isOnboarded: true,
    })
    .where(eq(users.id, userId));

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function markTourAsSeen() {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false };

  const userSession = session.user as { id?: string };
  const userId = parseInt(userSession.id || "0");
  if (!userId) return { success: false };

  try {
    const [user] = await db
      .select({ notificationPreferences: users.notificationPreferences })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const prefs = (user?.notificationPreferences as any) || {};
    await db
      .update(users)
      .set({
        notificationPreferences: {
          ...prefs,
          hasSeenTour: true,
        },
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch {
    return { success: false };
  }
}
