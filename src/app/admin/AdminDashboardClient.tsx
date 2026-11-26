"use client";

import { useState, useEffect, useMemo } from "react";
import {
  adminApproveRequest,
  adminRejectRequest,
  adminDeleteRequest,
  adminUpdateUserPassword,
  adminDeleteClinic,
  adminRunVacuum,
  adminRenewSubscription,
  getAdminDashboardData,
} from "@/actions/admin";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import AdminNeonHealth from "@/components/admin/AdminNeonHealth";
import AdminUsersManagement from "@/components/admin/AdminUsersManagement";
import AdminDatabaseExplorer from "@/components/admin/AdminDatabaseExplorer";
import AdminClinicEditModal from "@/components/admin/AdminClinicEditModal";
import AdminCreateClinicModal from "@/components/admin/AdminCreateClinicModal";
import { slugifyClinic } from "@/lib/slug";

interface AdminDashboardClientProps {
  initialData: Awaited<ReturnType<typeof getAdminDashboardData>>;
  adminEmail: string;
}

type AdminPage = "stats" | "neon" | "doctors" | "users" | "database" | "requests";

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
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Modale édition cabinet
  const [editingClinic, setEditingClinic] = useState<any | null>(null);

  // Modale création d'un nouveau cabinet
  const [createClinicModalOpen, setCreateClinicModalOpen] = useState(false);
  const [createClinicPrefill, setCreateClinicPrefill] = useState<any | null>(null);

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

  // Polling automatique en temps réel toutes les 3.5 secondes (demandes OTP, télémétrie Neon et statistiques)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const fresh = await getAdminDashboardData();
        setData(fresh);
        setLastSyncTime(new Date());
      } catch {
        // Ignorer les erreurs réseau ponctuelles
      }
    }, 3500);

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
      setLastSyncTime(new Date());
      if (!silent) showFeedback("success", "Données actualisées en direct.");
    } catch {
      if (!silent) showFeedback("error", "Erreur lors de l'actualisation.");
    } finally {
      if (!silent) setActionLoading(null);
    }
  };

  const handleRunVacuum = async () => {
    setActionLoading("vacuum");
    try {
      const res = await adminRunVacuum();
      if (res?.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback("success", res.message || "Base de données optimisée avec succès.");
        await refreshData(true);
      }
    } catch {
      showFeedback("error", "Erreur lors de l'optimisation.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRenewSubscription = async (
    clinicId: number,
    duration: "1month" | "3months" | "1year" | "change_plan",
    newPlan?: "standard" | "pro"
  ) => {
    setActionLoading(`renew-${clinicId}`);
    try {
      const res = await adminRenewSubscription(clinicId, duration, newPlan);
      if (res?.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback("success", res.message || "Abonnement mis à jour !");
        await refreshData(true);
      }
    } catch (err: any) {
      showFeedback("error", err?.message || "Erreur de prolongation");
    } finally {
      setActionLoading(null);
    }
  };

  // Déconnexion sécurisée sur le domaine principal
  const handleAdminLogout = async () => {
    try {
      await signOut({ redirect: false });
    } finally {
      if (typeof window !== "undefined" && window.location.hostname.endsWith("toncabinet.me")) {
        window.location.href = "https://toncabinet.me/admin";
      } else {
        window.location.href = "/admin";
      }
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
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 flex flex-col">
      {/* TOP HEADER SOBRE */}
      {/* HEADER SUPER ADMIN MODERNE */}
      <header className="border-b border-slate-200/90 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-bold text-base tracking-tight text-slate-900 shrink-0">
              Mon<span className="text-sky-700">Cabinet</span>
            </span>
            <span className="text-slate-300 shrink-0">/</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">
              Administration
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Indicateur Temps Réel Actif */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold shadow-2xs">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="hidden sm:inline">En direct (3s)</span>
              <span className="sm:hidden">Live</span>
            </div>

            <button
              onClick={() => refreshData(false)}
              disabled={actionLoading === "refreshing"}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 shadow-2xs transition cursor-pointer disabled:opacity-50"
              title="Rafraîchir les données en direct"
            >
              <span
                className={`material-symbols-outlined text-[15px] text-slate-500 ${
                  actionLoading === "refreshing" ? "animate-spin" : ""
                }`}
              >
                refresh
              </span>
              <span className="hidden md:inline">Actualiser</span>
            </button>

            <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-medium text-slate-600 font-mono">
              <span className="material-symbols-outlined text-[14px] text-slate-400">admin_panel_settings</span>
              {adminEmail}
            </span>

            <button
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 text-xs font-medium transition cursor-pointer"
              title="Se déconnecter de l'administration"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION DES 6 PAGES ADMIN (ONGLETS PARFAITEMENT ADAPTÉS ET FLUIDES) */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]">
            <button
              onClick={() => setActivePage("stats")}
              className={`flex items-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition cursor-pointer rounded-t-lg ${
                activePage === "stats"
                  ? "border-slate-900 text-slate-900 font-bold bg-slate-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/30"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">bar_chart</span>
              <span>Vue d&apos;ensemble</span>
            </button>

            <button
              onClick={() => setActivePage("neon")}
              className={`flex items-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition cursor-pointer rounded-t-lg ${
                activePage === "neon"
                  ? "border-sky-600 text-sky-800 font-bold bg-sky-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/30"
              }`}
            >
              <span className="material-symbols-outlined text-[17px] text-sky-600">database</span>
              <span>Infrastructure Neon</span>
              <span className="px-1.5 py-0.2 rounded-md bg-sky-50 text-sky-700 text-[10px] font-semibold tabular-nums border border-sky-200">
                1 Go • 100 CU-h
              </span>
            </button>

            <button
              onClick={() => setActivePage("doctors")}
              className={`flex items-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition cursor-pointer rounded-t-lg ${
                activePage === "doctors"
                  ? "border-slate-900 text-slate-900 font-bold bg-slate-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/30"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">medical_services</span>
              <span>Cabinets Médicaux</span>
              <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold tabular-nums">
                {data.doctorsWithAssistants.length}
              </span>
            </button>

            <button
              onClick={() => setActivePage("users")}
              className={`flex items-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition cursor-pointer rounded-t-lg ${
                activePage === "users"
                  ? "border-slate-900 text-slate-900 font-bold bg-slate-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/30"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">group</span>
              <span>Gestion des Personnes</span>
              <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold tabular-nums">
                {data.allUsers?.length || data.stats.totalUsers}
              </span>
            </button>

            <button
              onClick={() => setActivePage("database")}
              className={`flex items-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition cursor-pointer rounded-t-lg ${
                activePage === "database"
                  ? "border-slate-900 text-slate-900 font-bold bg-slate-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/30"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">table_rows</span>
              <span>Explorateur BDD</span>
            </button>

            <button
              onClick={() => setActivePage("requests")}
              className={`flex items-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition cursor-pointer rounded-t-lg ${
                activePage === "requests"
                  ? "border-slate-900 text-slate-900 font-bold bg-slate-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/30"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">inbox</span>
              <span>Demandes d&apos;inscription</span>
              {data.stats.pendingCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold tabular-nums animate-pulse">
                  {data.stats.pendingCount}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold tabular-nums">
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
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
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

            {/* BANDEAU KPI PRINCIPAL UNIFIÉ */}
            <div className="bg-slate-200/80 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px">
              <div className="bg-white p-5">
                <p className="text-xs font-medium text-slate-500">Cabinets & médecins</p>
                <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                  {data.stats.totalClinics}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {data.stats.totalDoctors} méd. • {data.stats.totalAssistants} assist.
                </p>
              </div>

              <div className="bg-white p-5">
                <p className="text-xs font-medium text-slate-500">Dossiers patients</p>
                <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                  {data.stats.totalPatients}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {data.stats.totalAppointments} RDV actifs
                </p>
              </div>

              <div className="bg-white p-5">
                <p className="text-xs font-medium text-slate-500">Consultations</p>
                <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                  {data.stats.totalVisits}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  +{data.stats.visitsToday} aujourd'hui • {data.stats.visitsThisMonth} ce mois
                </p>
              </div>

              <div className="bg-white p-5">
                <p className="text-xs font-medium text-slate-500">Volume financier</p>
                <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                  {formatMoney(data.stats.totalRevenue)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {data.stats.collectionRate}% encaissé ({formatMoney(data.stats.paidRevenue)})
                </p>
              </div>
            </div>

            {/* PIPELINE DES DEMANDES D'INSCRIPTION */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200/80 border border-slate-200/90 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="bg-white p-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 truncate">En attente (OTP)</p>
                  <p className="text-xl font-semibold text-amber-600 tabular-nums mt-0.5">
                    {data.stats.pendingCount}
                  </p>
                </div>
                <span className="material-symbols-outlined text-lg text-amber-500 shrink-0">hourglass_top</span>
              </div>

              <div className="bg-white p-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 truncate">Demandes validées</p>
                  <p className="text-xl font-semibold text-emerald-600 tabular-nums mt-0.5">
                    {data.stats.approvedRequestsCount}
                  </p>
                </div>
                <span className="material-symbols-outlined text-lg text-emerald-500 shrink-0">verified</span>
              </div>

              <div className="bg-white p-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 truncate">Rejetées</p>
                  <p className="text-xl font-semibold text-red-600 tabular-nums mt-0.5">
                    {data.stats.rejectedRequestsCount}
                  </p>
                </div>
                <span className="material-symbols-outlined text-lg text-red-500 shrink-0">cancel</span>
              </div>

              <div className="bg-white p-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 truncate">Expirées</p>
                  <p className="text-xl font-semibold text-slate-600 tabular-nums mt-0.5">
                    {data.stats.expiredRequestsCount}
                  </p>
                </div>
                <span className="material-symbols-outlined text-lg text-slate-400 shrink-0">timer_off</span>
              </div>
            </div>

            {/* ANALYTIQUE VISUELLE : ACTIVITÉ 6 MOIS + RÉPARTITION VILLES & SPÉCIALITÉS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Graphique Activité Mensuelle */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col justify-between">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3.5 border-b border-slate-100">
                  <div>
                    <h2 className="font-semibold text-slate-900 text-sm">
                      Activité des 6 derniers mois
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Consultations enregistrées et nouveaux cabinets inscrits
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-sky-600" />
                      Consultations
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-slate-900" />
                      Cabinets
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2 sm:gap-3 items-end h-48 pt-2">
                  {data.stats.monthlyActivity.map((m) => {
                    const heightPct = Math.max(8, Math.round((m.visits / maxMonthlyVisits) * 100));
                    return (
                      <div key={m.label} className="flex flex-col items-center gap-2 h-full justify-end">
                        <div className="flex flex-col items-center gap-1 w-full">
                          <span className="text-xs font-semibold text-slate-700 tabular-nums">
                            {m.visits}
                          </span>
                          <div className="w-full max-w-[40px] bg-slate-100 rounded-lg h-28 flex items-end p-0.5 overflow-hidden">
                            <div
                              style={{ height: `${m.visits === 0 ? 5 : heightPct}%` }}
                              className="w-full rounded-md bg-sky-600 transition-all duration-500"
                            />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-slate-700">{m.label}</p>
                          <p className="text-[11px] text-slate-400 tabular-nums">
                            +{m.clinics} cab.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Répartition Villes & Spécialités */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] space-y-5">
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm">
                    Répartition par ville
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 mb-4">Couverture géographique</p>

                  {data.stats.citiesBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400">Aucun cabinet inscrit.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.stats.citiesBreakdown.slice(0, 5).map((item) => (
                        <div key={item.city} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700 truncate">{item.city}</span>
                            <span className="text-slate-900 font-semibold tabular-nums shrink-0 ml-2">
                              {item.count} cabinet{item.count > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
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
                  <h3 className="font-semibold text-slate-900 text-sm mb-3">Spécialités médicales</h3>
                  {data.stats.specialtiesBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400">Aucune spécialité enregistrée.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {data.stats.specialtiesBreakdown.map((sp) => (
                        <span
                          key={sp.specialty}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-medium"
                        >
                          <span>{sp.specialty}</span>
                          <span className="text-slate-400 font-semibold tabular-nums">
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
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm">
                    Performance par cabinet médical
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comparatif des volumes patients, consultations et chiffre d&apos;affaires par praticien
                  </p>
                </div>
                <button
                  onClick={() => setActivePage("doctors")}
                  className="text-xs font-medium text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer self-start sm:self-center shrink-0"
                >
                  <span>Gérer les médecins</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              {data.doctorsWithAssistants.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">
                  Aucun cabinet enregistré pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Cabinet & Ville</th>
                        <th className="px-5 py-3">Médecin & Assistante</th>
                        <th className="px-5 py-3 text-center">Patients</th>
                        <th className="px-5 py-3 text-center">Consultations</th>
                        <th className="px-5 py-3 text-center">RDV</th>
                        <th className="px-5 py-3 text-right">Volume CA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.doctorsWithAssistants.map((item) => (
                        <tr key={item.clinic.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-900 text-sm">{item.clinic.name}</p>
                            <p className="text-xs text-slate-500">
                              {item.clinic.city} • {item.clinic.specialty}
                            </p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-800">
                              {item.doctor?.name || "Médecin non lié"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Assistante :{" "}
                              <span className="text-slate-700 font-medium">
                                {item.assistants.length > 0
                                  ? item.assistants.map((a) => a.name).join(", ")
                                  : "Aucune"}
                              </span>
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-center font-semibold text-slate-900 tabular-nums">
                            {item.metrics.patientsCount}
                          </td>
                          <td className="px-5 py-3.5 text-center font-semibold text-sky-700 tabular-nums">
                            {item.metrics.visitsCount}
                          </td>
                          <td className="px-5 py-3.5 text-center font-medium text-slate-600 tabular-nums">
                            {item.metrics.appointmentsCount}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
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
            PAGE 1.5 : SANTÉ & PERFORMANCES DE LA BASE DE DONNÉES NEON
           ============================================================ */}
        {activePage === "neon" && (
          <AdminNeonHealth
            stats={data.stats}
            onRunVacuum={handleRunVacuum}
            actionLoading={actionLoading}
          />
        )}

        {/* ============================================================
            PAGE 2 : MÉDECINS & LEURS ASSISTANTES (+ SUPPRESSION)
           ============================================================ */}
        {activePage === "doctors" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                  Médecins & Assistantes
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chaque médecin affiché avec son cabinet, son assistante rattachée et ses actions de gestion.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCreateClinicPrefill(null);
                    setCreateClinicModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[17px]">add_circle</span>
                  <span>Nouveau Cabinet</span>
                </button>

                <div className="relative w-full sm:w-72">
                  <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                    search
                  </span>
                  <input
                    type="text"
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    placeholder="Rechercher médecin, assistante..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                </div>
              </div>
            </div>

            {filteredDoctors.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">medical_services</span>
                <h3 className="font-semibold text-slate-800 text-sm">Aucun médecin trouvé</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {doctorSearch
                    ? "Aucun résultat ne correspond à votre recherche."
                    : "Les médecins inscrits et validés apparaîtront ici avec leur assistante."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDoctors.map((item) => (
                  <div
                    key={item.clinic.id}
                    className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden"
                  >
                    {/* En-tête du Cabinet */}
                    <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-slate-900 text-sm sm:text-base">
                            {item.clinic.name}
                          </h2>
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-medium text-slate-600">
                            {item.clinic.specialty}
                          </span>
                          <span className="text-xs text-slate-500">• {item.clinic.city}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          Créé le {formatDate(item.clinic.createdAt)} •{" "}
                          <span className="font-medium text-slate-700">{item.metrics.patientsCount}</span>{" "}
                          patient{item.metrics.patientsCount > 1 ? "s" : ""} •{" "}
                          <span className="font-medium text-slate-700">{item.metrics.visitsCount}</span>{" "}
                          consultation{item.metrics.visitsCount > 1 ? "s" : ""} •{" "}
                          <span className="font-semibold text-slate-900">
                            {formatMoney(item.metrics.revenue)}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <button
                          onClick={() => {
                            const fullClinic = data.allClinics?.find((c) => c.id === item.clinic.id);
                            setEditingClinic({
                              id: item.clinic.id,
                              name: item.clinic.name,
                              slug: fullClinic?.slug || "",
                              city: item.clinic.city,
                              address: item.clinic.address,
                              phone: item.clinic.phone,
                              primaryColor: fullClinic?.primaryColor || "#0f172a",
                              isCommunityMember: fullClinic?.isCommunityMember ?? true,
                              status: (fullClinic?.status as any) || "active",
                            });
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px] text-slate-500">edit</span>
                          <span>Modifier</span>
                        </button>

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
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 text-xs font-medium transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>

                    {/* BARRE D'ABONNEMENT & VALIDITÉ DU CABINET */}
                    <div className="px-5 py-2.5 bg-slate-100/60 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                          item.clinic.plan === 'standard'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        }`}>
                          <span className="material-symbols-outlined text-[13px]">
                            {item.clinic.plan === 'standard' ? 'history' : 'star'}
                          </span>
                          <span>{item.clinic.plan === 'standard' ? 'Plan STANDARD (30j)' : 'Plan PRO (À vie)'}</span>
                        </span>

                        <span className="text-slate-600 font-medium">
                          {item.clinic.billingCycle === 'yearly' ? 'Annuel' : item.clinic.billingCycle === 'quarterly' ? 'Trimestriel' : 'Mensuel'} • <strong>{item.clinic.planPrice || (item.clinic.plan === 'standard' ? 200 : 250)} DH</strong>
                        </span>

                        {/* Compte à rebours / Jours restants */}
                        {item.clinic.daysRemaining !== null ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                            item.clinic.daysRemaining > 15
                              ? 'bg-emerald-100/70 text-emerald-800'
                              : item.clinic.daysRemaining > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            <span className="material-symbols-outlined text-[13px]">
                              {item.clinic.daysRemaining > 0 ? 'timer' : 'warning'}
                            </span>
                            <span>
                              {item.clinic.daysRemaining > 0
                                ? `Reste ${item.clinic.daysRemaining} jour${item.clinic.daysRemaining > 1 ? 's' : ''}`
                                : 'Abonnement expiré'}
                            </span>
                            {item.clinic.subscriptionExpiresAt && (
                              <span className="opacity-75 font-normal">
                                (jusqu'au {new Date(item.clinic.subscriptionExpiresAt).toLocaleDateString('fr-FR')})
                              </span>
                            )}
                          </span>
                        ) : null}
                      </div>

                      {/* Boutons rapides de prolongation */}
                      <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                        <span className="text-[11px] text-slate-500 font-medium mr-1">Prolonger :</span>
                        <button
                          type="button"
                          disabled={actionLoading === `renew-${item.clinic.id}`}
                          onClick={() => handleRenewSubscription(item.clinic.id, "1month")}
                          className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                          title="Ajouter 30 jours à l'abonnement"
                        >
                          +1 Mois
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === `renew-${item.clinic.id}`}
                          onClick={() => handleRenewSubscription(item.clinic.id, "3months")}
                          className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                          title="Ajouter 90 jours à l'abonnement"
                        >
                          +3 Mois
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === `renew-${item.clinic.id}`}
                          onClick={() => handleRenewSubscription(item.clinic.id, "1year")}
                          className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                          title="Ajouter 365 jours à l'abonnement"
                        >
                          +1 An
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === `renew-${item.clinic.id}`}
                          onClick={() => handleRenewSubscription(item.clinic.id, "change_plan", item.clinic.plan === "standard" ? "pro" : "standard")}
                          className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 ml-1"
                          title="Basculer entre Plan Standard et Plan Pro"
                        >
                          Passer en {item.clinic.plan === "standard" ? "PRO ⭐" : "STANDARD"}
                        </button>
                      </div>
                    </div>

                    {/* Corps : Médecin | Assistante(s) séparés par une fine bordure */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
                      {/* Colonne Médecin */}
                      <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[11px] font-medium text-sky-700 block mb-0.5">
                            Médecin titulaire
                          </span>
                          <h3 className="font-semibold text-slate-900 text-sm truncate">
                            {item.doctor?.name || "Compte médecin manquant"}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">
                            {item.doctor?.email || "—"}
                            {item.doctor?.phone ? ` • ${item.doctor.phone}` : ""}
                          </p>
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 text-xs font-medium transition cursor-pointer shrink-0"
                          >
                            <span className="material-symbols-outlined text-[15px] text-slate-500">key</span>
                            <span>Mot de passe</span>
                          </button>
                        )}
                      </div>

                      {/* Colonne Assistante(s) */}
                      <div className="p-4 sm:p-5 space-y-2.5">
                        <span className="text-[11px] font-medium text-slate-500 block">
                          Assistante médicale ({item.assistants.length})
                        </span>

                        {item.assistants.length === 0 ? (
                          <p className="text-xs text-slate-400">Aucune assistante associée.</p>
                        ) : (
                          <div className="space-y-2.5">
                            {item.assistants.map((assistant) => (
                              <div
                                key={assistant.id}
                                className="flex items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 text-sm truncate">
                                    {assistant.name}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">
                                    {assistant.email}
                                  </p>
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
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 text-xs font-medium transition cursor-pointer shrink-0"
                                >
                                  <span className="material-symbols-outlined text-[15px] text-slate-500">key</span>
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
            PAGE 2.5 : GESTION GLOBALE DES PERSONNES (UTILISATEURS)
           ============================================================ */}
        {activePage === "users" && (
          <AdminUsersManagement
            users={(data.allUsers || []) as any}
            clinics={(data.allClinics || []) as any}
            doctorsWithAssistants={data.doctorsWithAssistants}
            onRefresh={() => refreshData(true)}
            onPasswordModal={(user) => {
              setPasswordModalUser(user);
              setNewPassword("");
            }}
            showFeedback={showFeedback}
          />
        )}

        {/* ============================================================
            PAGE 2.6 : EXPLORATEUR DIRECT BASE DE DONNÉES
           ============================================================ */}
        {activePage === "database" && (
          <AdminDatabaseExplorer
            onRefresh={() => refreshData(true)}
            showFeedback={showFeedback}
          />
        )}

        {/* ============================================================
            PAGE 3 : DEMANDES DE CRÉATION (OTP EN DIRECT + HISTORIQUE)
           ============================================================ */}
        {activePage === "requests" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                Demandes de création de cabinet
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Codes d&apos;activation OTP en direct (valables 5 minutes) et historique complet des inscriptions.
              </p>
            </div>

            {/* SECTION 1 : DEMANDES EN ATTENTE (OTP EN DIRECT) */}
            <section className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Demandes en attente ({data.pendingRequests.length})</span>
                </h2>
                <span className="text-xs text-slate-400">
                  Actualisation automatique toutes les 5 s
                </span>
              </div>

              {data.pendingRequests.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200/90 p-10 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <span className="material-symbols-outlined text-3xl text-emerald-500 mb-2 block">mark_email_read</span>
                  <p className="font-semibold text-slate-800 text-sm">
                    Aucune demande en attente pour le moment
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Dès qu&apos;un médecin s&apos;inscrit sur /register, sa demande et son code OTP à 6 chiffres apparaîtront ici automatiquement.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {data.pendingRequests.map((req) => {
                    const remaining = getTimeRemainingText(req.expiresAt);
                    const isExpired = remaining === "Expiré";

                    return (
                      <div
                        key={req.id}
                        className="bg-white rounded-xl border border-amber-300/90 p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Nouvelle inscription • 24h
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Reçue le {formatDate(req.createdAt)}
                              </span>
                            </div>
                            <h3 className="font-bold text-slate-900 text-base leading-tight">
                              {req.clinicName}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {req.clinicCity} • {req.specialty}
                            </p>
                          </div>

                          <div className="px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-100 text-sky-800 text-xs font-semibold flex items-center gap-1.5 self-start">
                            <span className="material-symbols-outlined text-[16px] text-sky-600">lock_clock</span>
                            <span>En attente de mot de passe</span>
                          </div>
                        </div>

                        {/* Détails Médecin + Assistante */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="rounded-lg bg-slate-50/80 border border-slate-200/80 p-3">
                            <p className="text-[11px] font-medium text-sky-700 mb-1">
                              Médecin
                            </p>
                            <p className="font-semibold text-slate-900">{req.doctorName}</p>
                            <p className="text-slate-600 truncate">{req.doctorEmail}</p>
                            <p className="text-slate-500 mt-0.5">{req.doctorPhone}</p>
                          </div>

                          <div className="rounded-lg bg-slate-50/80 border border-slate-200/80 p-3">
                            <p className="text-[11px] font-medium text-slate-600 mb-1">
                              Assistante
                            </p>
                            <p className="font-semibold text-slate-900">
                              {req.assistantName || "Non renseignée"}
                            </p>
                            <p className="text-slate-600 truncate">
                              {req.assistantEmail || "—"}
                            </p>
                          </div>
                        </div>

                        {/* Formule Choisie */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-bold text-[11px] ${
                              (req as any).selectedPlan === 'standard'
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            }`}>
                              <span className="material-symbols-outlined text-[13px]">
                                {(req as any).selectedPlan === 'standard' ? 'history' : 'star'}
                              </span>
                              <span>{(req as any).selectedPlan === 'standard' ? 'STANDARD (30j)' : '⭐ PRO (À vie)'}</span>
                            </span>
                            <span className="text-slate-700 font-semibold">
                              {(req as any).selectedCycle === 'yearly' ? '1 An' : (req as any).selectedCycle === 'quarterly' ? '3 Mois' : '1 Mois'}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {(req as any).selectedPrice || ((req as any).selectedPlan === 'standard' ? 200 : 250)} DH
                          </span>
                        </div>

                        {/* Actions : Créer le compte avec pré-remplissage / Rejeter */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCreateClinicPrefill({
                                requestId: req.id,
                                clinicName: req.clinicName,
                                slug: slugifyClinic(req.clinicName),
                                clinicCity: req.clinicCity,
                                clinicAddress: req.clinicAddress,
                                doctorName: req.doctorName,
                                doctorEmail: req.doctorEmail,
                                doctorPhone: req.doctorPhone,
                                specialty: req.specialty,
                                assistantName: req.assistantName,
                                assistantEmail: req.assistantEmail,
                              });
                              setCreateClinicModalOpen(true);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                            <span>Créer le compte (Formulaire pré-rempli)</span>
                          </button>

                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={actionLoading === `reject-${req.id}`}
                            className="inline-flex items-center justify-center gap-1 py-2 px-3.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-medium transition cursor-pointer disabled:opacity-60"
                          >
                            <span className="material-symbols-outlined text-[15px]">close</span>
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
            <section className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm">
                    Historique des demandes ({filteredRequestsHistory.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Journal de toutes les tentatives et validations de création de cabinet
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
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
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
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
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 w-full sm:w-44"
                  />
                </div>
              </div>

              {filteredRequestsHistory.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  Aucune demande dans cette catégorie.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Cabinet & Ville</th>
                        <th className="px-5 py-3">Médecin</th>
                        <th className="px-5 py-3">Assistante</th>
                        <th className="px-5 py-3">Formule</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Statut</th>
                        <th className="px-5 py-3 text-right">Action</th>
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

                        const planLabel = (req as any).selectedPlan === "standard" ? "STANDARD" : "PRO ⭐";
                        const cycleLabel = (req as any).selectedCycle === "yearly" ? "1 An" : (req as any).selectedCycle === "quarterly" ? "3 Mois" : "1 Mois";

                        return (
                          <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-slate-900 text-sm">{req.clinicName}</p>
                              <p className="text-xs text-slate-500">
                                {req.clinicCity} • {req.specialty}
                              </p>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-slate-800">{req.doctorName}</p>
                              <p className="text-xs text-slate-500">{req.doctorEmail}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-slate-800">
                                {req.assistantName || "—"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {req.assistantEmail || "—"}
                              </p>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                (req as any).selectedPlan === 'standard'
                                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              }`}>
                                {planLabel} • {cycleLabel}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 tabular-nums whitespace-nowrap">
                              {formatDate(req.createdAt)}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-medium ${badge.cls}`}
                              >
                                {badge.text}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => handleDeleteRequest(req.id)}
                                disabled={actionLoading === `del-req-${req.id}`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="Supprimer cette demande de l'historique"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
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
              className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative z-10 w-full max-w-md bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">warning</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Supprimer ce cabinet définitivement ?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Vous êtes sur le point de supprimer <strong>{deleteTarget.clinicName}</strong>{" "}
                    ({deleteTarget.doctorName}). Cette action est <strong>irréversible</strong>.
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-red-50/70 border border-red-200/80 p-3.5 text-xs text-red-800 space-y-1.5">
                <p className="font-semibold">Seront définitivement supprimés :</p>
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

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteClinic}
                  disabled={actionLoading === `delete-clinic-${deleteTarget.clinicId}`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  <span>
                    {actionLoading === `delete-clinic-${deleteTarget.clinicId}`
                      ? "Suppression..."
                      : "Supprimer définitivement"}
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
              className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative z-10 w-full max-w-md bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xl"
            >
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">
                    Modifier le mot de passe
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {passwordModalUser.name} • {passwordModalUser.roleLabel}
                  </p>
                </div>
                <button
                  onClick={() => setPasswordModalUser(null)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Identifiant (Email)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={passwordModalUser.email}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Nouveau mot de passe (min. 6 caractères)
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ex: Cabinet2026!"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    disabled={newPassword.trim().length < 6}
                    onClick={copyCredentials}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-medium transition cursor-pointer disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {copiedNotice ? "check" : "content_copy"}
                    </span>
                    <span>{copiedNotice ? "Copié !" : "Copier WhatsApp"}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={actionLoading === "update-password"}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
                  >
                    {actionLoading === "update-password" ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* MODALE ÉDITION DU CABINET */}
      {editingClinic && (
        <AdminClinicEditModal
          clinic={editingClinic}
          onClose={() => setEditingClinic(null)}
          onSaved={() => refreshData(true)}
          showFeedback={showFeedback}
        />
      )}

      {/* MODALE CRÉATION D'UN NOUVEAU CABINET */}
      <AdminCreateClinicModal
        isOpen={createClinicModalOpen}
        onClose={() => {
          setCreateClinicModalOpen(false);
          setCreateClinicPrefill(null);
        }}
        onSuccess={() => refreshData(true)}
        showFeedback={showFeedback}
        initialData={createClinicPrefill}
      />
    </div>
  );
}
