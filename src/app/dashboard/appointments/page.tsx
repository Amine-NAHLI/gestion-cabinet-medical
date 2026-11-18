import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { eq, asc, desc, not, and } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import TransformAppointmentButton from "@/components/TransformAppointmentButton";
import AddAppointmentModal from "@/components/AddAppointmentModal";
import { MotionDiv } from "@/components/MotionWrapper";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;
  const clinicId = await getTenantClinicId();

  // Récupérer les rendez-vous actifs triés chronologiquement pour ce cabinet
  const appointmentsList = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      time: appointments.time,
      reason: appointments.reason,
      status: appointments.status,
      patient: patients,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(eq(appointments.clinicId, clinicId), not(eq(appointments.status, "cancelled"))))
    .orderBy(asc(appointments.date));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Rendez-vous</h1>
          <p className="text-slate-500 text-sm mt-0.5">Planning des consultations à venir.</p>
        </div>

        <div className="flex items-center gap-3">
          <AddAppointmentModal />
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] border border-slate-200/90 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            Carnet des rendez-vous ({appointmentsList.length})
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {appointmentsList.filter(a => a.status === 'scheduled').length} en attente
          </span>
        </div>
        
        <div>
          {appointmentsList.length === 0 ? (
            <div className="text-center text-slate-500 py-16 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
                <span className="material-symbols-outlined text-3xl">event_busy</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Aucun rendez-vous planifié</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Utilisez le bouton "Nouveau Rendez-vous" pour programmer une consultation.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {appointmentsList.map((appt, index) => {
                const initials = `${appt.patient.firstName[0] || ""}${appt.patient.lastName[0] || ""}`.toUpperCase();
                const dayNumber = appt.date.getDate();
                const monthName = appt.date.toLocaleDateString('fr-FR', { month: 'short' });
                const fullDate = appt.date.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });

                const isAdmitted = appt.status === 'admitted';

                return (
                  <div
                    key={appt.id}
                    className={`p-4 sm:p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                      isAdmitted ? "bg-slate-50/40 opacity-75" : "hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      {/* Date & Time Block */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-slate-900 shrink-0">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 leading-none">
                          {monthName}
                        </span>
                        <span className="text-base sm:text-lg font-semibold leading-tight tabular-nums">
                          {dayNumber}
                        </span>
                        <span className="text-[10px] font-medium text-sky-700 tabular-nums leading-none">
                          {appt.time || "09:00"}
                        </span>
                      </div>

                      <div className="hidden sm:flex w-10 h-10 rounded-lg bg-slate-100 border border-slate-200/70 items-center justify-center font-semibold text-xs text-slate-600 shrink-0">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                            {appt.patient.lastName} {appt.patient.firstName}
                          </h3>
                          {appt.reason && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                              {appt.reason}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="capitalize font-medium text-slate-700">{fullDate} à {appt.time || "09:00"}</span>
                          <span>•</span>
                          <span>{appt.patient.age} ans</span>
                          {appt.patient.phone && (
                            <>
                              <span>•</span>
                              <span className="tabular-nums">{appt.patient.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                      {isAdmitted ? (
                        <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-medium inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Admis
                        </span>
                      ) : (
                        <>
                          {role === 'assistant' && (
                            <TransformAppointmentButton appointmentId={appt.id} patientId={appt.patient.id} />
                          )}
                          {role === 'doctor' && (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                              Confirmé
                            </span>
                          )}
                        </>
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
