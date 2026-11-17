import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import StatsCharts from "./StatsCharts";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const clinicId = await getTenantClinicId();

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

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200/80 text-[11px] font-bold uppercase tracking-wider text-violet-700 mb-2">
            <span className="material-symbols-outlined text-xs">analytics</span>
            Indicateurs & Performance Clinique
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Statistiques & Analyse Financière</h1>
          <p className="text-slate-500 text-sm mt-0.5">Indicateurs de performance, facturation, répartition des pathologies et activité du cabinet.</p>
        </div>
      </div>

      <StatsCharts rawVisits={clientVisits} />
    </div>
  );
}
