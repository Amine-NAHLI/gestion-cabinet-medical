import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq } from "drizzle-orm";
import StatsCharts from "./StatsCharts";

export default async function StatsPage() {
  // Fetch all finished visits and patients for comprehensive statistics
  const allVisits = await db.select({
    id: visits.id,
    amountToPay: visits.amountToPay,
    createdAt: visits.createdAt,
    disease: visits.disease,
    paymentStatus: visits.paymentStatus,
    status: visits.status,
    patientFirstName: patients.firstName,
    patientLastName: patients.lastName,
    patientAge: patients.age
  }).from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(eq(visits.status, 'finished'));

  // Serialize dates and ensure clean numeric amounts
  const clientVisits = allVisits.map(v => ({
    ...v,
    amountToPay: v.amountToPay ? parseFloat(v.amountToPay as string) : 0,
    hasCustomAmount: v.amountToPay !== null && v.amountToPay !== undefined,
    createdAt: v.createdAt.toISOString()
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Statistiques & Analyse Financière</h1>
          <p className="text-slate-500 text-sm mt-1">Indicateurs de performance, facturation et activité du cabinet médical.</p>
        </div>
      </div>

      <StatsCharts rawVisits={clientVisits} />
    </div>
  );
}
