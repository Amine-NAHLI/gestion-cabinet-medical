"use client";

import { useState, useMemo } from "react";
import AddAppointmentModal from "@/components/AddAppointmentModal";
import { transformAppointmentToVisit, cancelAppointment } from "@/actions/appointments";

export interface AppointmentItem {
  id: number;
  date: string;
  time: string | null;
  reason: string | null;
  status: string;
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    age: number;
    phone: string;
    gender?: string | null;
    cin?: string | null;
    mutuelle?: string | null;
    bloodGroup?: string | null;
    allergies?: string | null;
    antecedents?: string | null;
  };
}

interface AppointmentsClientProps {
  initialAppointments: AppointmentItem[];
  role?: string;
}

export default function AppointmentsClient({
  initialAppointments,
  role,
}: AppointmentsClientProps) {
  const [appointmentsList, setAppointmentsList] = useState<AppointmentItem[]>(initialAppointments);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "upcoming">("all");
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // Fonctions de comparaison de dates
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  const isSameDayAsToday = (d: Date) =>
    d.getFullYear() === todayYear &&
    d.getMonth() === todayMonth &&
    d.getDate() === todayDate;

  const isFutureDate = (d: Date) => {
    const check = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = new Date(todayYear, todayMonth, todayDate);
    return check.getTime() > today.getTime();
  };

  const isPastDate = (d: Date) => {
    const check = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = new Date(todayYear, todayMonth, todayDate);
    return check.getTime() < today.getTime();
  };

  const getRelativeDayLabel = (d: Date): string => {
    const check = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const today = new Date(todayYear, todayMonth, todayDate).getTime();
    const diffDays = Math.round((check - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Demain";
    if (diffDays === 2) return "Après-demain";
    if (diffDays > 2) return `Dans ${diffDays} jours`;
    if (diffDays === -1) return "Hier";
    return `Il y a ${Math.abs(diffDays)} jours`;
  };

  // Transformation en visite d'aujourd'hui (mise en file d'attente)
  const handleAdmit = async (appointmentId: number, patientId: number) => {
    try {
      setLoadingId(appointmentId);
      const res = await transformAppointmentToVisit(appointmentId, patientId);
      if (res && res.success) {
        showToast("Patient admis en salle d'attente avec succès.");
        setAppointmentsList((prev) =>
          prev.map((a) => (a.id === appointmentId ? { ...a, status: "admitted" } : a))
        );
      } else {
        showToast(res?.error || "Erreur lors de l'admission.");
      }
    } catch {
      showToast("Erreur lors de l'admission en salle d'attente.");
    } finally {
      setLoadingId(null);
    }
  };

  // Annulation d'un rendez-vous
  const handleCancel = async (appointmentId: number, patientName: string) => {
    if (!confirm(`Annuler le rendez-vous de ${patientName} ?`)) return;
    try {
      setCancellingId(appointmentId);
      const res = await cancelAppointment(appointmentId);
      if (res && res.success) {
        showToast("Rendez-vous annulé.");
        setAppointmentsList((prev) => prev.filter((a) => a.id !== appointmentId));
      } else {
        showToast(res?.error || "Erreur lors de l'annulation.");
      }
    } catch {
      showToast("Erreur lors de l'annulation du rendez-vous.");
    } finally {
      setCancellingId(null);
    }
  };

  // Séparation stricte : Rendez-vous du jour, À venir, et Historique séparé
  const { todayAppointments, upcomingAppointments, pastAppointments } = useMemo(() => {
    const todayList: AppointmentItem[] = [];
    const upcomingList: AppointmentItem[] = [];
    const pastList: AppointmentItem[] = [];

    const q = search.trim().toLowerCase();

    for (const appt of appointmentsList) {
      if (q) {
        const pName = `${appt.patient.lastName} ${appt.patient.firstName}`.toLowerCase();
        const pPhone = appt.patient.phone.toLowerCase();
        const pReason = (appt.reason || "").toLowerCase();
        const pCin = (appt.patient.cin || "").toLowerCase();
        if (!pName.includes(q) && !pPhone.includes(q) && !pReason.includes(q) && !pCin.includes(q)) {
          continue;
        }
      }

      const d = new Date(appt.date);
      if (isSameDayAsToday(d)) {
        todayList.push(appt);
      } else if (isFutureDate(d)) {
        upcomingList.push(appt);
      } else if (isPastDate(d)) {
        pastList.push(appt);
      }
    }

    // Tri
    todayList.sort((a, b) => (a.time || "09:00").localeCompare(b.time || "09:00"));
    upcomingList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    pastList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      todayAppointments: todayList,
      upcomingAppointments: upcomingList,
      pastAppointments: pastList,
    };
  }, [appointmentsList, search]);

  const activeTotalCount = todayAppointments.length + upcomingAppointments.length;

  return (
    <div className="space-y-6">
      {/* Toast d'action */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-xl text-xs font-bold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Rendez-vous</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Planning actif du cabinet : rendez-vous du jour et créneaux à venir.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AddAppointmentModal />
        </div>
      </div>

      {/* Switcher d'onglets principaux : Planning actif vs Historique séparé */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <div className="grid grid-cols-2 gap-1.5 flex-1 max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "active"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">event_upcoming</span>
            <span>Planning actif</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "active" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {activeTotalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "history"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">history</span>
            <span>Historique des RDV</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "history" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {pastAppointments.length}
            </span>
          </button>
        </div>

        {/* Barre de recherche rapide */}
        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer patient, motif, tél..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[13px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTENU SELON L'ONGLET SÉLECTIONNÉ */}
      {activeTab === "active" ? (
        <div className="space-y-6">
          {/* Sous-filtres rapides du planning actif */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Affichage :</span>
            {[
              { id: "all", label: `Tout le planning actif (${activeTotalCount})` },
              { id: "today", label: `Rendez-vous du jour uniquement (${todayAppointments.length})` },
              { id: "upcoming", label: `À venir uniquement (${upcomingAppointments.length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  activeFilter === f.id
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* PARTIE 1 : RENDEZ-VOUS DU JOUR */}
          {(activeFilter === "all" || activeFilter === "today") && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Rendez-vous du jour
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                    {todayAppointments.length}
                  </span>
                </div>

                <span className="text-xs text-slate-500 font-medium">
                  {new Date().toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              {todayAppointments.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-1">
                  <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">
                    event_available
                  </span>
                  <p className="font-semibold text-xs text-slate-700">Aucun rendez-vous prévu pour aujourd'hui.</p>
                  <p className="text-[11px] text-slate-400">
                    Les consultations spontanées en file d'attente s'affichent dans l'espace Salle d'attente.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {todayAppointments.map((appt) => {
                    const initials = `${appt.patient.firstName[0] || ""}${appt.patient.lastName[0] || ""}`.toUpperCase();
                    const isCompleted = appt.status === "completed";
                    const isAdmitted = appt.status === "admitted";

                    return (
                      <div
                        key={appt.id}
                        className={`p-4 sm:p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                          isCompleted
                            ? "bg-slate-50/70 opacity-70"
                            : isAdmitted
                            ? "bg-emerald-50/30"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          {/* Heure du RDV */}
                          <div className="w-13 h-13 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0 shadow-2xs">
                            <span className="text-[10px] text-slate-300 uppercase font-bold">Heure</span>
                            <span className="text-sm font-bold font-mono tabular-nums leading-tight">
                              {appt.time || "09:00"}
                            </span>
                          </div>

                          <div className="hidden sm:flex w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs items-center justify-center shrink-0">
                            {initials}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-sm truncate">
                                {appt.patient.lastName} {appt.patient.firstName}
                              </h3>
                              {appt.reason && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                                  {appt.reason}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                              <span>{appt.patient.age} ans</span>
                              <span>•</span>
                              <span className="font-mono">{appt.patient.phone}</span>
                              {appt.patient.cin && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-slate-400">CIN : {appt.patient.cin}</span>
                                </>
                              )}
                              {appt.patient.mutuelle && (
                                <>
                                  <span>•</span>
                                  <span className="text-sky-800 font-semibold">{appt.patient.mutuelle}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Statut & Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                          {isCompleted ? (
                            <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                              <span>Honoré / Terminé</span>
                            </span>
                          ) : isAdmitted ? (
                            <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>En salle d'attente</span>
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={loadingId === appt.id}
                                onClick={() => handleAdmit(appt.id, appt.patient.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                                title="Faire entrer le patient en salle d'attente"
                              >
                                <span className="material-symbols-outlined text-[15px]">how_to_reg</span>
                                <span>{loadingId === appt.id ? "Admission..." : "Admettre en salle"}</span>
                              </button>

                              <button
                                type="button"
                                disabled={cancellingId === appt.id}
                                onClick={() => handleCancel(appt.id, `${appt.patient.lastName} ${appt.patient.firstName}`)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Annuler ce rendez-vous"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PARTIE 2 : RENDEZ-VOUS À VENIR (AVEC DATE BIEN MISE EN VALEUR) */}
          {(activeFilter === "all" || activeFilter === "upcoming") && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-indigo-600 text-[20px]">calendar_month</span>
                  <h2 className="text-sm font-bold text-slate-900">
                    Rendez-vous à venir
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-bold text-[11px]">
                    {upcomingAppointments.length}
                  </span>
                </div>

                <span className="text-xs text-slate-400 font-medium">
                  Créneaux futurs programmés
                </span>
              </div>

              {upcomingAppointments.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-1">
                  <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">
                    event_note
                  </span>
                  <p className="font-semibold text-xs text-slate-700">Aucun rendez-vous futur planifié.</p>
                  <p className="text-[11px] text-slate-400">
                    Utilisez le bouton « Nouveau rendez-vous » pour enregistrer les prochaines consultations.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {upcomingAppointments.map((appt) => {
                    const d = new Date(appt.date);
                    const dayNumber = d.getDate();
                    const monthName = d.toLocaleDateString("fr-FR", { month: "short" });
                    const fullDateStr = d.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                    const relativeLabel = getRelativeDayLabel(d);
                    const initials = `${appt.patient.firstName[0] || ""}${appt.patient.lastName[0] || ""}`.toUpperCase();

                    return (
                      <div
                        key={appt.id}
                        className="p-4 sm:p-5 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group"
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          {/* Bloc Date mise en avant */}
                          <div className="w-13 h-13 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                            <span className="text-[10px] uppercase font-bold text-indigo-700 leading-none">
                              {monthName}
                            </span>
                            <span className="text-base font-bold leading-tight tabular-nums">
                              {dayNumber}
                            </span>
                            <span className="text-[10px] font-mono text-indigo-950 font-bold leading-none">
                              {appt.time || "09:00"}
                            </span>
                          </div>

                          <div className="hidden sm:flex w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs items-center justify-center shrink-0">
                            {initials}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-900 transition">
                                {appt.patient.lastName} {appt.patient.firstName}
                              </h3>
                              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 text-[10px] font-bold">
                                {relativeLabel}
                              </span>
                              {appt.reason && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                                  {appt.reason}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                              <span className="font-semibold text-slate-700 capitalize">
                                {fullDateStr} à {appt.time || "09:00"}
                              </span>
                              <span>•</span>
                              <span>{appt.patient.age} ans</span>
                              <span>•</span>
                              <span className="font-mono">{appt.patient.phone}</span>
                              {appt.patient.mutuelle && (
                                <>
                                  <span>•</span>
                                  <span className="text-sky-800 font-semibold">{appt.patient.mutuelle}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                          {role === "assistant" && (
                            <button
                              type="button"
                              disabled={loadingId === appt.id}
                              onClick={() => handleAdmit(appt.id, appt.patient.id)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="Admettre immédiatement si le patient est venu en avance"
                            >
                              <span className="material-symbols-outlined text-[14px]">login</span>
                              <span>{loadingId === appt.id ? "Admission..." : "Admettre en avance"}</span>
                            </button>
                          )}

                          {role === "doctor" && (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">
                              Planifié
                            </span>
                          )}

                          <button
                            type="button"
                            disabled={cancellingId === appt.id}
                            onClick={() => handleCancel(appt.id, `${appt.patient.lastName} ${appt.patient.firstName}`)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Annuler ce rendez-vous"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ONGLET SÉPARÉ : HISTORIQUE DES RENDEZ-VOUS PASSÉS */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-slate-500 text-[20px]">history</span>
              <h2 className="text-sm font-bold text-slate-900">
                Historique des rendez-vous antérieurs
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[11px]">
                {pastAppointments.length}
              </span>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              Archives des rendez-vous des jours passés
            </span>
          </div>

          {pastAppointments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-1">
              <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">
                inventory_2
              </span>
              <p className="font-semibold text-xs text-slate-700">Aucun rendez-vous passé archivé.</p>
              <p className="text-[11px] text-slate-400">
                Les anciens rendez-vous terminés ou dépassés apparaîtront automatiquement ici.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pastAppointments.map((appt) => {
                const d = new Date(appt.date);
                const dayNumber = d.getDate();
                const monthName = d.toLocaleDateString("fr-FR", { month: "short" });
                const fullDateStr = d.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                const isCompleted = appt.status === "completed";

                return (
                  <div
                    key={appt.id}
                    className="p-4 sm:p-5 opacity-75 hover:opacity-100 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-slate-50/40"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 leading-none">
                          {monthName}
                        </span>
                        <span className="text-sm font-bold tabular-nums">
                          {dayNumber}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {appt.time || "09:00"}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-800 text-sm truncate">
                            {appt.patient.lastName} {appt.patient.firstName}
                          </h3>
                          {appt.reason && (
                            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[11px]">
                              {appt.reason}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="capitalize">{fullDateStr}</span>
                          <span>•</span>
                          <span>{appt.patient.age} ans</span>
                          <span>•</span>
                          <span className="font-mono">{appt.patient.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end shrink-0">
                      {isCompleted ? (
                        <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-semibold inline-flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                          <span>Honoré / Terminé</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-500 rounded-md text-xs font-semibold">
                          Non honoré
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
