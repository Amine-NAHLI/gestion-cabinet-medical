"use server";

import { db } from "@/db";
import { clinicMessages, clinics, users } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getTenantClinicId } from "@/lib/tenant";

const DEFAULT_DOCTOR_QUICK_MESSAGES = [
  "Faites entrer le patient suivant",
  "Merci de préparer le dossier",
  "J'ai environ 10 min de retard",
  "Patient à préparer pour soins",
];

const DEFAULT_ASSISTANT_QUICK_MESSAGES = [
  "Le patient de l'heure est en salle",
  "Appel urgent en attente au standard",
  "Une urgence s'est présentée à l'accueil",
  "Dossier patient prêt sur votre bureau",
];

export async function getInternalChatData() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const userSession = session.user as { id?: string; role?: string; name?: string };
  const role = userSession.role || "assistant";
  const clinicId = await getTenantClinicId();

  // 1. Récupérer les 80 derniers messages du cabinet
  const messages = await db
    .select()
    .from(clinicMessages)
    .where(eq(clinicMessages.clinicId, clinicId))
    .orderBy(asc(clinicMessages.createdAt))
    .limit(80);

  // 2. Récupérer les raccourcis personnalisés du cabinet pour le rôle actuel
  const [clinic] = await db
    .select({
      quickMessagesDoctor: clinics.quickMessagesDoctor,
      quickMessagesAssistant: clinics.quickMessagesAssistant,
    })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  let quickMessages: string[] = [];
  if (role === "doctor") {
    quickMessages = Array.isArray(clinic?.quickMessagesDoctor) && clinic.quickMessagesDoctor.length > 0
      ? (clinic.quickMessagesDoctor as string[])
      : DEFAULT_DOCTOR_QUICK_MESSAGES;
  } else {
    quickMessages = Array.isArray(clinic?.quickMessagesAssistant) && clinic.quickMessagesAssistant.length > 0
      ? (clinic.quickMessagesAssistant as string[])
      : DEFAULT_ASSISTANT_QUICK_MESSAGES;
  }

  // 3. Calculer les non-lus pour l'utilisateur actuel (messages envoyés par l'autre rôle et non lus)
  const unreadCount = messages.filter((m) => m.senderRole !== role && !m.isRead).length;

  return {
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      senderRole: m.senderRole,
      content: m.content,
      isRead: m.isRead,
      createdAt: m.createdAt.toISOString(),
      isMe: m.senderId === parseInt(userSession.id || "0"),
    })),
    quickMessages,
    unreadCount,
    currentUserId: parseInt(userSession.id || "0"),
    currentRole: role,
  };
}

export async function sendInternalMessage(content: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const userSession = session.user as { id?: string; role?: string; name?: string };
  const text = content.trim();
  if (!text) return { success: false, error: "Message vide" };

  const clinicId = await getTenantClinicId();
  const userId = parseInt(userSession.id || "0");
  const userName = userSession.name || (userSession.role === "doctor" ? "Médecin" : "Assistante");
  const userRole = userSession.role || "assistant";

  const [created] = await db
    .insert(clinicMessages)
    .values({
      clinicId,
      senderId: userId,
      senderName: userName,
      senderRole: userRole,
      content: text,
      isRead: false,
    })
    .returning();

  return {
    success: true,
    message: {
      id: created.id,
      senderId: created.senderId,
      senderName: created.senderName,
      senderRole: created.senderRole,
      content: created.content,
      isRead: created.isRead,
      createdAt: created.createdAt.toISOString(),
      isMe: true,
    },
  };
}

export async function markInternalMessagesAsRead() {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false };

  const userSession = session.user as { role?: string };
  const role = userSession.role || "assistant";
  const clinicId = await getTenantClinicId();

  // Marquer comme lus tous les messages reçus de l'autre rôle
  await db
    .update(clinicMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(clinicMessages.clinicId, clinicId),
        eq(clinicMessages.isRead, false)
      )
    );

  return { success: true };
}

export async function clearInternalMessages() {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();
  await db.delete(clinicMessages).where(eq(clinicMessages.clinicId, clinicId));

  return { success: true };
}

export async function saveQuickMessages(messages: string[]) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const userSession = session.user as { role?: string };
  const role = userSession.role || "assistant";
  const clinicId = await getTenantClinicId();

  const sanitized = messages
    .map((m) => m.trim())
    .filter((m) => m.length > 0)
    .slice(0, 15); // Max 15 raccourcis

  if (role === "doctor") {
    await db
      .update(clinics)
      .set({ quickMessagesDoctor: sanitized })
      .where(eq(clinics.id, clinicId));
  } else {
    await db
      .update(clinics)
      .set({ quickMessagesAssistant: sanitized })
      .where(eq(clinics.id, clinicId));
  }

  return { success: true, quickMessages: sanitized };
}
