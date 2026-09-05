import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients, appointments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import AddPatientModal from "@/components/AddPatientModal";
import { MotionDiv } from "@/components/MotionWrapper";

export const dynamic = "force-dynamic";

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
  const readyPatient = todayVisits.find(v => v.status === 'ready');
  const revenueToday = todayVisits.reduce((acc, v) => acc + (v.amountToPay ? parseFloat(v.amountToPay as string) : 0), 0);

  const todayAppointmentsCount = allAppointments.filter(a => {
    const d = new Date(a.date);
    d.setHours(0,0,0,0);
    return d.getTime() === today.getTime();
  }).length;

  if (role === 'assistant') {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Accueil & Administration
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Gestion du Cabinet
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Suivi en temps réel de la salle d&apos;attente et des flux patients.
            </p>
          </div>

          {/* Actions rapides */}
          <div className="flex items-center gap-3">
            <AddPatientModal />
            <Link
              href="/dashboard/queue"
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm shadow-xs transition-all"
            >
              <span className="material-symbols-outlined text-lg text-slate-500">queue</span>
              <span>Salle d&apos;attente</span>
            </Link>
          </div>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            whileHover={{ y: -3 }}
            className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">chair</span>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                En attente
              </span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Patients en salle</p>
              <h2 className="text-3xl font-black text-slate-900 mt-1">
                {waitingCount} <span className="text-sm font-semibold text-slate-400">personne{waitingCount > 1 ? 's' : ''}</span>
              </h2>
            </div>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -3 }}
            className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-teal-50 border border-teal-100 text-teal-600 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">check_circle</span>
              </div>
              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">
                Aujourd&apos;hui
              </span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Consultations terminées</p>
              <h2 className="text-3xl font-black text-slate-900 mt-1">
                {finishedCount} <span className="text-sm font-semibold text-slate-400">dossier{finishedCount > 1 ? 's' : ''}</span>
              </h2>
            </div>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={{ y: -3 }}
            className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-sky-50 border border-sky-100 text-sky-600 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">calendar_month</span>
              </div>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200/60">
                Planifié
              </span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Rendez-vous programmés</p>
              <h2 className="text-3xl font-black text-slate-900 mt-1">
                {todayAppointmentsCount} <span className="text-sm font-semibold text-slate-400">patient{todayAppointmentsCount > 1 ? 's' : ''}</span>
              </h2>
            </div>
          </MotionDiv>
        </div>
      </div>
    );
  }

  // Dashboard Docteur (Chic & Exécutif)
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-[11px] font-bold uppercase tracking-wider text-sky-700 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
          Espace Praticien • Synthèse Clinique
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Cabinet Médical
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Vue d&apos;ensemble clinique et consultations de la journée.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Colonne Principale (Prochain patient) */}
        <MotionDiv
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-2 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Prochain Patient</h2>
            {readyPatient && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Salle de consultation prête
              </span>
            )}
          </div>
          
          {readyPatient ? (
            <div className="bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 border border-emerald-200/90 p-8 rounded-3xl shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-600/20">
                    {readyPatient.patient.firstName[0]}{readyPatient.patient.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {readyPatient.patient.lastName} {readyPatient.patient.firstName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Patient envoyé par l&apos;assistante • {readyPatient.patient.age ? `${readyPatient.patient.age} ans` : "Âge non précisé"}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/dashboard/consultation/${readyPatient.id}`}
                  className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-7 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.99]"
                >
                  <span>Démarrer la consultation</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 p-12 rounded-3xl text-center flex flex-col items-center justify-center shadow-xs">
              <div className="w-14 h-14 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
                <span className="material-symbols-outlined text-2xl">check_circle</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Aucun patient en attente directe</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                L&apos;assistante vous enverra le prochain patient dès qu&apos;il sera prêt.
              </p>
            </div>
          )}
        </MotionDiv>

        {/* Colonne Latérale (Stats du Jour) */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Activité du Jour</h2>
          
          <div className="space-y-3">
            <MotionDiv
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ x: 2 }}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
                  <span className="material-symbols-outlined text-xl">clinical_notes</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Consultations effectuées</p>
                  <h4 className="text-xl font-bold text-slate-900">{finishedCount}</h4>
                </div>
              </div>
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              whileHover={{ x: 2 }}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                  <span className="material-symbols-outlined text-xl">payments</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Recettes perçues</p>
                  <h4 className="text-xl font-bold text-emerald-700">
                    {revenueToday.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-400">DH</span>
                  </h4>
                </div>
              </div>
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ x: 2 }}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
                  <span className="material-symbols-outlined text-xl">hourglass_empty</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">En salle d&apos;attente</p>
                  <h4 className="text-xl font-bold text-slate-900">{waitingCount}</h4>
                </div>
              </div>
            </MotionDiv>
          </div>
        </div>
      </div>
    </div>
  );
}
