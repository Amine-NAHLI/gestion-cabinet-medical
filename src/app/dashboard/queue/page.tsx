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
                  <div key={visit.id} className="bg-white border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-semibold text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 text-sm truncate">
                          {visit.patient.lastName} {visit.patient.firstName}
                        </h3>
                        <p className="text-xs text-emerald-700 mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>En cours avec le médecin</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md self-start sm:self-center shrink-0">
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
                  <div
                    key={visit.id}
                    className="bg-white p-4 sm:p-5 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:border-slate-300 transition"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-semibold text-xs tabular-nums shrink-0 mt-0.5 sm:mt-0">
                        {index + 1}
                      </div>
                      <div className="hidden sm:flex w-10 h-10 rounded-lg bg-slate-100 border border-slate-200/70 text-slate-700 items-center justify-center font-semibold text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                            {visit.patient.lastName} {visit.patient.firstName}
                          </h3>
                          {visit.isAppointment && (
                            <span className="px-2 py-0.5 bg-sky-50 border border-sky-200/70 text-sky-700 text-[10px] font-semibold rounded-md">
                              RDV
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
                            {arrivalTime}
                          </span>
                          <span>•</span>
                          <span>{visit.patient.age} ans</span>
                          {visit.patient.phone && (
                            <>
                              <span>•</span>
                              <span className="tabular-nums">{visit.patient.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                      {role === 'assistant' ? (
                        <>
                          <SendToDoctorButton visitId={visit.id} />
                          <CancelVisitButton visitId={visit.id} />
                        </>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                          En attente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
