import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { visits, patients, appointments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import Link from "next/link";
import AddPatientModal from "@/components/AddPatientModal";
import AddAppointmentModal from "@/components/AddAppointmentModal";
import PatientHistoryButton from "@/components/PatientHistoryButton";
import CancelVisitButton from "@/components/CancelVisitButton";

export const dynamic = "force-dynamic";

export default async function DashboardIndex() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const role = (session?.user as any)?.role;
  const clinicId = await getTenantClinicId();

  const [allVisits, allAppointments] = await Promise.all([
    db
      .select({
        id: visits.id,
        status: visits.status,
        paymentStatus: visits.paymentStatus,
        createdAt: visits.createdAt,
        amountToPay: visits.amountToPay,
        patient: patients,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(eq(visits.clinicId, clinicId))
      .orderBy(desc(visits.createdAt)),
    db.select().from(appointments).where(eq(appointments.clinicId, clinicId)),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayVisits = allVisits.filter((v) => v.createdAt >= today && v.status !== "cancelled");
  const waitingVisits = todayVisits.filter((v) => v.status === "waiting").reverse();
  const readyVisits = todayVisits.filter((v) => v.status === "ready");
  const finishedVisits = todayVisits.filter((v) => v.status === "finished");
  const pendingPaymentsCount = finishedVisits.filter((v) => v.paymentStatus !== "paid").length;
  const readyPatient = readyVisits[0];

  const revenueToday = todayVisits.reduce(
    (acc, v) => acc + (v.amountToPay ? parseFloat(v.amountToPay as string) : 0),
    0
  );

  const todayAppointmentsCount = allAppointments.filter((a) => {
    if (a.status === "cancelled") return false;
    const d = new Date(a.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }).length;

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  // ========================================================
  // VUE ASSISTANTE / ACCUEIL
  // ========================================================
  if (role === "assistant") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Tableau de bord
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Suivi des arrivées, consultations et encaissements du jour.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <AddPatientModal />
            <AddAppointmentModal />
          </div>
        </div>

        {/* Bandeau métriques unifié (2x2 parfait sur mobile, 4x1 sur desktop) */}
        <div className="bg-slate-200/80 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px">
          <div className="bg-white p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">En salle d'attente</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
              {waitingVisits.length}
            </p>
          </div>
          <div className="bg-white p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Chez le médecin</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
              {readyVisits.length}
            </p>
          </div>
          <div className="bg-white p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Terminées</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
              {finishedVisits.length}
            </p>
          </div>
          <div className="bg-white p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">RDV du jour</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
              {todayAppointmentsCount}
            </p>
          </div>
        </div>

        {/* Flux du jour */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Patients du jour</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {pendingPaymentsCount > 0
                  ? `${pendingPaymentsCount} paiement${pendingPaymentsCount > 1 ? "s" : ""} en attente d'encaissement`
                  : "Tous les encaissements sont à jour"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
              <Link href="/dashboard/queue" className="text-slate-700 hover:text-slate-900 underline underline-offset-4">
                Gérer la file
              </Link>
              {pendingPaymentsCount > 0 && (
                <Link
                  href="/dashboard/payments"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                  Encaisser ({pendingPaymentsCount})
                </Link>
              )}
            </div>
          </div>

          {todayVisits.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <p className="text-sm font-medium text-slate-700">Aucun patient enregistré aujourd'hui</p>
              <p className="text-xs text-slate-500 mt-1">
                Utilisez « Nouvelle admission » pour enregistrer la première arrivée.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {todayVisits.slice(0, 10).map((v) => {
                const statusInfo =
                  v.status === "ready"
                    ? { label: "Chez le médecin", dot: "bg-emerald-500", text: "text-emerald-700" }
                    : v.status === "waiting"
                    ? { label: "En attente", dot: "bg-amber-500", text: "text-amber-700" }
                    : { label: "Terminée", dot: "bg-slate-400", text: "text-slate-600" };

                return (
                  <div
                    key={v.id}
                    className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {v.patient.lastName} {v.patient.firstName}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {formatTime(v.createdAt)} • {v.patient.age} ans • <span className="whitespace-nowrap">{v.patient.phone}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusInfo.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>

                      {v.status === "finished" && v.amountToPay && (
                        <span className="text-xs font-medium text-slate-700 tabular-nums">
                          {parseFloat(v.amountToPay as string).toFixed(0)} DH
                          <span className="text-slate-400 ml-1">
                            ({v.paymentStatus === "paid" ? "Payé" : "À encaisser"})
                          </span>
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
    );
  }

  // ========================================================
  // VUE MÉDECIN PRATICIEN
  // ========================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Consultations en cours et activité clinique de la journée.
          </p>
        </div>

        <Link
          href="/dashboard/queue"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 hover:text-slate-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition self-start"
        >
          <span className="material-symbols-outlined text-[17px] text-slate-400">groups</span>
          <span>Voir la salle d'attente</span>
        </Link>
      </div>

      {/* Bandeau métriques unifié (2x2 parfait sur mobile, 4x1 sur desktop) */}
      <div className="bg-slate-200/80 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px">
        <div className="bg-white p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">En salle d'attente</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {waitingVisits.length}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Terminées</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {finishedVisits.length}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">RDV du jour</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {todayAppointmentsCount}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Recettes du jour</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {revenueToday.toLocaleString("fr-FR")}{" "}
            <span className="text-xs font-normal text-slate-500">DH</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Prochain Patient prêt en consultation */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Patient prêt à recevoir</h2>
            {readyPatient && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                En salle
              </span>
            )}
          </div>

          {readyPatient ? (
            <div className="p-5 sm:p-6 space-y-4">
              {/* Ligne Identité du patient (pleine largeur, ne se comprime jamais) */}
              <div className="flex items-center justify-between gap-4 min-w-0">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm sm:text-base shrink-0 shadow-xs">
                    {readyPatient.patient.firstName[0]}
                    {readyPatient.patient.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                      {readyPatient.patient.lastName} {readyPatient.patient.firstName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-700 whitespace-nowrap">
                        {readyPatient.patient.age} ans
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700 whitespace-nowrap tabular-nums">
                        <span className="material-symbols-outlined text-[14px] text-slate-400">call</span>
                        {readyPatient.patient.phone}
                      </span>
                      {readyPatient.patient.mutuelle && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] whitespace-nowrap">
                            {readyPatient.patient.mutuelle}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Barre d'actions responsive avec respiration propre et aucun débordement */}
              <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {allVisits.some(
                    (v) =>
                      v.patient.id === readyPatient.patient.id &&
                      v.id !== readyPatient.id &&
                      v.status === "finished"
                  ) && (
                    <PatientHistoryButton
                      patientId={readyPatient.patient.id}
                      visitIdToOpen={readyPatient.id}
                      patientName={`${readyPatient.patient.lastName} ${readyPatient.patient.firstName}`}
                      variant="compact"
                    />
                  )}

                  <CancelVisitButton
                    variant="button"
                    visitId={readyPatient.id}
                    patientName={`${readyPatient.patient.lastName} ${readyPatient.patient.firstName}`}
                  />
                </div>

                <Link
                  href={`/dashboard/consultation/${readyPatient.id}`}
                  className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-2xs hover:shadow-xs shrink-0 whitespace-nowrap"
                >
                  <span>Ouvrir la consultation</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-12 px-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                Aucun patient appelé pour le moment
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Dès que votre assistante vous enverra le prochain patient, il apparaîtra ici automatiquement.
              </p>
            </div>
          )}
        </div>

        {/* File d'attente en direct */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              En attente ({waitingVisits.length})
            </h2>
            <Link href="/dashboard/queue" className="text-xs font-medium text-slate-500 hover:text-slate-900">
              Tout voir
            </Link>
          </div>

          {waitingVisits.length === 0 ? (
            <div className="py-10 px-5 text-center text-xs text-slate-500">
              La salle d'attente est vide.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {waitingVisits.slice(0, 6).map((v, idx) => (
                <div key={v.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-medium text-slate-400 tabular-nums w-4">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {v.patient.lastName} {v.patient.firstName}
                      </p>
                      <p className="text-xs text-slate-500">{v.patient.age} ans</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums shrink-0">
                    {formatTime(v.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
