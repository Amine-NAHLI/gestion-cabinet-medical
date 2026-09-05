import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import TransformAppointmentButton from "@/components/TransformAppointmentButton";
import { MotionDiv } from "@/components/MotionWrapper";

export default async function AppointmentsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;

  // Récupérer les rendez-vous triés par date
  const appointmentsList = await db.select({
      id: appointments.id,
      date: appointments.date,
      patient: patients
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .orderBy(asc(appointments.date));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/70 text-xs font-semibold text-indigo-800 mb-2">
            <span className="material-symbols-outlined text-xs text-indigo-600">calendar_month</span>
            Planning & Réservations
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Rendez-vous prévus</h1>
          <p className="text-slate-500 text-sm mt-1">Consultations et visites médicales programmées à l&apos;avance.</p>
        </div>

        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <span className="material-symbols-outlined text-xl">event_available</span>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total planifiés</div>
            <div className="text-lg font-extrabold text-slate-900">{appointmentsList.length} RDV</div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            Carnet des rendez-vous ({appointmentsList.length})
          </h2>
        </div>
        
        <div>
          {appointmentsList.length === 0 ? (
            <div className="text-center text-slate-500 py-16 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
                <span className="material-symbols-outlined text-3xl">event_busy</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Aucun rendez-vous planifié</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Les futures réservations ajoutées apparaîtront ici chronologiquement.</p>
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

                return (
                  <MotionDiv 
                    key={appt.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-5 sm:p-6 hover:bg-slate-50/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Date Block */}
                      <div className="w-13 h-13 rounded-2xl bg-linear-to-b from-indigo-50 to-indigo-100/70 border border-indigo-200/80 flex flex-col items-center justify-center text-indigo-900 shadow-xs">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600">
                          {monthName}
                        </span>
                        <span className="text-lg font-extrabold leading-none">
                          {dayNumber}
                        </span>
                      </div>

                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
                        {initials}
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-700 transition-colors">
                          {appt.patient.lastName} {appt.patient.firstName}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="capitalize font-medium">{fullDate}</span>
                          <span>•</span>
                          <span>{appt.patient.age} ans</span>
                          {appt.patient.phone && (
                            <>
                              <span>•</span>
                              <span>{appt.patient.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end">
                      {role === 'assistant' && (
                        <TransformAppointmentButton appointmentId={appt.id} patientId={appt.patient.id} />
                      )}
                      {role === 'doctor' && (
                        <span className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200/70 text-indigo-700 rounded-xl text-xs font-bold uppercase tracking-wider">
                          Confirmé
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
