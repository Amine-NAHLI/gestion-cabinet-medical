import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients, clinics } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import { getPlatformSettings } from "@/actions/platform";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;
  const clinicId = await getTenantClinicId();

  // Récupérer le plan du cabinet
  const [clinic] = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      plan: clinics.plan,
      billingCycle: clinics.billingCycle,
      subscriptionExpiresAt: clinics.subscriptionExpiresAt,
      subscriptionStatus: clinics.subscriptionStatus,
      createdAt: clinics.createdAt,
    })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  const isStandard = clinic?.plan === "standard";
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = new Date(now - thirtyDaysMs);

  let historyList;
  let archivedCount = 0;
  let daysUntilReset = 30;

  if (isStandard) {
    // FORMULE STANDARD : Filtrer strictement aux 30 derniers jours
    historyList = await db
      .select({
        id: visits.id,
        amountToPay: visits.amountToPay,
        status: visits.status,
        paymentStatus: visits.paymentStatus,
        paymentMethod: visits.paymentMethod,
        disease: visits.disease,
        diagnosis: visits.diagnosis,
        patient: patients,
        createdAt: visits.createdAt,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(
        and(
          eq(visits.clinicId, clinicId),
          eq(visits.status, "finished"),
          gte(visits.createdAt, thirtyDaysAgo)
        )
      )
      .orderBy(desc(visits.createdAt));

    // Compter les consultations de plus de 30 jours
    const allVisits = await db
      .select({ id: visits.id, createdAt: visits.createdAt })
      .from(visits)
      .where(and(eq(visits.clinicId, clinicId), eq(visits.status, "finished")));

    archivedCount = allVisits.filter((v) => new Date(v.createdAt) < thirtyDaysAgo).length;

    // Calcul du délai restant avant la prochaine rotation mensuelle
    if (clinic?.subscriptionExpiresAt) {
      daysUntilReset = Math.max(1, Math.ceil((new Date(clinic.subscriptionExpiresAt).getTime() - now) / (1000 * 60 * 60 * 24)));
    } else {
      const daysSinceCreation = Math.floor((now - new Date(clinic?.createdAt || now).getTime()) / (1000 * 60 * 60 * 24));
      daysUntilReset = Math.max(1, 30 - (daysSinceCreation % 30));
    }
  } else {
    // FORMULE PRO : Accès illimité à vie sans coupure
    historyList = await db
      .select({
        id: visits.id,
        amountToPay: visits.amountToPay,
        status: visits.status,
        paymentStatus: visits.paymentStatus,
        paymentMethod: visits.paymentMethod,
        disease: visits.disease,
        diagnosis: visits.diagnosis,
        patient: patients,
        createdAt: visits.createdAt,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(and(eq(visits.clinicId, clinicId), eq(visits.status, "finished")))
      .orderBy(desc(visits.createdAt))
      .limit(300);
  }

  const platform = await getPlatformSettings();

  const formatted = historyList.map((v) => ({
    ...v,
    amountToPay: v.amountToPay as string | null,
    createdAt: v.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <HistoryClient
        items={formatted}
        role={role}
        isStandard={isStandard}
        archivedCount={archivedCount}
        daysUntilReset={daysUntilReset}
        supportWhatsapp={platform.supportWhatsapp}
        supportWhatsappMessage={platform.supportWhatsappMessage}
      />
    </div>
  );
}
