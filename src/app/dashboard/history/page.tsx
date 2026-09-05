import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  // Pour le médecin: on affiche tout l'historique (payé ou non)
  // Pour l'assistante: on n'affiche dans l'historique que les visites déjà payées (les non-payées sont dans l'onglet Paiements)
  const historyCondition = role === 'doctor' 
    ? eq(visits.status, 'finished') 
    : and(eq(visits.status, 'finished'), eq(visits.paymentStatus, 'paid'));

  const historyList = await db.select({
      id: visits.id,
      amountToPay: visits.amountToPay,
      status: visits.status,
      paymentStatus: visits.paymentStatus,
      disease: visits.disease,
      patient: patients,
      createdAt: visits.createdAt
    })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(historyCondition)
    .orderBy(desc(visits.createdAt))
    .limit(100);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Historique des visites</h1>
        <p className="text-slate-500 mt-1">Consultez les dossiers de toutes les consultations terminées.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
            Dernières consultations terminées ({historyList.length})
          </h2>
        </div>
        
        <div className="p-0">
          {historyList.length === 0 ? (
            <div className="text-center text-slate-500 py-12 flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl mb-3 text-slate-300">history</span>
              <p>Aucun historique disponible.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historyList.map(visit => (
                <div key={visit.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined">folder_shared</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg group-hover:text-sky-600 transition-colors">
                        {visit.patient.lastName} {visit.patient.firstName}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Fait le {visit.createdAt.toLocaleDateString('fr-FR', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <div className="mb-1">
                        {visit.paymentStatus === 'paid' ? (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider">Payé</span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">Non Payé</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-semibold mt-1">Montant : <span className="text-slate-800">{visit.amountToPay ? `${visit.amountToPay} DH` : 'Non défini'}</span></p>
                    </div>
                    
                    {role === 'doctor' && (
                      <Link href={`/dashboard/consultation/${visit.id}`} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white hover:border-sky-300 hover:text-sky-600 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        Voir
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
