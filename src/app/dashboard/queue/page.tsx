import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, sql, asc, and } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import AddPatientModal from "@/components/AddPatientModal";
import SendToDoctorButton from "@/components/SendToDoctorButton";
import CancelVisitButton from "@/components/CancelVisitButton";
import Link from "next/link";
import { MotionDiv } from "@/components/MotionWrapper";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;
  const clinicId = await getTenantClinicId();

  // Récupérer les visites d'aujourd'hui uniquement pour ce cabinet
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const visitArray = await db
    .select({
      id: visits.id,
      status: visits.status,
      isAppointment: visits.isAppointment,
      patient: patients,
      createdAt: visits.createdAt,
    })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(and(eq(visits.clinicId, clinicId), sql`${visits.createdAt} >= ${todayStart}`))
    .orderBy(asc(visits.createdAt));

  const waitingList = visitArray.filter(v => v.status === 'waiting');
  const readyList = visitArray.filter(v => v.status === 'ready');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Salle d'attente</h1>
          <p className="text-slate-500 text-sm mt-0.5">Admissions et patients en attente pour aujourd'hui.</p>
        </div>
        {role === 'assistant' && <AddPatientModal />}
      </div>

      <div className="space-y-6">

        {/* Section Médecin: Patient Prêt */}
        {role === 'doctor' && readyList.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Patient prêt en consultation
              </h2>
            </div>

            <div className="space-y-2.5">
              {readyList.map(visit => {
                const initials = `${visit.patient.firstName[0] || ""}${visit.patient.lastName[0] || ""}`.toUpperCase();
                return (
                  <div
                    key={visit.id}
                    className="bg-white border border-emerald-300/90 p-5 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-semibold text-sm">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 text-base">
                            {visit.patient.lastName} {visit.patient.firstName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                            En salle
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{visit.patient.age} ans</span>
                          <span>•</span>
                          <span>Tél. {visit.patient.phone}</span>
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/consultation/${visit.id}`}
                      className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition cursor-pointer"
                    >
                      <span>Ouvrir la consultation</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section Assistante: Notification patient envoyé */}
        {role === 'assistant' && readyList.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
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
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Salle d'Attente
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
              <h3 className="font-bold text-slate-800 text-sm">Salle d'attente libre</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Aucun patient n'est actuellement en attente d'enregistrement ou de consultation.</p>
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

                    <div className="flex items-center justify-end gap-2">
                      {role === 'assistant' ? (
                        <>
                          <SendToDoctorButton visitId={visit.id} />
                          <CancelVisitButton visitId={visit.id} />
                        </>
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
