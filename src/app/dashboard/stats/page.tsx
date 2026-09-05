import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import StatsCharts from "./StatsCharts";

export default async function StatsPage() {
  const session = await getServerSession(authOptions);
  
  // Fetch all finished and paid visits and patients for the chart and invoice report
  const allVisits = await db.select({
    id: visits.id,
    amountToPay: visits.amountToPay,
    createdAt: visits.createdAt,
    disease: visits.disease,
    paymentStatus: visits.paymentStatus,
    patientFirstName: patients.firstName,
    patientLastName: patients.lastName,
    patientAge: patients.age
  }).from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(and(eq(visits.status, 'finished'), eq(visits.paymentStatus, 'paid')));

  // We pass the raw data to the client component so it can filter dynamically
  const clientVisits = allVisits.map(v => ({
    ...v,
    amountToPay: v.amountToPay ? parseFloat(v.amountToPay as string) : 0,
    createdAt: v.createdAt.toISOString()
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Statistiques Globales 📈</h1>
          <p className="text-slate-500 mt-1">Vos données analysées de manière claire et professionnelle.</p>
        </div>
      </div>

      <StatsCharts rawVisits={clientVisits} />
    </div>
  );
}
