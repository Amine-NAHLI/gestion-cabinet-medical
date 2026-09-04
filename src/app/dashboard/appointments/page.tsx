import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import TransformAppointmentButton from "@/components/TransformAppointmentButton";

export default async function AppointmentsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Rendez-vous prévus</h1>
        <p className="text-slate-500 mt-1">Liste des patients ayant un prochain rendez-vous de planifié.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-fuchsia-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500"></span>
            Carnet de rendez-vous ({appointmentsList.length})
          </h2>
        </div>
        
        <div className="p-0">
          {appointmentsList.length === 0 ? (
            <div className="text-center text-slate-500 py-16 flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl mb-3 text-slate-300">event_busy</span>
              <p>Aucun rendez-vous prévu pour le moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {appointmentsList.map(appt => (
                <div key={appt.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-fuchsia-100 flex items-center justify-center text-fuchsia-600 font-bold">
                      <span className="material-symbols-outlined">calendar_month</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg group-hover:text-fuchsia-600 transition-colors">
                        {appt.patient.lastName} {appt.patient.firstName}
                      </h3>
                      <p className="text-sm font-medium text-slate-500 mt-0.5">
                        Prévu le <span className="text-slate-700">{appt.date.toLocaleDateString('fr-FR', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</span>
                      </p>
                    </div>
                  </div>
                  
                  {role === 'assistant' && (
                    <TransformAppointmentButton appointmentId={appt.id} patientId={appt.patient.id} />
                  )}
                  {role === 'doctor' && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">Planifié</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
