"use server";

import { db } from "@/db";
import { communityPosts, communityMessages, clinics, users, clinicSettings } from "@/db/schema";
import { eq, and, or, desc, asc, ne } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getTenantClinicId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function getCommunityData() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const userSession = session.user as { id?: string; role?: string };
  if (userSession.role !== "doctor") {
    return {
      isDoctor: false,
      isMember: false,
      error: "Espace réservé exclusivement aux médecins.",
      posts: [],
      confreres: [],
    };
  }

  const currentDoctorId = parseInt(userSession.id || "0");
  const clinicId = await getTenantClinicId();

  // 1. Vérifier si la clinique a activé la communauté
  const [clinic] = await db
    .select({ isCommunityMember: clinics.isCommunityMember })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  const isMember = clinic?.isCommunityMember ?? false;

  // Si pas encore membre, renvoyer isMember: false pour afficher l'écran d'opt-in
  if (!isMember) {
    return {
      isDoctor: true,
      isMember: false,
      posts: [],
      confreres: [],
      currentDoctorId,
    };
  }

  // 2. Récupérer les publications récentes de la communauté
  const rawPosts = await db
    .select()
    .from(communityPosts)
    .orderBy(desc(communityPosts.createdAt))
    .limit(50);

  // 3. Récupérer la liste des confrères médecins membres du réseau (hors soi-même)
  const confreres = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      clinicName: clinics.name,
      clinicCity: clinics.city,
      specialty: clinicSettings.specialty,
    })
    .from(users)
    .innerJoin(clinics, eq(users.clinicId, clinics.id))
    .leftJoin(clinicSettings, eq(clinics.id, clinicSettings.clinicId))
    .where(
      and(
        eq(users.role, "doctor"),
        eq(clinics.isCommunityMember, true),
        ne(users.id, currentDoctorId)
      )
    )
    .limit(100);

  return {
    isDoctor: true,
    isMember: true,
    currentDoctorId,
    posts: rawPosts.map((p) => ({
      id: p.id,
      clinicId: p.clinicId,
      authorDoctorId: p.authorDoctorId,
      authorName: p.authorName,
      authorSpecialty: p.authorSpecialty,
      authorCity: p.authorCity,
      authorAvatarUrl: p.authorAvatarUrl,
      category: p.category,
      title: p.title,
      content: p.content,
      likesCount: p.likesCount,
      createdAt: p.createdAt.toISOString(),
      isMyPost: p.authorDoctorId === currentDoctorId,
    })),
    confreres: confreres.map((c) => ({
      ...c,
      specialty: c.specialty || "Médecine Générale",
    })),
  };
}

export async function createCommunityPost(data: {
  title: string;
  content: string;
  category: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const userSession = session.user as { id?: string; role?: string; name?: string };
  if (userSession.role !== "doctor") {
    return { success: false, error: "Seuls les médecins peuvent publier." };
  }

  const currentDoctorId = parseInt(userSession.id || "0");
  const clinicId = await getTenantClinicId();

  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);
  const [doctor] = await db.select().from(users).where(eq(users.id, currentDoctorId)).limit(1);
  const [settings] = await db.select().from(clinicSettings).where(eq(clinicSettings.clinicId, clinicId)).limit(1);

  if (!clinic?.isCommunityMember) {
    return { success: false, error: "Veuillez d'abord rejoindre la communauté." };
  }

  const cleanTitle = data.title.trim();
  const cleanContent = data.content.trim();

  if (!cleanTitle || !cleanContent) {
    return { success: false, error: "Le titre et le contenu sont obligatoires." };
  }

  await db.insert(communityPosts).values({
    clinicId,
    authorDoctorId: currentDoctorId,
    authorName: doctor?.name || "Dr. Confrère",
    authorSpecialty: settings?.specialty || "Médecine Générale",
    authorCity: clinic.city || "Maroc",
    authorAvatarUrl: doctor?.avatarUrl || null,
    category: data.category || "general",
    title: cleanTitle,
    content: cleanContent,
  });

  revalidatePath("/dashboard/community");
  return { success: true };
}

export async function deleteCommunityPost(postId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const userSession = session.user as { id?: string; role?: string };
  if (userSession.role !== "doctor") {
    return { success: false, error: "Seuls les médecins peuvent supprimer leurs publications." };
  }

  const currentDoctorId = parseInt(userSession.id || "0");

  const [post] = await db
    .select()
    .from(communityPosts)
    .where(
      and(
        eq(communityPosts.id, postId),
        eq(communityPosts.authorDoctorId, currentDoctorId)
      )
    )
    .limit(1);

  if (!post) {
    return { success: false, error: "Publication introuvable ou vous n'en êtes pas l'auteur." };
  }

  await db.delete(communityPosts).where(eq(communityPosts.id, postId));
  revalidatePath("/dashboard/community");
  return { success: true };
}

export async function getCommunityDirectMessages(otherDoctorId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const userSession = session.user as { id?: string; role?: string };
  if (userSession.role !== "doctor") return [];

  const myId = parseInt(userSession.id || "0");

  const messages = await db
    .select()
    .from(communityMessages)
    .where(
      or(
        and(
          eq(communityMessages.senderDoctorId, myId),
          eq(communityMessages.receiverDoctorId, otherDoctorId)
        ),
        and(
          eq(communityMessages.senderDoctorId, otherDoctorId),
          eq(communityMessages.receiverDoctorId, myId)
        )
      )
    )
    .orderBy(asc(communityMessages.createdAt))
    .limit(100);

  // Marquer comme lus les messages reçus
  await db
    .update(communityMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(communityMessages.senderDoctorId, otherDoctorId),
        eq(communityMessages.receiverDoctorId, myId),
        eq(communityMessages.isRead, false)
      )
    );

  return messages.map((m) => ({
    id: m.id,
    senderDoctorId: m.senderDoctorId,
    receiverDoctorId: m.receiverDoctorId,
    content: m.content,
    isRead: m.isRead,
    createdAt: m.createdAt.toISOString(),
    isMe: m.senderDoctorId === myId,
  }));
}

export async function sendCommunityDirectMessage(otherDoctorId: number, content: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const userSession = session.user as { id?: string; role?: string };
  if (userSession.role !== "doctor") {
    return { success: false, error: "Seuls les médecins peuvent échanger." };
  }

  const myId = parseInt(userSession.id || "0");
  const cleanText = content.trim();

  if (!cleanText) return { success: false, error: "Message vide" };

  const [created] = await db
    .insert(communityMessages)
    .values({
      senderDoctorId: myId,
      receiverDoctorId: otherDoctorId,
      content: cleanText,
      isRead: false,
    })
    .returning();

  return {
    success: true,
    message: {
      id: created.id,
      senderDoctorId: created.senderDoctorId,
      receiverDoctorId: created.receiverDoctorId,
      content: created.content,
      isRead: created.isRead,
      createdAt: created.createdAt.toISOString(),
      isMe: true,
    },
  };
}

export async function toggleCommunityMembership(enable: boolean) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const userSession = session.user as { role?: string };
  if (userSession.role !== "doctor") {
    return { success: false, error: "Réservé au médecin." };
  }

  const clinicId = await getTenantClinicId();

  await db
    .update(clinics)
    .set({ isCommunityMember: enable })
    .where(eq(clinics.id, clinicId));

  revalidatePath("/dashboard/community");
  return { success: true, isCommunityMember: enable };
}

// 5. Compter tous les messages non lus pour le médecin connecté
export async function getUnreadChatCount(): Promise<number> {
  const session = await getServerSession(authOptions);
  if (!session) return 0;
  const userSession = session.user as { id?: string; role?: string };
  if (userSession.role !== "doctor") return 0;
  const myId = parseInt(userSession.id || "0");
  if (!myId) return 0;

  try {
    const unreadMsgs = await db
      .select({ id: communityMessages.id })
      .from(communityMessages)
      .where(
        and(
          eq(communityMessages.receiverDoctorId, myId),
          eq(communityMessages.isRead, false)
        )
      );
    return unreadMsgs.length;
  } catch {
    return 0;
  }
}

// 6. Données complètes pour la messagerie WhatsApp-style
export async function getChatOverviewData() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const userSession = session.user as { id?: string; role?: string };
  if (userSession.role !== "doctor") {
    return {
      isDoctor: false,
      isMember: false,
      confreres: [],
      totalUnreadCount: 0,
      currentDoctorId: 0,
    };
  }

  const currentDoctorId = parseInt(userSession.id || "0");
  const clinicId = await getTenantClinicId();

  const [clinic] = await db
    .select({ isCommunityMember: clinics.isCommunityMember })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  const isMember = clinic?.isCommunityMember ?? false;
  if (!isMember) {
    return {
      isDoctor: true,
      isMember: false,
      confreres: [],
      totalUnreadCount: 0,
      currentDoctorId,
    };
  }

  // Tous les confrères médecins membres
  const rawConfreres = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      clinicName: clinics.name,
      clinicCity: clinics.city,
      specialty: clinicSettings.specialty,
    })
    .from(users)
    .innerJoin(clinics, eq(users.clinicId, clinics.id))
    .leftJoin(clinicSettings, eq(clinics.id, clinicSettings.clinicId))
    .where(
      and(
        eq(users.role, "doctor"),
        eq(clinics.isCommunityMember, true),
        ne(users.id, currentDoctorId)
      )
    );

  // Tous les messages où je suis impliqué (expéditeur ou destinataire)
  const myMessages = await db
    .select()
    .from(communityMessages)
    .where(
      or(
        eq(communityMessages.senderDoctorId, currentDoctorId),
        eq(communityMessages.receiverDoctorId, currentDoctorId)
      )
    )
    .orderBy(desc(communityMessages.createdAt));

  // Agréger unreadCount et lastMessage par confrère
  const enrichedConfreres = rawConfreres.map((c) => {
    const unreadCount = myMessages.filter(
      (m) => m.senderDoctorId === c.id && m.receiverDoctorId === currentDoctorId && !m.isRead
    ).length;

    const lastMsg = myMessages.find(
      (m) =>
        (m.senderDoctorId === c.id && m.receiverDoctorId === currentDoctorId) ||
        (m.senderDoctorId === currentDoctorId && m.receiverDoctorId === c.id)
    );

    return {
      id: c.id,
      name: c.name,
      avatarUrl: c.avatarUrl,
      bio: c.bio,
      clinicName: c.clinicName,
      clinicCity: c.clinicCity,
      specialty: c.specialty || "Médecine Générale",
      unreadCount,
      lastMessage: lastMsg
        ? {
            content: lastMsg.content,
            createdAt: lastMsg.createdAt.toISOString(),
            isMe: lastMsg.senderDoctorId === currentDoctorId,
          }
        : null,
    };
  });

  // Tri WhatsApp :
  // 1. Les conversations avec messages non lus en premier (badge)
  // 2. Par date du dernier message (les plus récents en haut)
  // 3. Par ordre alphabétique
  enrichedConfreres.sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
    if (a.unreadCount > 0 && b.unreadCount > 0) return b.unreadCount - a.unreadCount;

    const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;

    return a.name.localeCompare(b.name);
  });

  const totalUnreadCount = enrichedConfreres.reduce((acc, c) => acc + c.unreadCount, 0);

  return {
    isDoctor: true,
    isMember: true,
    currentDoctorId,
    confreres: enrichedConfreres,
    totalUnreadCount,
  };
}

// 7. Marquer tous les messages d'un confrère comme lus à l'ouverture de sa conversation
export async function markDoctorChatAsRead(doctorSenderId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false };
  const userSession = session.user as { id?: string };
  const myId = parseInt(userSession.id || "0");
  if (!myId) return { success: false };

  await db
    .update(communityMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(communityMessages.senderDoctorId, doctorSenderId),
        eq(communityMessages.receiverDoctorId, myId),
        eq(communityMessages.isRead, false)
      )
    );

  revalidatePath("/dashboard/chat");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
