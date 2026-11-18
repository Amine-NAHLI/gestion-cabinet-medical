import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import { getClinicSettings } from "@/actions/settings";
import StatsCharts from "./StatsCharts";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const clinicId = await getTenantClinicId();
  const settings = await getClinicSettings(clinicId);

  // Récupérer toutes les consultations terminées pour ce cabinet
  const allVisits = await db
    .select({
      id: visits.id,
      amountToPay: visits.amountToPay,
      createdAt: visits.createdAt,
      paidAt: visits.paidAt,
      paymentMethod: visits.paymentMethod,
      disease: visits.disease,
      diagnosis: visits.diagnosis,
      paymentStatus: visits.paymentStatus,
      status: visits.status,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientAge: patients.age,
    })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(and(eq(visits.clinicId, clinicId), eq(visits.status, "finished")));

  // Sérialisation propre des dates et montants pour le client
  const clientVisits = allVisits.map(v => ({
    ...v,
    amountToPay: v.amountToPay ? parseFloat(v.amountToPay as string) : 0,
    hasCustomAmount: v.amountToPay !== null && v.amountToPay !== undefined,
    createdAt: v.createdAt.toISOString(),
    paidAt: v.paidAt ? v.paidAt.toISOString() : null,
  }));

  const clinicInfo = {
    clinicName: settings?.clinicName || "",
    doctorName: settings?.doctorName || "",
    specialty: settings?.specialty || "",
    phone: settings?.phone || "",
    email: settings?.email || "",
    address: settings?.address || "",
    city: settings?.city || "",
    orderNumber: settings?.orderNumber || "",
    taxId: settings?.taxId || "",
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Statistiques</h1>
        <p className="text-slate-500 text-sm mt-0.5">Activité clinique, recettes et répartition des consultations.</p>
      </div>

      <StatsCharts rawVisits={clientVisits} clinicInfo={clinicInfo} />
    </div>
  );
}
