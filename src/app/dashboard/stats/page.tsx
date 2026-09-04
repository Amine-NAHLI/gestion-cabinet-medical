import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { visits } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export default async function StatsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'doctor') redirect("/dashboard");

  // On récupère toutes les visites payées ce mois-ci
  const currentMonthVisits = await db
    .select({
      amount: visits.amountToPay,
      count: sql<number>`count(*)`
    })
    .from(visits)
    .where(
      sql`EXTRACT(MONTH FROM ${visits.createdAt}) = EXTRACT(MONTH FROM CURRENT_DATE) AND ${visits.paymentStatus} = 'paid'`
    )
    .groupBy(visits.amountToPay);

  const totalRevenue = currentMonthVisits.reduce((acc, curr) => acc + (Number(curr.amount) * Number(curr.count)), 0);
  const totalPatients = currentMonthVisits.reduce((acc, curr) => acc + Number(curr.count), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Statistiques Financières</h1>
        <p className="text-slate-500 mt-1">Résumé des encaissements du mois en cours.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <p className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">Revenu du Mois</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900">{totalRevenue}</span>
            <span className="text-xl font-semibold text-slate-400">DH</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <p className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">Consultations Payées</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900">{totalPatients}</span>
            <span className="text-xl font-semibold text-slate-400">patients</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Répartition par Tarif</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {currentMonthVisits.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Aucun encaissement ce mois-ci.</div>
          ) : (
            currentMonthVisits.map((item, i) => (
              <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-lg">{item.amount} DH</p>
                    <p className="text-sm text-slate-500">Tarif de la consultation</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 text-lg">{item.count}</p>
                  <p className="text-sm text-slate-500">fois encaissé</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
