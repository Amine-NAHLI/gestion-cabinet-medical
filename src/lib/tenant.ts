import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Récupère de façon sécurisée le clinicId du médecin ou de l'assistante connecté(e).
 * Garantit l'étanchéité absolue des données (Multi-Tenancy strict).
 */
export async function getTenantClinicId(requireAuth = true): Promise<number> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    if (requireAuth) {
      redirect("/login");
    }
    return 1;
  }

  // 1. Lire depuis la session JWT
  let clinicId = (session.user as any).clinicId;

  // 2. Si non présent dans le token (ex: ancien cookie), relire directement depuis la BDD
  if (!clinicId && session.user.id) {
    const userInDb = await db
      .select({ clinicId: users.clinicId })
      .from(users)
      .where(eq(users.id, parseInt(session.user.id, 10)))
      .limit(1);

    if (userInDb[0]?.clinicId) {
      clinicId = userInDb[0].clinicId;
    }
  }

  if (!clinicId) {
    if (requireAuth && session.user.role !== "superadmin") {
      redirect("/login");
    }
    return 1;
  }

  return Number(clinicId);
}
