import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { visits, patients, appointments, clinics } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import Link from "next/link";
import AddPatientModal from "@/components/AddPatientModal";
import AddAppointmentModal from "@/components/AddAppointmentModal";
import PatientHistoryButton from "@/components/PatientHistoryButton";
import CancelVisitButton from "@/components/CancelVisitButton";
import TransformAppointmentButton from "@/components/TransformAppointmentButton";

export const dynamic = "force-dynamic";

export default async function DashboardIndex() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const role = (session?.user as any)?.role;
  const clinicId = await getTenantClinicId();

  const [allVisits, allAppointments, clinicData] = await Promise.all([
    db
      .select({
        id: visits.id,
        status: visits.status,
        paymentStatus: visits.paymentStatus,
        isAppointment: visits.isAppointment,
        createdAt: visits.createdAt,
        amountToPay: visits.amountToPay,
        patient: patients,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(eq(visits.clinicId, clinicId))
      .orderBy(desc(visits.createdAt)),
    db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        date: appointments.date,
        time: appointments.time,
        reason: appointments.reason,
        status: appointments.status,
        patient: patients,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(eq(appointments.clinicId, clinicId)),
    db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1),
  ]);

  const currentClinic = clinicData[0];
  const isTrial = currentClinic?.subscriptionStatus === "trial";
  const trialDaysRemaining = currentClinic?.subscriptionExpiresAt
    ? Math.max(0, Math.ceil((new Date(currentClinic.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 7;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayVisits = allVisits.filter((v) => v.createdAt >= today && v.status !== "cancelled");
  const waitingVisits = todayVisits.filter((v) => v.status === "waiting").reverse();
  const readyVisits = todayVisits.filter((v) => v.status === "ready");
  const finishedVisits = todayVisits.filter((v) => v.status === "finished");
  const pendingPaymentsCount = finishedVisits.filter((v) => v.paymentStatus !== "paid").length;
  const readyPatient = readyVisits[0];

  // Recettes effectivement perçues en caisse (uniquement les visites payées)
  const collectedRevenueToday = todayVisits
    .filter((v) => v.paymentStatus === "paid")
    .reduce((acc, v) => acc + (v.amountToPay ? parseFloat(v.amountToPay as string) : 0), 0);

  // Recettes en cours d'encaissement (consultations terminées avec montant fixé, que l'assistante doit encaisser)
  const pendingRevenueToday = todayVisits
    .filter((v) => v.status === "finished" && v.paymentStatus !== "paid")
    .reduce((acc, v) => acc + (v.amountToPay ? parseFloat(v.amountToPay as string) : 0), 0);

  // Rendez-vous programmés pour aujourd'hui
  const todayAppointments = allAppointments
    .filter((a) => {
      if (a.status === "cancelled") return false;
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    })
    .map((a) => {
      // Si la consultation de ce patient a été clôturée aujourd'hui, refléter immédiatement le statut terminé
      const isFinishedToday = finishedVisits.some((v) => v.patient.id === a.patientId);
      if (isFinishedToday && a.status !== "cancelled") {
        return { ...a, status: "completed" };
      }
      return a;
    })
    .sort((a, b) => {
      // Trier : les rendez-vous restants en premier, les terminés en dernier, puis par heure
      const orderA = a.status === "completed" ? 1 : 0;
      const orderB = b.status === "completed" ? 1 : 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.time || "09:00").localeCompare(b.time || "09:00");
    });

  const todayAppointmentsCount = todayAppointments.length;
  const remainingAppointmentsCount = todayAppointments.filter((a) => a.status !== "completed").length;
  const completedAppointmentsCount = todayAppointments.filter((a) => a.status === "completed").length;

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  // ========================================================
  // VUE ASSISTANTE / ACCUEIL
  // ========================================================
  if (role === "assistant") {
    return (
      <div className="space-y-6">
        {/* BANDEAU PÉRIODE D'ESSAI 7 JOURS */}
        {isTrial && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[18px]">timer</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-950">
                    Période d'essai gratuite : Il reste {trialDaysRemaining} jour{trialDaysRemaining > 1 ? 's' : ''} de test
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold uppercase">
                    Cabinet en évaluation
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Toutes les fonctionnalités sont actives pour votre secrétariat.
                </p>
              </div>
            </div>
          </div>
        )}

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
            <p className="text-xs font-medium text-slate-500">Recettes en caisse</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
              {collectedRevenueToday.toLocaleString("fr-FR")}{" "}
              <span className="text-xs font-normal text-slate-500">DH</span>
            </p>
            {pendingRevenueToday > 0 ? (
              <p className="text-[11px] text-amber-700 font-medium mt-0.5 truncate">
                +{pendingRevenueToday} DH à encaisser
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Caisse à jour
              </p>
            )}
          </div>
        </div>

        {/* ============================================================
            BLOC SPÉCIAL : PLANNING DES RENDEZ-VOUS DU JOUR (Couleur Indigo Dédiée)
           ============================================================ */}
        <div className="bg-white rounded-2xl border border-indigo-200/90 shadow-[0_1px_3px_rgba(30,27,75,0.06)] overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-50/90 via-sky-50/40 to-indigo-50/90 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <span className="material-symbols-outlined text-[18px]">event_available</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    Rendez-vous programmés aujourd'hui
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold tabular-nums">
                    {todayAppointments.length} RDV
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Dès qu'un patient se présente au secrétariat, validez son arrivée pour le faire entrer en salle d'attente en 1 clic.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/appointments"
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline underline-offset-4 self-start sm:self-auto shrink-0"
            >
              Voir le calendrier complet &rarr;
            </Link>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="py-8 px-6 text-center bg-slate-50/40">
              <span className="material-symbols-outlined text-slate-300 text-3xl mb-1 block">
                calendar_today
              </span>
              <p className="text-xs font-semibold text-slate-600">
                Aucun rendez-vous programmé pour aujourd'hui
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Utilisez « Nouveau rendez-vous » en haut à droite pour fixer un créneau.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-indigo-50/80">
              {todayAppointments.map((appt) => {
                const isCompleted = appt.status === "completed";
                const isAdmitted = appt.status === "admitted";
                return (
                  <div
                    key={appt.id}
                    className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isCompleted ? "bg-slate-50/60 opacity-65" : isAdmitted ? "bg-slate-50/50" : "hover:bg-indigo-50/30 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Badge Heure du RDV */}
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black tabular-nums shrink-0 border ${
                        isCompleted
                          ? "bg-slate-100 text-slate-500 border-slate-200 line-through"
                          : "bg-indigo-100 text-indigo-950 border-indigo-200"
                      }`}>
                        {appt.time || "09:00"}
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-xs font-bold truncate ${isCompleted ? "text-slate-600 line-through" : "text-slate-900"}`}>
                            {appt.patient.lastName} {appt.patient.firstName}
                          </p>
                          <span className="text-[11px] text-slate-500">
                            ({appt.patient.age} ans)
                          </span>
                          {appt.patient.phone && (
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              &bull; {appt.patient.phone}
                            </span>
                          )}
                          {appt.patient.mutuelle && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {appt.patient.mutuelle}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Motif : <span className="text-slate-700 font-medium">{appt.reason || "Consultation générale"}</span>
                        </p>
                      </div>
                    </div>

                    {/* Statut ou Bouton d'admission en 1 clic */}
                    <div className="shrink-0 self-start sm:self-auto">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
                          <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                          <span>Consultation terminée</span>
                        </span>
                      ) : isAdmitted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Arrivé en salle d'attente</span>
                        </span>
                      ) : (
                        <TransformAppointmentButton
                          appointmentId={appt.id}
                          patientId={appt.patientId}
                          variant="dashboard"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Flux des patients du jour */}
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {v.patient.lastName} {v.patient.firstName}
                        </p>
                        {v.isAppointment && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                            Sur RDV
                          </span>
                        )}
                      </div>
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
      {/* BANDEAU PÉRIODE D'ESSAI 7 JOURS */}
      {isTrial && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[18px]">timer</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-950">
                  Période d'essai gratuite : Il vous reste {trialDaysRemaining} jour{trialDaysRemaining > 1 ? 's' : ''} de test
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold uppercase">
                  Formule {currentClinic?.plan === 'standard' ? 'Standard' : 'Pro'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Vous testez actuellement toutes les fonctionnalités en cabinet. Aucun règlement n'est exigé avant la fin de votre essai.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Link
              href="/dashboard/settings"
              className="px-3 py-1.5 rounded-lg bg-white border border-purple-200 hover:bg-purple-50 text-purple-900 text-xs font-semibold transition"
            >
              Voir mon abonnement
            </Link>
            <a
              href="https://wa.me/212600000000?text=Bonjour,%20je%20souhaite%20valider%20mon%20abonnement%20MonCabinet"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-2xs"
            >
              Support WhatsApp
            </a>
          </div>
        </div>
      )}

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
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">RDV du jour</p>
            {completedAppointmentsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                {completedAppointmentsCount} honoré{completedAppointmentsCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {todayAppointmentsCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {todayAppointmentsCount === 0
              ? "Aucun RDV prévu"
              : remainingAppointmentsCount === 0
              ? "Tous les RDV ont été honorés"
              : `${remainingAppointmentsCount} restant${remainingAppointmentsCount > 1 ? "s" : ""} à recevoir`}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Recettes en caisse</p>
            {pendingRevenueToday > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold">
                {pendingPaymentsCount} à encaisser
              </span>
            )}
          </div>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {collectedRevenueToday.toLocaleString("fr-FR")}{" "}
            <span className="text-xs font-normal text-slate-500">DH</span>
          </p>
          {pendingRevenueToday > 0 ? (
            <p className="text-[11px] text-amber-700 font-medium mt-1 truncate">
              + {pendingRevenueToday.toLocaleString("fr-FR")} DH en cours d'encaissement
            </p>
          ) : (
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              Tous les encaissements à jour
            </p>
          )}
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
              {/* Ligne Identité du patient */}
              <div className="flex items-center justify-between gap-4 min-w-0">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm sm:text-base shrink-0 shadow-xs">
                    {readyPatient.patient.firstName[0]}
                    {readyPatient.patient.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                        {readyPatient.patient.lastName} {readyPatient.patient.firstName}
                      </h3>
                      {readyPatient.isAppointment && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px]">
                          Sur RDV
                        </span>
                      )}
                    </div>
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

              {/* Barre d'actions responsive */}
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

        {/* Colonne latérale : File d'attente & Rendez-vous du jour */}
        <div className="space-y-4">
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
              <div className="py-8 px-5 text-center text-xs text-slate-500">
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
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {v.patient.lastName} {v.patient.firstName}
                          </p>
                          {v.isAppointment && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold">
                              RDV
                            </span>
                          )}
                        </div>
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

          {/* Planning des Rendez-vous du jour pour le médecin */}
          <div className="bg-white rounded-xl border border-indigo-200/80 shadow-[0_1px_2px_rgba(30,27,75,0.04)] overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-50/80 to-sky-50/40 border-b border-indigo-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-base">event_available</span>
                <span>Rendez-vous du jour ({todayAppointments.length})</span>
                {remainingAppointmentsCount === 0 && todayAppointments.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                    Tous vus
                  </span>
                )}
              </h2>
              <Link href="/dashboard/appointments" className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900">
                Planning &rarr;
              </Link>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="py-6 px-5 text-center text-xs text-slate-400">
                Aucun RDV aujourd'hui.
              </div>
            ) : (
              <div className="divide-y divide-indigo-50/60 max-h-60 overflow-y-auto">
                {todayAppointments.map((appt) => {
                  const isCompleted = appt.status === "completed";
                  const isAdmitted = appt.status === "admitted";
                  return (
                    <div
                      key={appt.id}
                      className={`px-4 py-2.5 flex items-center justify-between gap-2.5 text-xs transition ${
                        isCompleted ? "bg-slate-50/60 opacity-65" : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] tabular-nums shrink-0 ${
                          isCompleted
                            ? "bg-slate-100 text-slate-500 line-through"
                            : isAdmitted
                            ? "bg-emerald-100 text-emerald-950"
                            : "bg-indigo-100 text-indigo-950"
                        }`}>
                          {appt.time || "09:00"}
                        </span>
                        <div className="min-w-0">
                          <p className={`font-semibold truncate text-xs ${
                            isCompleted ? "text-slate-600 line-through" : "text-slate-900"
                          }`}>
                            {appt.patient.lastName} {appt.patient.firstName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {appt.reason || "Consultation"}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                        isCompleted
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : isAdmitted
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}>
                        {isCompleted && (
                          <span className="material-symbols-outlined text-[13px] text-emerald-600">check</span>
                        )}
                        {isCompleted ? "Terminé" : isAdmitted ? "En salle" : "Attendu"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
