"use server";

import { db } from "@/db";
import {
  users,
  clinics,
  communityMessages,
  communityPosts,
  clinicMessages,
  visits,
  patients,
} from "@/db/schema";
import { eq, and, desc, ne, gte } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getTenantClinicId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  AppNotification,
} from "@/lib/notificationsConfig";

export type { NotificationPreferences, AppNotification };

// 1. Récupérer les préférences de notification de l'utilisateur actuel
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const session = await getServerSession(authOptions);
  if (!session) return DEFAULT_NOTIFICATION_PREFERENCES;

  const userSession = session.user as { id?: string };
  const userId = parseInt(userSession.id || "0");
  if (!userId) return DEFAULT_NOTIFICATION_PREFERENCES;

  try {
    const [user] = await db
      .select({ notificationPreferences: users.notificationPreferences })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user?.notificationPreferences && typeof user.notificationPreferences === "object") {
      const saved = user.notificationPreferences as Partial<NotificationPreferences>;
      return {
        communityPosts: saved.communityPosts ?? true,
        communityMessages: saved.communityMessages ?? true,
        clinicMessages: saved.clinicMessages ?? true,
        queueArrivals: saved.queueArrivals ?? true,
        soundEnabled: saved.soundEnabled ?? true,
        readNotificationIds: Array.isArray(saved.readNotificationIds)
          ? saved.readNotificationIds
          : [],
      };
    }
  } catch (err) {
    console.error("Erreur getNotificationPreferences:", err);
  }

  return DEFAULT_NOTIFICATION_PREFERENCES;
}

// 2. Mettre à jour les préférences de notification
export async function updateNotificationPreferences(preferences: NotificationPreferences) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const userSession = session.user as { id?: string };
  const userId = parseInt(userSession.id || "0");
  if (!userId) return { success: false, error: "Utilisateur introuvable" };

  try {
    await db
      .update(users)
      .set({ notificationPreferences: preferences })
      .where(eq(users.id, userId));

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("Erreur updateNotificationPreferences:", err);
    return { success: false, error: "Erreur lors de la sauvegarde" };
  }
}

// 3. Récupérer les notifications actives pour le compte connecté
export async function getActiveNotifications(): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
}> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { notifications: [], unreadCount: 0, preferences: DEFAULT_NOTIFICATION_PREFERENCES };
  }

  const userSession = session.user as { id?: string; role?: string };
  const userId = parseInt(userSession.id || "0");
  const role = userSession.role || "assistant";
  const isDoctor = role === "doctor";

  let clinicId = 1;
  try {
    clinicId = await getTenantClinicId(false);
  } catch {
    clinicId = 1;
  }

  const preferences = await getNotificationPreferences();
  const readIds = new Set<string>(preferences.readNotificationIds || []);
  const notifList: AppNotification[] = [];

  try {
    // A) MESSAGES DIRECTS CONFRATERNELS (Médecins uniquement)
    if (isDoctor && preferences.communityMessages) {
      const commMsgs = await db
        .select({
          id: communityMessages.id,
          senderId: communityMessages.senderDoctorId,
          content: communityMessages.content,
          isRead: communityMessages.isRead,
          createdAt: communityMessages.createdAt,
          senderName: users.name,
          senderAvatar: users.avatarUrl,
        })
        .from(communityMessages)
        .innerJoin(users, eq(communityMessages.senderDoctorId, users.id))
        .where(
          and(
            eq(communityMessages.receiverDoctorId, userId),
            eq(communityMessages.isRead, false)
          )
        )
        .orderBy(desc(communityMessages.createdAt))
        .limit(10);

      for (const msg of commMsgs) {
        const notifId = `comm_msg_${msg.id}`;
        const isRead = msg.isRead || readIds.has(notifId);

        notifList.push({
          id: notifId,
          type: "community_message",
          title: `Dr. ${msg.senderName}`,
          content: msg.content,
          senderName: msg.senderName,
          senderAvatarUrl: msg.senderAvatar,
          timestamp: msg.createdAt.toISOString(),
          isRead,
          href: `/dashboard/chat?doctor=${msg.senderId}`,
        });
      }
    }

    // B) PUBLICATIONS DE LA COMMUNAUTÉ (Médecins uniquement)
    if (isDoctor && preferences.communityPosts) {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const posts = await db
        .select({
          id: communityPosts.id,
          title: communityPosts.title,
          category: communityPosts.category,
          authorName: communityPosts.authorName,
          authorAvatarUrl: communityPosts.authorAvatarUrl,
          createdAt: communityPosts.createdAt,
        })
        .from(communityPosts)
        .where(
          and(
            ne(communityPosts.authorDoctorId, userId),
            gte(communityPosts.createdAt, twoDaysAgo)
          )
        )
        .orderBy(desc(communityPosts.createdAt))
        .limit(6);

      for (const p of posts) {
        const notifId = `comm_post_${p.id}`;
        const isRead = readIds.has(notifId);

        const catLabel =
          p.category === "cas_clinique"
            ? "Cas Clinique"
            : p.category === "remplacement"
            ? "Remplacement"
            : p.category === "orientation"
            ? "Orientation"
            : "Annonce";

        notifList.push({
          id: notifId,
          type: "community_post",
          title: `[${catLabel}] ${p.title}`,
          content: `Partagé par ${p.authorName}`,
          senderName: p.authorName,
          senderAvatarUrl: p.authorAvatarUrl,
          category: p.category,
          timestamp: p.createdAt.toISOString(),
          isRead,
          href: "/dashboard/community",
        });
      }
    }

    // C) INTERPHONE CABINET MÉDECIN ⟷ ASSISTANTE
    if (preferences.clinicMessages) {
      const intMsgs = await db
        .select({
          id: clinicMessages.id,
          senderName: clinicMessages.senderName,
          senderRole: clinicMessages.senderRole,
          content: clinicMessages.content,
          isRead: clinicMessages.isRead,
          createdAt: clinicMessages.createdAt,
        })
        .from(clinicMessages)
        .where(
          and(
            eq(clinicMessages.clinicId, clinicId),
            ne(clinicMessages.senderRole, role),
            eq(clinicMessages.isRead, false)
          )
        )
        .orderBy(desc(clinicMessages.createdAt))
        .limit(10);

      for (const msg of intMsgs) {
        const notifId = `clinic_msg_${msg.id}`;
        const isRead = msg.isRead || readIds.has(notifId);

        notifList.push({
          id: notifId,
          type: "clinic_message",
          title: `Interphone : ${msg.senderName}`,
          content: msg.content,
          senderName: msg.senderName,
          timestamp: msg.createdAt.toISOString(),
          isRead,
          action: "open_interphone",
        });
      }
    }

    // D) SALLE D'ATTENTE (Arrivée de patients en attente aujourd'hui)
    if (preferences.queueArrivals) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const waitingVisits = await db
        .select({
          id: visits.id,
          date: visits.date,
          status: visits.status,
          firstName: patients.firstName,
          lastName: patients.lastName,
        })
        .from(visits)
        .innerJoin(patients, eq(visits.patientId, patients.id))
        .where(
          and(
            eq(visits.clinicId, clinicId),
            eq(visits.status, "waiting"),
            gte(visits.date, startOfToday)
          )
        )
        .orderBy(desc(visits.date))
        .limit(5);

      for (const v of waitingVisits) {
        const notifId = `queue_${v.id}`;
        const isRead = readIds.has(notifId);

        notifList.push({
          id: notifId,
          type: "queue_arrival",
          title: "Patient en salle d'attente",
          content: `${v.firstName} ${v.lastName} attend sa consultation`,
          timestamp: v.date.toISOString(),
          isRead,
          href: "/dashboard/queue",
        });
      }
    }
  } catch (err) {
    console.error("Erreur récupération notifications:", err);
  }

  // Trier par date décroissante
  notifList.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const unreadCount = notifList.filter((n) => !n.isRead).length;

  return {
    notifications: notifList,
    unreadCount,
    preferences,
  };
}

// 4. Marquer une notification spécifique ou toutes comme lues
export async function markNotificationsAsRead(notifIdOrType?: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false };

  const userSession = session.user as { id?: string; role?: string };
  const userId = parseInt(userSession.id || "0");
  const clinicId = await getTenantClinicId();

  try {
    const [user] = await db
      .select({ notificationPreferences: users.notificationPreferences })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const prefs = (user?.notificationPreferences as any) || {};
    const readIds = new Set<string>(prefs.readNotificationIds || []);

    const target = notifOrTypeClean(notifIdOrType);

    if (target && target !== "all") {
      readIds.add(target);

      // Traiter les messages spécifiques en BDD
      if (target.startsWith("comm_msg_")) {
        const msgId = parseInt(target.replace("comm_msg_", ""));
        if (msgId) {
          await db
            .update(communityMessages)
            .set({ isRead: true })
            .where(eq(communityMessages.id, msgId));
        }
      } else if (target.startsWith("clinic_msg_")) {
        const msgId = parseInt(target.replace("clinic_msg_", ""));
        if (msgId) {
          await db
            .update(clinicMessages)
            .set({ isRead: true })
            .where(eq(clinicMessages.id, msgId));
        }
      }
    }

    if (!target || target === "all") {
      // 1. Marquer tous les messages confraternels comme lus
      await db
        .update(communityMessages)
        .set({ isRead: true })
        .where(
          and(
            eq(communityMessages.receiverDoctorId, userId),
            eq(communityMessages.isRead, false)
          )
        );

      // 2. Marquer tous les messages interphone comme lus
      await db
        .update(clinicMessages)
        .set({ isRead: true })
        .where(
          and(
            eq(clinicMessages.clinicId, clinicId),
            eq(clinicMessages.isRead, false)
          )
        );

      // 3. Ajouter tous les posts récents dans les notifications lues
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const recentPosts = await db
        .select({ id: communityPosts.id })
        .from(communityPosts)
        .where(gte(communityPosts.createdAt, twoDaysAgo));
      for (const p of recentPosts) {
        readIds.add(`comm_post_${p.id}`);
      }

      // 4. Ajouter les arrivées de patients d'aujourd'hui dans les lues
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayVisits = await db
        .select({ id: visits.id })
        .from(visits)
        .where(
          and(
            eq(visits.clinicId, clinicId),
            gte(visits.date, startOfToday)
          )
        );
      for (const v of todayVisits) {
        readIds.add(`queue_${v.id}`);
      }
    } else {
      if (target === "community_message") {
        await db
          .update(communityMessages)
          .set({ isRead: true })
          .where(
            and(
              eq(communityMessages.receiverDoctorId, userId),
              eq(communityMessages.isRead, false)
            )
          );
      }

      if (target === "clinic_message") {
        await db
          .update(clinicMessages)
          .set({ isRead: true })
          .where(
            and(
              eq(clinicMessages.clinicId, clinicId),
              eq(clinicMessages.isRead, false)
            )
          );
      }
    }

    // Sauvegarder les readIds permanents dans le profil utilisateur
    const updatedReadIds = Array.from(readIds).slice(-200);
    await db
      .update(users)
      .set({
        notificationPreferences: {
          ...prefs,
          readNotificationIds: updatedReadIds,
        },
      })
      .where(eq(users.id, userId));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("Erreur markNotificationsAsRead:", err);
    return { success: false };
  }
}

function notifOrTypeClean(val?: string) {
  if (!val) return "all";
  return val.trim();
}
