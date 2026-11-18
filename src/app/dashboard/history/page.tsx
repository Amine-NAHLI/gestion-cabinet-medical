import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;
  const clinicId = await getTenantClinicId();

  // Filtré strictement par cabinet médical (Multi-Tenancy)
  const historyList = await db
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
    .limit(200);

  const formatted = historyList.map(v => ({
    ...v,
    amountToPay: v.amountToPay as string | null,
    createdAt: v.createdAt.toISOString()
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Historique des consultations</h1>
          <p className="text-slate-500 text-sm mt-0.5">Archives des consultations terminées et statuts d'encaissement.</p>
        </div>

        <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex items-center gap-3 self-start">
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Total archives</div>
            <div className="text-base font-semibold text-slate-900 tabular-nums">{formatted.length} dossiers</div>
          </div>
        </div>
      </div>

      <HistoryClient items={formatted} role={role} />
    </div>
  );
}
