import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getClinicSettings } from "@/actions/settings";
import { getUnreadChatCount } from "@/actions/community";
import { getActiveConsultation } from "@/actions/consultation";
import { db } from "@/db";
import { users, clinics } from "@/db/schema";
import { eq } from "drizzle-orm";
import DashboardShell from "@/components/DashboardShell";
import { getTenantClinicId } from "@/lib/tenant";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const userSession = session?.user as {
    id?: string;
    role?: string;
    name?: string | null;
    email?: string | null;
  } | undefined;

  const role = userSession?.role || "assistant";
  const userId = parseInt(userSession?.id || "0");
  const clinicId = await getTenantClinicId();

  // Récupérer le statut utilisateur en direct (avatar, isOnboarded, hasSeenTour)
  const [currentUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      isOnboarded: users.isOnboarded,
      role: users.role,
      notificationPreferences: users.notificationPreferences,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const hasSeenTour = Boolean((currentUser?.notificationPreferences as any)?.hasSeenTour);

  // Si c'est un médecin et qu'il n'a pas encore fait son onboarding initial, redirection immédiate
  if (role === "doctor" && currentUser && !currentUser.isOnboarded) {
    redirect("/onboarding/setup");
  }

  // Récupérer les personnalisations de la clinique (logo, couleur, communauté)
  const [clinic] = await db
    .select({
      name: clinics.name,
      logoUrl: clinics.logoUrl,
      primaryColor: clinics.primaryColor,
      isCommunityMember: clinics.isCommunityMember,
    })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  const settings = await getClinicSettings();
  const unreadChatCount = role === "doctor" ? await getUnreadChatCount() : 0;
  const activeConsultation = role === "doctor" ? await getActiveConsultation() : null;

  const todayStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardShell
      role={role}
      clinicName={clinic?.name || settings?.clinicName || "MonCabinet"}
      clinicLogoUrl={clinic?.logoUrl || null}
      primaryColor={clinic?.primaryColor || "#0f172a"}
      isCommunityMember={clinic?.isCommunityMember || false}
      unreadChatCount={unreadChatCount}
      activeConsultation={activeConsultation}
      todayStr={todayStr}
      user={{
        name: currentUser?.name || userSession?.name,
        email: currentUser?.email || userSession?.email,
        avatarUrl: currentUser?.avatarUrl || null,
        isOnboarded: currentUser?.isOnboarded ?? true,
        hasSeenTour,
      }}
    >
      {children}
    </DashboardShell>
  );
}
