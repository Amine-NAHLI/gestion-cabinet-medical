import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients, appointments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import AddPatientModal from "@/components/AddPatientModal";
import { MotionDiv } from "@/components/MotionWrapper";

export default async function DashboardIndex() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  // Récupération globale pour les stats
  const allVisits = await db.select({
    id: visits.id,
    status: visits.status,
    createdAt: visits.createdAt,
    amountToPay: visits.amountToPay,
    patient: patients
  }).from(visits).innerJoin(patients, eq(visits.patientId, patients.id)).orderBy(desc(visits.createdAt));

  const allAppointments = await db.select().from(appointments);

  // Filtres pour aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayVisits = allVisits.filter(v => v.createdAt >= today);
  const waitingCount = todayVisits.filter(v => v.status === 'waiting').length;
  const finishedCount = todayVisits.filter(v => v.status === 'finished').length;
  const readyPatient = todayVisits.find(v => v.status === 'ready' || v.status === 'consulting');
  const revenueToday = todayVisits.reduce((acc, v) => acc + (v.amountToPay ? parseFloat(v.amountToPay as string) : 0), 0);

  const todayAppointmentsCount = allAppointments.filter(a => {
    const d = new Date(a.date);
    d.setHours(0,0,0,0);
    return d.getTime() === today.getTime();
  }).length;

  if (role === 'assistant') {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bonjour, Assistante 👋</h1>
          <p className="text-slate-500 mt-1">Voici le résumé de l'activité du cabinet pour aujourd'hui.</p>
        </div>

        {/* Actions rapides */}
        <div className="flex gap-4 mb-8">
          <AddPatientModal />
          <Link href="/dashboard/queue" className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold shadow-sm transition-all">
            <span className="material-symbols-outlined">queue</span>
            Gérer la salle d'attente
          </Link>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-2xl">weekend</span>
            </div>
            <div>
              <p className="text-slate-500 font-medium">En salle d'attente</p>
              <h2 className="text-4xl font-black text-slate-900 mt-1">{waitingCount} <span className="text-lg font-bold text-slate-400">patient(s)</span></h2>
            </div>
          </MotionDiv>

          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Consultés aujourd'hui</p>
              <h2 className="text-4xl font-black text-slate-900 mt-1">{finishedCount} <span className="text-lg font-bold text-slate-400">patient(s)</span></h2>
            </div>
          </MotionDiv>

          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-fuchsia-50 rounded-full blur-2xl"></div>
            <div className="w-12 h-12 bg-fuchsia-100 text-fuchsia-600 rounded-2xl flex items-center justify-center mb-4 relative z-10">
              <span className="material-symbols-outlined text-2xl">event</span>
            </div>
            <div className="relative z-10">
              <p className="text-slate-500 font-medium">Rendez-vous prévus ce jour</p>
              <h2 className="text-4xl font-black text-slate-900 mt-1">{todayAppointmentsCount}</h2>
            </div>
          </MotionDiv>
        </div>
      </div>
    );
  }

  // Dashboard Docteur
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bonjour, Docteur 👋</h1>
        <p className="text-slate-500 mt-1">Votre résumé clinique de la journée.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Colonne Principale (Prochain patient) */}
        <MotionDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-800">Votre Prochain Patient</h2>
          
          {readyPatient ? (
            <div className={`${readyPatient.status === 'consulting' ? 'bg-sky-50 border-sky-200' : 'bg-emerald-50 border-emerald-200'} border p-8 rounded-3xl shadow-sm relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 w-2 h-full ${readyPatient.status === 'consulting' ? 'bg-sky-500' : 'bg-emerald-500'}`}></div>
              <div className="flex items-start justify-between">
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block ${readyPatient.status === 'consulting' ? 'bg-sky-200 text-sky-800' : 'bg-emerald-200 text-emerald-800'}`}>
                    {readyPatient.status === 'consulting' ? 'En consultation' : 'Prêt pour vous'}
                  </span>
                  <h3 className="text-3xl font-black text-slate-900 mb-2">{readyPatient.patient.lastName} {readyPatient.patient.firstName}</h3>
                  <p className={`${readyPatient.status === 'consulting' ? 'text-sky-700' : 'text-emerald-700'} font-medium`}>
                    {readyPatient.status === 'consulting' ? 'Dossier ouvert. Cliquez pour reprendre.' : "L'assistante vous a envoyé ce patient."}
                  </p>
                </div>
                <Link href={`/dashboard/consultation/${readyPatient.id}`} className={`${readyPatient.status === 'consulting' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-md flex items-center gap-2`}>
                  {readyPatient.status === 'consulting' ? 'Reprendre' : 'Consulter'}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 rounded-3xl text-center flex flex-col items-center">
              <MotionDiv animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-300 mb-4">
                <span className="material-symbols-outlined text-3xl">coffee</span>
              </MotionDiv>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Aucun patient en attente</h3>
              <p className="text-slate-500 max-w-sm">L'assistante ne vous a pas encore envoyé de patient. Profitez de ce moment de répit !</p>
            </div>
          )}
        </MotionDiv>

        {/* Colonne Latérale (Stats) */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800">Statistiques du Jour</h2>
          
          <MotionDiv initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="w-14 h-14 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">group</span>
            </div>
            <div>
              <p className="text-slate-500 font-medium text-sm">Patients consultés</p>
              <h2 className="text-2xl font-black text-slate-900">{finishedCount}</h2>
            </div>
          </MotionDiv>

          <MotionDiv initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">payments</span>
            </div>
            <div>
              <p className="text-slate-500 font-medium text-sm">Recettes du jour</p>
              <h2 className="text-2xl font-black text-slate-900">{revenueToday} <span className="text-base text-slate-400 font-bold">DH</span></h2>
            </div>
          </MotionDiv>

          <MotionDiv initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">hourglass_empty</span>
            </div>
            <div>
              <p className="text-slate-500 font-medium text-sm">Dans la salle d'attente</p>
              <h2 className="text-2xl font-black text-slate-900">{waitingCount}</h2>
            </div>
          </MotionDiv>
        </div>
      </div>
    </div>
  );
}
