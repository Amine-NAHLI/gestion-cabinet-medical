import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import AddPatientModal from "@/components/AddPatientModal";
import SendToDoctorButton from "@/components/SendToDoctorButton";
import Link from "next/link";
import { MotionDiv } from "@/components/MotionWrapper";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;

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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Flux en direct
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">File d&apos;attente</h1>
          <p className="text-slate-500 text-sm mt-1">Gestion des admissions et présences du cabinet pour aujourd&apos;hui.</p>
        </div>
        {role === 'assistant' && <AddPatientModal />}
      </div>

      <div className="space-y-8">

        {/* Section Médecin: Patient Prêt */}
        {role === 'doctor' && readyList.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Patient Prêt en Consultation
              </h2>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-full">
                À recevoir
              </span>
            </div>

            <div className="space-y-3">
              {readyList.map(visit => {
                const initials = `${visit.patient.firstName[0] || ""}${visit.patient.lastName[0] || ""}`.toUpperCase();
                return (
                  <MotionDiv
                    key={visit.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-linear-to-r from-emerald-50/70 via-white to-white border-2 border-emerald-500/80 p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-13 h-13 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg tracking-wider shadow-sm shadow-emerald-600/30">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-xl tracking-tight">
                            {visit.patient.lastName} {visit.patient.firstName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                            Salle prête
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span>{visit.patient.age} ans</span>
                          <span>•</span>
                          <span>Tél: {visit.patient.phone}</span>
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/consultation/${visit.id}`}
                      className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-7 py-3 rounded-xl font-bold text-sm tracking-wide shadow-sm hover:shadow-md hover:shadow-emerald-600/25 transition-all cursor-pointer"
                    >
                      <span>Ouvrir la Consultation</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                  </MotionDiv>
                );
              })}
            </div>
          </div>
        )}

        {/* Section Assistante: Notification patient envoyé */}
        {role === 'assistant' && readyList.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Patient Actuellement chez le Médecin
            </h2>
            <div className="space-y-3">
              {readyList.map(visit => {
                const initials = `${visit.patient.firstName[0] || ""}${visit.patient.lastName[0] || ""}`.toUpperCase();
                return (
                  <div key={visit.id} className="bg-emerald-50/60 border border-emerald-200/80 p-4.5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          {visit.patient.lastName} {visit.patient.firstName}
                        </h3>
                        <p className="text-xs text-emerald-700 font-medium mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          En cours de prise en charge par le praticien
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-800 bg-white/80 border border-emerald-200 px-3 py-1 rounded-full shadow-xs">
                      En cabinet
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Salle d'attente globale (Assistante & Médecin) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Salle d&apos;Attente
            </h2>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              {waitingList.length} patient{waitingList.length > 1 ? "s" : ""}
            </span>
          </div>
          
          {waitingList.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <span className="material-symbols-outlined text-2xl">meeting_room</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Salle d&apos;attente libre</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Aucun patient n&apos;est actuellement en attente d&apos;enregistrement ou de consultation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingList.map((visit, index) => {
                const initials = `${visit.patient.firstName[0] || ""}${visit.patient.lastName[0] || ""}`.toUpperCase();
                const arrivalTime = visit.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <MotionDiv
                    key={visit.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs font-mono">
                        #{String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-slate-900 text-base group-hover:text-sky-700 transition-colors">
                            {visit.patient.lastName} {visit.patient.firstName}
                          </h3>
                          {visit.isAppointment && (
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-[10px] font-bold rounded-md uppercase tracking-wide">
                              Rendez-vous
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-slate-400">schedule</span>
                            Arrivé(e) à {arrivalTime}
                          </span>
                          <span>•</span>
                          <span>{visit.patient.age} ans</span>
                          {visit.patient.phone && (
                            <>
                              <span>•</span>
                              <span>{visit.patient.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      {role === 'assistant' ? (
                        <SendToDoctorButton visitId={visit.id} />
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
                          En file d'attente
                        </span>
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
