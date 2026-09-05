import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import Link from "next/link";
import { MotionDiv } from "@/components/MotionWrapper";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;

  // Pour le médecin: on affiche tout l'historique (payé ou non)
  // Pour l'assistante: on n'affiche dans l'historique que les visites déjà payées
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
            <div className="text-lg font-extrabold text-slate-900">{historyList.length} dossier{historyList.length > 1 ? "s" : ""}</div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            Dossiers récents ({historyList.length})
          </h2>
        </div>
        
        <div>
          {historyList.length === 0 ? (
            <div className="text-center text-slate-500 py-16 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <span className="material-symbols-outlined text-3xl">history_toggle_off</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Aucun historique disponible</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Les dossiers des consultations complétées s&apos;afficheront ici.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historyList.map((visit, index) => {
                const initials = `${visit.patient.firstName[0] || ""}${visit.patient.lastName[0] || ""}`.toUpperCase();
                const visitDate = visit.createdAt.toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <MotionDiv 
                    key={visit.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-5 sm:p-6 hover:bg-slate-50/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-600 font-bold text-sm tracking-wider group-hover:bg-sky-50 group-hover:text-sky-700 group-hover:border-sky-200 transition-colors">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base group-hover:text-sky-700 transition-colors">
                            {visit.patient.lastName} {visit.patient.firstName}
                          </h3>
                          {visit.disease && (
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              {visit.disease}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="capitalize">{visitDate}</span>
                          <span>•</span>
                          <span>{visit.patient.age} ans</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <div>
                          {visit.paymentStatus === 'paid' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-full uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Payé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold rounded-full uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              En attente
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Règlement : <span className="font-bold text-slate-900">{visit.amountToPay ? `${visit.amountToPay} DH` : 'Non fixé'}</span>
                        </p>
                      </div>
                      
                      {role === 'doctor' && (
                        <Link 
                          href={`/dashboard/consultation/${visit.id}`} 
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/50 transition-all shadow-xs"
                        >
                          <span className="material-symbols-outlined text-base">folder_open</span>
                          Dossier
                        </Link>
                      )}
                    </div>
                  </MotionDiv>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
