"use client";

import { useState, useEffect, useMemo } from "react";
import {
  adminApproveRequest,
  adminRejectRequest,
  adminDeleteRequest,
  adminUpdateUserPassword,
  adminDeleteClinic,
  getAdminDashboardData,
} from "@/actions/admin";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminDashboardClientProps {
  initialData: Awaited<ReturnType<typeof getAdminDashboardData>>;
  adminEmail: string;
}

type AdminPage = "stats" | "doctors" | "requests";

export default function AdminDashboardClient({
  initialData,
  adminEmail,
}: AdminDashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [activePage, setActivePage] = useState<AdminPage>(
    initialData.stats.pendingCount > 0 ? "requests" : "stats"
  );
  const [doctorSearch, setDoctorSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"all" | "approved" | "rejected" | "expired">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Modale modification de mot de passe
  const [passwordModalUser, setPasswordModalUser] = useState<{
    id: number;
    name: string;
    email: string;
    roleLabel: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Modale confirmation de suppression définitive d'un cabinet / médecin
  const [deleteTarget, setDeleteTarget] = useState<{
    clinicId: number;
    clinicName: string;
    doctorName: string;
    assistantsCount: number;
    patientsCount: number;
    visitsCount: number;
  } | null>(null);

  // Polling automatique toutes les 5 secondes (demandes OTP + stats en direct)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const fresh = await getAdminDashboardData();
        setData(fresh);
      } catch {
        // Ignorer les erreurs réseau ponctuelles
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Ticker 1s pour le compte à rebours OTP en direct
  useEffect(() => {
    if (data.pendingRequests.length === 0) return;
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [data.pendingRequests.length]);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  const refreshData = async (silent = false) => {
    if (!silent) setActionLoading("refreshing");
    try {
      const fresh = await getAdminDashboardData();
      setData(fresh);
      if (!silent) showFeedback("success", "Données actualisées en direct.");
    } catch {
      if (!silent) showFeedback("error", "Erreur lors de l'actualisation.");
    } finally {
      if (!silent) setActionLoading(null);
    }
  };

  // Déconnexion sécurisée sur le domaine actuel
  const handleAdminLogout = async () => {
    try {
      await signOut({ redirect: false });
    } finally {
      window.location.href = "/admin";
    }
  };

  // Approuver une demande en 1 clic
  const handleApprove = async (requestId: number) => {
    setActionLoading(`approve-${requestId}`);
    const res: any = await adminApproveRequest(requestId);
    if (res?.error) {
      showFeedback("error", res.error);
    } else {
      showFeedback("success", "Cabinet, médecin et assistante activés avec succès !");
      await refreshData(true);
    }
    setActionLoading(null);
  };

  // Rejeter une demande
  const handleReject = async (requestId: number) => {
    setActionLoading(`reject-${requestId}`);
    const res: any = await adminRejectRequest(requestId);
    if (res?.error) {
      showFeedback("error", res.error);
    } else {
      showFeedback("success", "Demande rejetée.");
      await refreshData(true);
    }
    setActionLoading(null);
  };

  // Supprimer une demande de l'historique
  const handleDeleteRequest = async (requestId: number) => {
    setActionLoading(`del-req-${requestId}`);
    const res: any = await adminDeleteRequest(requestId);
    if (res?.error) {
      showFeedback("error", res.error);
    } else {
      showFeedback("success", "Demande retirée de l'historique.");
      await refreshData(true);
    }
    setActionLoading(null);
  };

  // Suppression définitive d'un Médecin + son Cabinet + son Assistante
  const handleConfirmDeleteClinic = async () => {
    if (!deleteTarget) return;
    setActionLoading(`delete-clinic-${deleteTarget.clinicId}`);
    const res: any = await adminDeleteClinic(deleteTarget.clinicId);
    if (res?.error) {
      showFeedback("error", res.error);
    } else {
      showFeedback("success", res.message || "Cabinet supprimé définitivement.");
      setDeleteTarget(null);
      await refreshData(true);
    }
    setActionLoading(null);
  };

  // Modifier le mot de passe d'un médecin ou d'une assistante
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || newPassword.trim().length < 6) {
      showFeedback("error", "Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setActionLoading("update-password");
    const res: any = await adminUpdateUserPassword(passwordModalUser.id, newPassword.trim());
    if (res?.error) {
      showFeedback("error", res.error);
    } else {
      showFeedback("success", `Mot de passe de ${passwordModalUser.name} mis à jour !`);
      setPasswordModalUser(null);
      setNewPassword("");
    }
    setActionLoading(null);
  };

  const copyCredentials = () => {
    if (!passwordModalUser || !newPassword) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = `🏥 *Identifiants MonCabinet*\n👤 *Nom:* ${passwordModalUser.name} (${passwordModalUser.roleLabel})\n📧 *Email:* ${passwordModalUser.email}\n🔑 *Nouveau Mot de passe:* ${newPassword}\n🔗 *Lien:* ${origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  const getTimeRemainingText = (expiresAtStr: string) => {
    const diffMs = new Date(expiresAtStr).getTime() - nowTick;
    if (diffMs <= 0) return "Expiré";
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatMoney = (amount: number) =>
    `${Math.round(amount).toLocaleString("fr-FR")} DH`;

  // Filtrage des médecins & assistantes
  const filteredDoctors = useMemo(() => {
    const q = doctorSearch.trim().toLowerCase();
    if (!q) return data.doctorsWithAssistants;
    return data.doctorsWithAssistants.filter((item) => {
      const clinicMatch =
        item.clinic.name.toLowerCase().includes(q) ||
        item.clinic.city.toLowerCase().includes(q) ||
        item.clinic.specialty.toLowerCase().includes(q);
      const doctorMatch =
        item.doctor &&
        (item.doctor.name.toLowerCase().includes(q) ||
          item.doctor.email.toLowerCase().includes(q) ||
          item.doctor.phone.toLowerCase().includes(q));
      const assistantMatch = item.assistants.some(
        (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
      );
      return clinicMatch || doctorMatch || assistantMatch;
    });
  }, [data.doctorsWithAssistants, doctorSearch]);

  // Filtrage de l'historique des demandes
  const filteredRequestsHistory = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    return data.allRequests.filter((req) => {
      if (requestStatusFilter === "approved" && req.status !== "verified" && req.status !== "approved") {
        return false;
      }
      if (requestStatusFilter === "rejected" && req.status !== "rejected") return false;
      if (requestStatusFilter === "expired" && req.status !== "expired") return false;

      if (!q) return true;
      return (
        req.clinicName.toLowerCase().includes(q) ||
        req.clinicCity.toLowerCase().includes(q) ||
        req.doctorName.toLowerCase().includes(q) ||
        req.doctorEmail.toLowerCase().includes(q) ||
        (req.assistantName && req.assistantName.toLowerCase().includes(q)) ||
        (req.assistantEmail && req.assistantEmail.toLowerCase().includes(q))
      );
    });
  }, [data.allRequests, requestSearch, requestStatusFilter]);

  const maxMonthlyVisits = Math.max(
    1,
    ...data.stats.monthlyActivity.map((m) => m.visits)
  );
  const maxCityCount = Math.max(
    1,
    ...data.stats.citiesBreakdown.map((c) => c.count)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* 1. TOP EXECUTIVE NAVBAR (BLANC PRO) */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-sky-400 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  Mon<span className="text-sky-600">Cabinet</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Super Admin
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Administration Centrale de la Plateforme
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refreshData(false)}
              disabled={actionLoading === "refreshing"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer shadow-xs"
            >
              <span
                className={`material-symbols-outlined text-sm text-slate-500 ${
                  actionLoading === "refreshing" ? "animate-spin" : ""
                }`}
              >
                refresh
              </span>
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{adminEmail}</span>
            </div>

            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION DES 3 PAGES ADMIN */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 border-t border-slate-100 bg-slate-50/50">
          <nav className="flex items-center gap-2 overflow-x-auto py-2.5">
            <button
              onClick={() => setActivePage("stats")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activePage === "stats"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-base">bar_chart</span>
              <span>Statistiques Globales</span>
            </button>

            <button
              onClick={() => setActivePage("doctors")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activePage === "doctors"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-base">medical_services</span>
              <span>Médecins & Assistantes</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activePage === "doctors"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {data.doctorsWithAssistants.length}
              </span>
            </button>

            <button
              onClick={() => setActivePage("requests")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activePage === "requests"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-base">inbox</span>
              <span>Demandes de Création</span>
              {data.stats.pendingCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                  {data.stats.pendingCount} en attente
                </span>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activePage === "requests"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {data.allRequests.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* FEEDBACK TOAST */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 right-4 sm:right-6 z-50"
          >
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-xs font-bold ${
                feedback.type === "success"
                  ? "bg-white border-emerald-200 text-emerald-800"
                  : "bg-white border-red-200 text-red-700"
              }`}
            >
              <span
                className={`material-symbols-outlined text-base ${
                  feedback.type === "success" ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {feedback.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{feedback.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* ============================================================
            PAGE 1 : STATISTIQUES GLOBALES DE LA PLATEFORME
           ============================================================ */}
        {activePage === "stats" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Statistiques Globales de MonCabinet
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vue consolidée en temps réel de tous les cabinets, patients, consultations et revenus.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    data.stats.resendConfigured ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span>
                  Passerelle Email Resend :{" "}
                  <strong className="text-slate-900">
                    {data.stats.resendConfigured ? "Connectée" : "Non configurée"}
                  </strong>
                </span>
              </div>
            </div>

            {/* 4 CARTES KPI PRINCIPALES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">local_hospital</span>
                  </div>
                  <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full">
                    {data.stats.totalUsers} comptes
                  </span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Cabinets & Médecins
                </p>
                <p className="text-3xl font-black text-slate-900 mt-1">{data.stats.totalClinics}</p>
                <p className="text-xs text-slate-500 mt-1.5">
                  {data.stats.totalDoctors} médecin{data.stats.totalDoctors > 1 ? "s" : ""} •{" "}
                  {data.stats.totalAssistants} assistante{data.stats.totalAssistants > 1 ? "s" : ""}
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">groups</span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                    {data.stats.totalAppointments} RDV actifs
                  </span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Dossiers Patients
                </p>
                <p className="text-3xl font-black text-slate-900 mt-1">{data.stats.totalPatients}</p>
                <p className="text-xs text-slate-500 mt-1.5">
                  Patients enregistrés sur toute la plateforme
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">stethoscope</span>
                  </div>
                  <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                    +{data.stats.visitsToday} aujourd'hui
                  </span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Consultations Totales
                </p>
                <p className="text-3xl font-black text-slate-900 mt-1">{data.stats.totalVisits}</p>
                <p className="text-xs text-slate-500 mt-1.5">
                  {data.stats.visitsThisMonth} ce mois • {data.stats.finishedVisits} terminées
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">payments</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    {data.stats.collectionRate}% encaissé
                  </span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Volume Financier Global
                </p>
                <p className="text-3xl font-black text-slate-900 mt-1">
                  {formatMoney(data.stats.totalRevenue)}
                </p>
                <p className="text-xs text-slate-500 mt-1.5">
                  Encaissé : {formatMoney(data.stats.paidRevenue)}
                </p>
              </div>
            </div>

            {/* PIPELINE DES DEMANDES D'INSCRIPTION */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-400">En attente (OTP)</p>
                  <p className="text-2xl font-black text-amber-600 mt-0.5">
                    {data.stats.pendingCount}
                  </p>
                </div>
                <span className="material-symbols-outlined text-2xl text-amber-400">hourglass_top</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-400">Demandes validées</p>
                  <p className="text-2xl font-black text-emerald-600 mt-0.5">
                    {data.stats.approvedRequestsCount}
                  </p>
                </div>
                <span className="material-symbols-outlined text-2xl text-emerald-400">verified</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-400">Rejetées</p>
                  <p className="text-2xl font-black text-red-600 mt-0.5">
                    {data.stats.rejectedRequestsCount}
                  </p>
                </div>
                <span className="material-symbols-outlined text-2xl text-red-400">cancel</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-400">Expirées</p>
                  <p className="text-2xl font-black text-slate-500 mt-0.5">
                    {data.stats.expiredRequestsCount}
                  </p>
                </div>
                <span className="material-symbols-outlined text-2xl text-slate-400">timer_off</span>
              </div>
            </div>

            {/* ANALYTIQUE VISUELLE : ACTIVITÉ 6 MOIS + RÉPARTITION VILLES & SPÉCIALITÉS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Graphique Activité Mensuelle */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">
                      Activité des 6 derniers mois
                    </h2>
                    <p className="text-xs text-slate-500">
                      Consultations enregistrées et nouveaux cabinets inscrits
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                      Consultations
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-900" />
                      Cabinets
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3 items-end h-48 pt-4">
                  {data.stats.monthlyActivity.map((m) => {
                    const heightPct = Math.max(8, Math.round((m.visits / maxMonthlyVisits) * 100));
                    return (
                      <div key={m.label} className="flex flex-col items-center gap-2 h-full justify-end">
                        <div className="flex flex-col items-center gap-1 w-full">
                          <span className="text-[11px] font-extrabold text-slate-700">
                            {m.visits}
                          </span>
                          <div className="w-full max-w-[44px] bg-slate-100 rounded-xl h-28 flex items-end p-1 overflow-hidden">
                            <div
                              style={{ height: `${m.visits === 0 ? 6 : heightPct}%` }}
                              className="w-full rounded-lg bg-gradient-to-t from-sky-600 to-sky-400 transition-all duration-500"
                            />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-700">{m.label}</p>
                          <p className="text-[10px] font-semibold text-slate-400">
                            +{m.clinics} cab.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Répartition Villes & Spécialités */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="font-bold text-slate-900 text-base mb-1">
                    Répartition par Ville
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">Couverture géographique au Maroc</p>

                  {data.stats.citiesBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucun cabinet inscrit.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.stats.citiesBreakdown.slice(0, 5).map((item) => (
                        <div key={item.city} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-700">{item.city}</span>
                            <span className="text-slate-900 font-extrabold">
                              {item.count} cabinet{item.count > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              style={{ width: `${Math.round((item.count / maxCityCount) * 100)}%` }}
                              className="h-full rounded-full bg-slate-900"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm mb-3">Spécialités Médicales</h3>
                  {data.stats.specialtiesBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucune spécialité enregistrée.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {data.stats.specialtiesBreakdown.map((sp) => (
                        <span
                          key={sp.specialty}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold"
                        >
                          <span>{sp.specialty}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-white text-slate-900 text-[10px]">
                            {sp.count}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CLASSEMENT D'ACTIVITÉ PAR CABINET */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    Performance par Cabinet Médical
                  </h2>
                  <p className="text-xs text-slate-500">
                    Comparatif des volumes patients, consultations et chiffre d'affaires par praticien
                  </p>
                </div>
                <button
                  onClick={() => setActivePage("doctors")}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Gérer les médecins</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>

              {data.doctorsWithAssistants.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Aucun cabinet enregistré pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-3.5">Cabinet & Ville</th>
                        <th className="px-6 py-3.5">Médecin & Assistante</th>
                        <th className="px-6 py-3.5 text-center">Patients</th>
                        <th className="px-6 py-3.5 text-center">Consultations</th>
                        <th className="px-6 py-3.5 text-center">RDV</th>
                        <th className="px-6 py-3.5 text-right">Volume CA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.doctorsWithAssistants.map((item) => (
                        <tr key={item.clinic.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{item.clinic.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {item.clinic.city} • {item.clinic.specialty}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">
                              {item.doctor?.name || "Médecin non lié"}
                            </p>
                            <p className="text-[11px] text-purple-600 font-medium">
                              Assistante :{" "}
                              {item.assistants.length > 0
                                ? item.assistants.map((a) => a.name).join(", ")
                                : "Aucune"}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-center font-extrabold text-slate-900">
                            {item.metrics.patientsCount}
                          </td>
                          <td className="px-6 py-4 text-center font-extrabold text-sky-700">
                            {item.metrics.visitsCount}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-600">
                            {item.metrics.appointmentsCount}
                          </td>
                          <td className="px-6 py-4 text-right font-extrabold text-emerald-700">
                            {formatMoney(item.metrics.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE 2 : MÉDECINS & LEURS ASSISTANTES (+ SUPPRESSION)
           ============================================================ */}
        {activePage === "doctors" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Médecins & Assistantes
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chaque médecin affiché avec son cabinet, son assistante rattachée et ses actions de gestion.
                </p>
              </div>

              <div className="relative w-full sm:w-80">
                <span className="material-symbols-outlined text-base text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                  search
                </span>
                <input
                  type="text"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="Rechercher médecin, assistante, ville..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
                />
              </div>
            </div>

            {filteredDoctors.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl">medical_services</span>
                </div>
                <h3 className="font-bold text-slate-800 text-base">Aucun médecin trouvé</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {doctorSearch
                    ? "Aucun résultat ne correspond à votre recherche."
                    : "Les médecins inscrits et validés apparaîtront ici avec leur assistante."}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredDoctors.map((item) => (
                  <div
                    key={item.clinic.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden hover:border-slate-300 transition"
                  >
                    {/* En-tête du Cabinet */}
                    <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                          #{item.clinic.id}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-extrabold text-slate-900 text-base">
                              {item.clinic.name}
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200/70 text-[10px] font-bold text-sky-700">
                              {item.clinic.specialty}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                              <span className="material-symbols-outlined text-xs">location_on</span>
                              {item.clinic.city}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Créé le {formatDate(item.clinic.createdAt)} •{" "}
                            <strong className="text-slate-700">{item.metrics.patientsCount}</strong>{" "}
                            patient{item.metrics.patientsCount > 1 ? "s" : ""} •{" "}
                            <strong className="text-slate-700">{item.metrics.visitsCount}</strong>{" "}
                            consultation{item.metrics.visitsCount > 1 ? "s" : ""} •{" "}
                            <strong className="text-emerald-700">
                              {formatMoney(item.metrics.revenue)}
                            </strong>
                          </p>
                        </div>
                      </div>

                      {/* BOUTON SUPPRIMER DÉFINITIVEMENT (Zéro bouton suspendre) */}
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            clinicId: item.clinic.id,
                            clinicName: item.clinic.name,
                            doctorName: item.doctor?.name || "Médecin",
                            assistantsCount: item.assistants.length,
                            patientsCount: item.metrics.patientsCount,
                            visitsCount: item.metrics.visitsCount,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 text-xs font-bold transition cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">delete_forever</span>
                        <span>Supprimer définitivement</span>
                      </button>
                    </div>

                    {/* Corps : Médecin à gauche + Assistante(s) à droite */}
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Bloc Médecin */}
                      <div className="rounded-2xl border border-sky-100 bg-sky-50/30 p-4 flex flex-col justify-between gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <span className="material-symbols-outlined text-xl">stethoscope</span>
                            </div>
                            <div className="min-w-0">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                                Médecin Titulaire
                              </span>
                              <h3 className="font-bold text-slate-900 text-sm truncate">
                                {item.doctor?.name || "Compte médecin manquant"}
                              </h3>
                              <p className="text-xs text-slate-600 truncate">
                                {item.doctor?.email || "—"}
                              </p>
                              {item.doctor?.phone && (
                                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">call</span>
                                  {item.doctor.phone}
                                </p>
                              )}
                            </div>
                          </div>

                          {item.doctor && (
                            <button
                              onClick={() => {
                                setPasswordModalUser({
                                  id: item.doctor!.id,
                                  name: item.doctor!.name,
                                  email: item.doctor!.email,
                                  roleLabel: "Médecin",
                                });
                                setNewPassword("");
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-200 text-[11px] font-bold transition cursor-pointer shrink-0 shadow-xs"
                            >
                              <span className="material-symbols-outlined text-sm">key</span>
                              <span>Mot de passe</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bloc Assistante(s) */}
                      <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-xs">assignment_ind</span>
                            Assistante Médicale ({item.assistants.length})
                          </span>
                        </div>

                        {item.assistants.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-2">
                            Aucune assistante associée à cet ancien cabinet.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {item.assistants.map((assistant) => (
                              <div
                                key={assistant.id}
                                className="flex items-center justify-between gap-3 bg-white rounded-xl border border-purple-100/80 p-3 shadow-2xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    {assistant.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 text-xs truncate">
                                      {assistant.name}
                                    </p>
                                    <p className="text-[11px] text-slate-500 truncate">
                                      {assistant.email}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    setPasswordModalUser({
                                      id: assistant.id,
                                      name: assistant.name,
                                      email: assistant.email,
                                      roleLabel: "Assistante",
                                    });
                                    setNewPassword("");
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-200 text-[11px] font-bold transition cursor-pointer shrink-0"
                                >
                                  <span className="material-symbols-outlined text-sm">key</span>
                                  <span>Mot de passe</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            PAGE 3 : DEMANDES DE CRÉATION (OTP EN DIRECT + HISTORIQUE)
           ============================================================ */}
        {activePage === "requests" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Demandes de Création de Cabinet
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Codes d'activation OTP en direct (valables 5 minutes) et historique complet des inscriptions.
              </p>
            </div>

            {/* SECTION 1 : DEMANDES EN ATTENTE (OTP EN DIRECT) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Demandes en Attente ({data.pendingRequests.length})</span>
                </h2>
                <span className="text-[11px] font-medium text-slate-400">
                  Actualisation automatique toutes les 5 secondes
                </span>
              </div>

              {data.pendingRequests.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-2xl">mark_email_read</span>
                  </div>
                  <p className="font-bold text-slate-800 text-sm">
                    Aucune demande en attente pour le moment
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Dès qu'un médecin s'inscrit sur /register, sa demande et son code OTP à 6 chiffres apparaîtront ici automatiquement.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {data.pendingRequests.map((req) => {
                    const remaining = getTimeRemainingText(req.expiresAt);
                    const isExpired = remaining === "Expiré";

                    return (
                      <div
                        key={req.id}
                        className="bg-white rounded-3xl border-2 border-amber-200/90 p-6 shadow-sm space-y-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                              <span className="material-symbols-outlined text-xs">schedule</span>
                              {isExpired ? "Code Expiré" : `Expire dans ${remaining}`}
                            </span>
                            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                              {req.clinicName}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {req.clinicCity} • {req.specialty}
                            </p>
                          </div>

                          {/* CODE OTP À 6 CHIFFRES */}
                          <div className="text-center bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-sm shrink-0">
                            <p className="text-[9px] uppercase tracking-widest text-sky-300 font-bold">
                              Code OTP
                            </p>
                            <p className="text-2xl font-black tracking-[0.2em] font-mono mt-0.5">
                              {req.otpCode}
                            </p>
                          </div>
                        </div>

                        {/* Détails Médecin + Assistante obligatoire */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="rounded-2xl bg-sky-50/50 border border-sky-100 p-3.5">
                            <p className="text-[10px] font-extrabold uppercase text-sky-700 mb-1">
                              Médecin
                            </p>
                            <p className="font-bold text-slate-900">{req.doctorName}</p>
                            <p className="text-slate-600 truncate">{req.doctorEmail}</p>
                            <p className="text-slate-500 mt-0.5">{req.doctorPhone}</p>
                          </div>

                          <div className="rounded-2xl bg-purple-50/50 border border-purple-100 p-3.5">
                            <p className="text-[10px] font-extrabold uppercase text-purple-700 mb-1">
                              Assistante
                            </p>
                            <p className="font-bold text-slate-900">
                              {req.assistantName || "Non renseignée"}
                            </p>
                            <p className="text-slate-600 truncate">
                              {req.assistantEmail || "—"}
                            </p>
                          </div>
                        </div>

                        {/* Actions Approuver / Rejeter */}
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoading === `approve-${req.id}`}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
                          >
                            <span className="material-symbols-outlined text-base">check_circle</span>
                            <span>
                              {actionLoading === `approve-${req.id}`
                                ? "Activation..."
                                : "Approuver en 1 clic"}
                            </span>
                          </button>

                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={actionLoading === `reject-${req.id}`}
                            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition cursor-pointer disabled:opacity-60"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                            <span>Rejeter</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SECTION 2 : HISTORIQUE COMPLET DES DEMANDES */}
            <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    Historique des Demandes ({filteredRequestsHistory.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Journal de toutes les tentatives et validations de création de cabinet
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                    {(
                      [
                        { key: "all", label: "Toutes" },
                        { key: "approved", label: "Validées" },
                        { key: "rejected", label: "Rejetées" },
                        { key: "expired", label: "Expirées" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setRequestStatusFilter(f.key)}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          requestStatusFilter === f.key
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    placeholder="Filtrer..."
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 w-44"
                  />
                </div>
              </div>

              {filteredRequestsHistory.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Aucune demande dans cette catégorie.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-3.5">Cabinet & Ville</th>
                        <th className="px-6 py-3.5">Médecin</th>
                        <th className="px-6 py-3.5">Assistante</th>
                        <th className="px-6 py-3.5">Date</th>
                        <th className="px-6 py-3.5">Statut</th>
                        <th className="px-6 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRequestsHistory.map((req) => {
                        const badge =
                          req.status === "approved" || req.status === "verified"
                            ? { text: "Validée", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                            : req.status === "pending"
                            ? { text: "En attente", cls: "bg-amber-50 text-amber-700 border-amber-200" }
                            : req.status === "rejected"
                            ? { text: "Rejetée", cls: "bg-red-50 text-red-700 border-red-200" }
                            : { text: "Expirée", cls: "bg-slate-100 text-slate-600 border-slate-200" };

                        return (
                          <tr key={req.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900">{req.clinicName}</p>
                              <p className="text-[11px] text-slate-500">
                                {req.clinicCity} • {req.specialty}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-800">{req.doctorName}</p>
                              <p className="text-[11px] text-slate-500">{req.doctorEmail}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-purple-700">
                                {req.assistantName || "—"}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {req.assistantEmail || "—"}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                              {formatDate(req.createdAt)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${badge.cls}`}
                              >
                                {badge.text}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteRequest(req.id)}
                                disabled={actionLoading === `del-req-${req.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="Supprimer cette demande de l'historique"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* ============================================================
          MODALE 1 : CONFIRMATION DE SUPPRESSION DÉFINITIVE D'UN CABINET
         ============================================================ */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative z-10 w-full max-w-md bg-white rounded-3xl border border-red-100 p-6 sm:p-7 shadow-2xl space-y-5"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">warning</span>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Supprimer ce cabinet définitivement ?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Vous êtes sur le point de supprimer <strong>{deleteTarget.clinicName}</strong>{" "}
                    ({deleteTarget.doctorName}). Cette action est <strong>irréversible</strong>.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-red-50/70 border border-red-100 p-4 text-xs text-red-800 space-y-1.5">
                <p className="font-bold">Seront définitivement supprimés :</p>
                <ul className="list-disc pl-4 space-y-0.5 text-red-700">
                  <li>Le compte Médecin ({deleteTarget.doctorName})</li>
                  <li>
                    {deleteTarget.assistantsCount} compte{deleteTarget.assistantsCount > 1 ? "s" : ""}{" "}
                    Assistante rattaché{deleteTarget.assistantsCount > 1 ? "s" : ""}
                  </li>
                  <li>
                    {deleteTarget.patientsCount} dossier{deleteTarget.patientsCount > 1 ? "s" : ""}{" "}
                    patient{deleteTarget.patientsCount > 1 ? "s" : ""} et{" "}
                    {deleteTarget.visitsCount} consultation{deleteTarget.visitsCount > 1 ? "s" : ""}
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteClinic}
                  disabled={actionLoading === `delete-clinic-${deleteTarget.clinicId}`}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-base">delete_forever</span>
                  <span>
                    {actionLoading === `delete-clinic-${deleteTarget.clinicId}`
                      ? "Suppression..."
                      : "Oui, supprimer définitivement"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================
          MODALE 2 : CHANGER LE MOT DE PASSE D'UN MÉDECIN / ASSISTANTE
         ============================================================ */}
      <AnimatePresence>
        {passwordModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPasswordModalUser(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative z-10 w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Modifier le mot de passe
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {passwordModalUser.name} • {passwordModalUser.roleLabel}
                  </p>
                </div>
                <button
                  onClick={() => setPasswordModalUser(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Identifiant (Email)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={passwordModalUser.email}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nouveau mot de passe (min. 6 caractères)
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ex: Cabinet2026!"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    disabled={newPassword.trim().length < 6}
                    onClick={copyCredentials}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition cursor-pointer disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copiedNotice ? "check" : "content_copy"}
                    </span>
                    <span>{copiedNotice ? "Copié !" : "Copier WhatsApp"}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={actionLoading === "update-password"}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
                  >
                    {actionLoading === "update-password" ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
