import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;

  // Pour le médecin : tout l'historique clôturé
  // Pour l'assistante : les consultations terminées
  const historyCondition = eq(visits.status, 'finished');

  const historyList = await db.select({
      id: visits.id,
      amountToPay: visits.amountToPay,
      status: visits.status,
      paymentStatus: visits.paymentStatus,
      paymentMethod: visits.paymentMethod,
      disease: visits.disease,
      diagnosis: visits.diagnosis,
      patient: patients,
      createdAt: visits.createdAt
    })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(historyCondition)
    .orderBy(desc(visits.createdAt))
    .limit(200);

  const formatted = historyList.map(v => ({
    ...v,
    amountToPay: v.amountToPay as string | null,
    createdAt: v.createdAt.toISOString()
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 mb-2">
            <span className="material-symbols-outlined text-xs text-slate-500">inventory_2</span>
            Archives Médicales
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Historique des visites</h1>
          <p className="text-slate-500 text-sm mt-1">Dossiers et récapitulatif des consultations terminées au cabinet.</p>
        </div>

        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <span className="material-symbols-outlined text-xl">folder_shared</span>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total archives</div>
            <div className="text-lg font-extrabold text-slate-900">{formatted.length} dossiers</div>
          </div>
        </div>
      </div>

      <HistoryClient items={formatted} role={role} />
    </div>
  );
}
