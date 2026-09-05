import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import AddPatientModal from "@/components/AddPatientModal";
import SendToDoctorButton from "@/components/SendToDoctorButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  // Récupérer les visites d'aujourd'hui uniquement
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const visitArray = await db.select({
      id: visits.id,
      status: visits.status,
      isAppointment: visits.isAppointment,
      patient: patients,
      createdAt: visits.createdAt
    })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(sql`${visits.createdAt} >= ${todayStart}`)
    .orderBy(asc(visits.createdAt));

  const waitingList = visitArray.filter(v => v.status === 'waiting');
  const readyList = visitArray.filter(v => v.status === 'ready');
  const consultingList = visitArray.filter(v => v.status === 'consulting');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">File d'attente</h1>
          <p className="text-slate-500 mt-1">Gérez les patients présents aujourd'hui.</p>
        </div>
        {role === 'assistant' && <AddPatientModal />}
      </div>

      <div className="space-y-8">
        
        {/* En consultation */}
        {consultingList.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
              En Consultation Actuelle
            </h2>
            {consultingList.map(visit => (
              <div key={visit.id} className="block bg-sky-600 text-white p-5 rounded-2xl shadow-md">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{visit.patient.lastName} {visit.patient.firstName}</h3>
                    <p className="text-sky-100 text-sm mt-1">Patient en salle</p>
                  </div>
                  {role === 'doctor' && (
                    <Link href={`/dashboard/consultation/${visit.id}`} className="bg-white text-sky-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-sky-50 transition-colors">
                      Reprendre
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Personne Suivante (Prêt pour le médecin) */}
        {role === 'doctor' && readyList.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Personne Suivante (Envoyée par l'Assistante)
            </h2>
            <div className="space-y-3">
              {readyList.map(visit => (
                <div key={visit.id} className="bg-emerald-50 border-2 border-emerald-500 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center font-black text-xl text-emerald-600">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-900 text-xl">{visit.patient.lastName} {visit.patient.firstName}</h3>
                      <p className="text-sm text-emerald-700 mt-0.5 font-medium">En attente de consultation</p>
                    </div>
                  </div>
                  <Link href={`/dashboard/consultation/${visit.id}`} className="bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm">
                    Consulter
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {role === 'assistant' && readyList.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Patient envoyé au Médecin
            </h2>
            <div className="space-y-3">
              {readyList.map(visit => (
                <div key={visit.id} className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-emerald-900">{visit.patient.lastName} {visit.patient.firstName}</h3>
                    <p className="text-xs text-emerald-700 mt-0.5">Le médecin voit ce patient sur son écran.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Salle d'attente globale (Assistante) */}
        {role === 'assistant' && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              En Attente ({waitingList.length})
            </h2>
            
            {waitingList.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center h-48">
                <span className="material-symbols-outlined text-4xl mb-3 text-slate-300">weekend</span>
                <p>Aucun patient en salle d'attente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {waitingList.map((visit, index) => (
                  <div key={visit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center font-black text-xl text-slate-400">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-sky-600 transition-colors flex items-center gap-2">
                          {visit.patient.lastName} {visit.patient.firstName}
                          {visit.isAppointment && <span className="px-2 py-0.5 bg-fuchsia-100 text-fuchsia-700 text-[10px] font-bold rounded uppercase tracking-wide">Rendez-vous</span>}
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">Arrivé à {visit.createdAt.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    <SendToDoctorButton visitId={visit.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
