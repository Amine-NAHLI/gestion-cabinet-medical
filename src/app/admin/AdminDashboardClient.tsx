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
  adminApprovePlanChange,
  adminRejectPlanChange,
  getAdminDashboardData,
} from "@/actions/admin";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import AdminNeonHealth from "@/components/admin/AdminNeonHealth";
import AdminUsersManagement from "@/components/admin/AdminUsersManagement";
import AdminDatabaseExplorer from "@/components/admin/AdminDatabaseExplorer";
import AdminClinicEditModal from "@/components/admin/AdminClinicEditModal";
import AdminCreateClinicModal from "@/components/admin/AdminCreateClinicModal";
import AdminPlatformSupport from "@/components/admin/AdminPlatformSupport";
import { slugifyClinic } from "@/lib/slug";

interface AdminDashboardClientProps {
  initialData: Awaited<ReturnType<typeof getAdminDashboardData>>;
  adminEmail: string;
}

type AdminPage = "stats" | "doctors" | "requests" | "users" | "platform" | "neon" | "database";

export default function AdminDashboardClient({
  initialData,
  adminEmail,
}: AdminDashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [activePage, setActivePage] = useState<AdminPage>(
    initialData.stats.pendingCount > 0 ? "requests" : "stats"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Polling automatique en temps réel toutes les 3.5 secondes
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
    duration: "1month" | "3months" | "1year" | "validate_trial" | "add_trial_days" | "change_plan",
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

  // Validation d'une demande de changement de plan
  const handleApprovePlanChange = async (clinicId: number) => {
    setActionLoading(`approve-plan-${clinicId}`);
    try {
      const res = await adminApprovePlanChange(clinicId);
      if (res?.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback("success", res.message || "Demande de changement validée avec succès !");
        await refreshData(true);
      }
    } catch {
      showFeedback("error", "Erreur lors de la validation du changement de plan.");
    } finally {
      setActionLoading(null);
    }
  };

  // Rejet d'une demande de changement de plan
  const handleRejectPlanChange = async (clinicId: number) => {
    setActionLoading(`reject-plan-${clinicId}`);
    try {
      const res = await adminRejectPlanChange(clinicId);
      if (res?.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback("success", "Demande de changement annulée.");
        await refreshData(true);
      }
    } catch {
      showFeedback("error", "Erreur lors du rejet.");
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
    const text = `Identifiants MonCabinet\nNom: ${passwordModalUser.name} (${passwordModalUser.roleLabel})\nEmail: ${passwordModalUser.email}\nNouveau Mot de passe: ${newPassword}\nLien: ${origin}/login`;
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

  // Liste des demandes de changement de formule en attente
  const pendingPlanChanges = useMemo(() => {
    return data.doctorsWithAssistants.filter(
      (item) => item.clinic.pendingPlanChange && (item.clinic.pendingPlanChange as any).status === "pending"
    );
  }, [data.doctorsWithAssistants]);

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

  interface NavItem {
    id: AdminPage;
    label: string;
    icon: string;
    badge: string | number | null;
    alertBadge?: string | null;
    isWarning?: boolean;
  }

  interface NavGroup {
    title: string;
    items: NavItem[];
  }

  // Groupes de navigation pour la Sidebar
  const navigationGroups: NavGroup[] = [
    {
      title: "SUPERVISION",
      items: [
        {
          id: "stats",
          label: "Vue d'ensemble",
          icon: "dashboard",
          badge: null,
        },
        {
          id: "neon",
          label: "Infrastructure Neon",
          icon: "database",
          badge: "1 Go",
        },
      ],
    },
    {
      title: "GESTION MÉDICALE",
      items: [
        {
          id: "doctors",
          label: "Cabinets & Abonnements",
          icon: "medical_services",
          badge: data.doctorsWithAssistants.length,
          alertBadge: pendingPlanChanges.length > 0 ? `${pendingPlanChanges.length} chgt` : null,
        },
        {
          id: "requests",
          label: "Demandes d'inscription",
          icon: "inbox",
          badge: data.stats.pendingCount > 0 ? data.stats.pendingCount : data.allRequests.length,
          isWarning: data.stats.pendingCount > 0,
        },
      ],
    },
    {
      title: "PERSONNES & RÔLES",
      items: [
        {
          id: "users",
          label: "Gestion des Personnes",
          icon: "group",
          badge: data.allUsers?.length || data.stats.totalUsers,
        },
      ],
    },
    {
      title: "SYSTÈME & CONFIGURATION",
      items: [
        {
          id: "platform",
          label: "Support & WhatsApp",
          icon: "chat",
          badge: "Config",
        },
        {
          id: "database",
          label: "Explorateur BDD",
          icon: "table_rows",
          badge: null,
        },
      ],
    },
  ];

  const getPageTitle = (page: AdminPage) => {
    switch (page) {
      case "stats":
        return { title: "Vue d'ensemble", subtitle: "Indicateurs consolidés, chiffre d'affaires et santé globale de la plateforme." };
      case "doctors":
        return { title: "Cabinets Médicaux & Abonnements", subtitle: "Gestion des sous-domaines, renouvellements et demandes de changement de formule." };
      case "requests":
        return { title: "Demandes d'inscription", subtitle: "Contrôle des demandes d'onboarding, validation 1-clic et codes de confirmation." };
      case "users":
        return { title: "Gestion des Personnes", subtitle: "Administration des comptes praticiens, assistantes médicales et super administrateurs." };
      case "platform":
        return { title: "Support & WhatsApp", subtitle: "Numéro WhatsApp officiel, message pré-rempli et coordonnées d'assistance directe." };
      case "neon":
        return { title: "Infrastructure Neon PostgreSQL", subtitle: "Télémétrie serverless, consommation CU-heures et santé de la base de données." };
      case "database":
        return { title: "Explorateur de Base de Données", subtitle: "Inspection directe des tables relationnelles, métriques de taille et requêtes." };
    }
  };

  const pageInfo = getPageTitle(activePage);

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 flex flex-col md:flex-row">
      {/* ============================================================
          SIDEBAR GAUCHE MODERNE & FLUIDE (DESKTOP)
         ============================================================ */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-white border-r border-slate-200/90 flex-col justify-between shrink-0 h-screen sticky top-0 z-30 shadow-xs">
        <div className="flex flex-col h-full min-h-0">
          {/* Header Sidebar Brand */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xs">
                MC
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
                  Mon<span className="text-sky-700">Cabinet</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                  Super Admin Console
                </span>
              </div>
            </div>

            {/* Pastille Live */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200" title="Synchronisation continue toutes les 3.5s">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>3.5s</span>
            </div>
          </div>

          {/* Navigation groupée & aérée */}
          <nav className="flex-1 p-3.5 space-y-5 overflow-y-auto min-h-0">
            {navigationGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePage(item.id)}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`material-symbols-outlined text-[19px] shrink-0 ${
                            isActive ? "text-emerald-400" : "text-slate-400"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {item.alertBadge && (
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-white text-[10px] font-bold animate-pulse">
                            {item.alertBadge}
                          </span>
                        )}
                        {item.badge !== null && (
                          <span
                            className={`px-2 py-0.2 rounded-md text-[10px] font-bold tabular-nums ${
                              isActive
                                ? "bg-white/20 text-white"
                                : item.isWarning
                                ? "bg-amber-100 text-amber-900"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Footer Sidebar Utilisateur */}
          <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                  SA
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">Super Admin</p>
                  <p className="text-[10px] text-slate-400 truncate">{adminEmail}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => refreshData(false)}
                disabled={actionLoading === "refreshing"}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition cursor-pointer"
                title="Actualiser en direct"
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    actionLoading === "refreshing" ? "animate-spin" : ""
                  }`}
                >
                  refresh
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdminLogout}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================
          TOP HEADER MOBILE (AVEC TIROIR DE NAVIGATION)
         ============================================================ */}
      <div className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-40 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">MonCabinet</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs text-slate-500 font-semibold">{pageInfo.title}</span>
        </div>

        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-700"
        >
          <span className="material-symbols-outlined text-[20px]">
            {sidebarOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Drawer Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="md:hidden fixed inset-0 z-50 bg-white p-5 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-lg">Menu Administration</span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-lg text-slate-500"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-2">
                {navigationGroups.flatMap((g) => g.items).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActivePage(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold ${
                      activePage === item.id ? "bg-slate-900 text-white" : "text-slate-700 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAdminLogout}
              className="w-full py-3 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs"
            >
              Déconnexion
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          ZONE PRINCIPALE & PAGES DÉDIÉES
         ============================================================ */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Header du Contenu */}
        <div className="bg-white border-b border-slate-200/90 px-5 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-20 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Console Super Admin
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-bold text-slate-700">{pageInfo.title}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
              {pageInfo.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setCreateClinicPrefill(null);
                setCreateClinicModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Nouveau Cabinet</span>
            </button>

            <button
              type="button"
              onClick={() => refreshData(false)}
              disabled={actionLoading === "refreshing"}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              <span
                className={`material-symbols-outlined text-[15px] ${
                  actionLoading === "refreshing" ? "animate-spin" : ""
                }`}
              >
                refresh
              </span>
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK TOAST FLOTTANT */}
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

        {/* CONTENU PROPRE PAR PAGE */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] w-full mx-auto">
          {/* ============================================================
              PAGE 1 : VUE D'ENSEMBLE (STATS GLOBALES)
             ============================================================ */}
          {activePage === "stats" && (
            <div className="space-y-6">
              {/* CARTES KPI HAUT DE PAGE */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Cabinets Actifs</span>
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">medical_services</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
                    {data.stats.totalClinics}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {data.stats.totalDoctors} praticiens • {data.stats.totalAssistants} assistantes
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Dossiers Patients</span>
                    <span className="material-symbols-outlined text-sky-500 text-[18px]">folder_shared</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
                    {data.stats.totalPatients}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Patients répertoriés</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Consultations Globales</span>
                    <span className="material-symbols-outlined text-purple-500 text-[18px]">assignment_turned_in</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
                    {data.stats.totalVisits}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {data.stats.finishedVisits} terminées • {data.stats.visitsToday} aujourd&apos;hui
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Chiffre d&apos;Affaires Consolidé</span>
                    <span className="material-symbols-outlined text-emerald-500 text-[18px]">payments</span>
                  </div>
                  <p className="text-2xl font-black text-emerald-700 mt-2 tabular-nums">
                    {formatMoney(data.stats.totalRevenue)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Recouvrement : {data.stats.collectionRate}% encaissé
                  </p>
                </div>
              </div>

              {/* GRAPHIQUE D'ACTIVITÉ MENSUELLE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Activité des consultations (6 derniers mois)</h2>
                      <p className="text-xs text-slate-500">Volume mensuel consolidé de toutes les consultations</p>
                    </div>
                  </div>

                  <div className="h-56 flex items-end gap-3 pt-4">
                    {data.stats.monthlyActivity.map((m) => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[11px] font-bold text-slate-700 tabular-nums">{m.visits}</span>
                        <div
                          style={{ height: `${Math.round((m.visits / maxMonthlyVisits) * 80)}%` }}
                          className="w-full rounded-t-lg bg-slate-900 hover:bg-sky-600 transition min-h-[4px]"
                        />
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">{m.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RÉPARTITION PAR VILLE */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900">Répartition par ville</h2>
                    <p className="text-xs text-slate-500">Implantation géographique des cabinets</p>
                  </div>

                  <div className="space-y-3">
                    {data.stats.citiesBreakdown.slice(0, 5).map((c) => (
                      <div key={c.city} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-700">{c.city}</span>
                          <span className="text-slate-900 tabular-nums">{c.count} cabinet{c.count > 1 ? "s" : ""}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${Math.round((c.count / maxCityCount) * 100)}%` }}
                            className="h-full rounded-full bg-slate-900"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              PAGE 2 : CABINETS MÉDICAUX & ABONNEMENTS
             ============================================================ */}
          {activePage === "doctors" && (
            <div className="space-y-6">
              {/* BANNIÈRE DEMANDES DE CHANGEMENT DE FORMULE EN ATTENTE */}
              {pendingPlanChanges.length > 0 && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-50/90 border border-amber-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {pendingPlanChanges.length} demande{pendingPlanChanges.length > 1 ? "s" : ""} de changement de formule reçue{pendingPlanChanges.length > 1 ? "s" : ""}
                      </h3>
                      <p className="text-xs text-slate-600">
                        Validez les demandes d&apos;évolution soumises par les praticiens après confirmation de leur règlement.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {pendingPlanChanges.map((item) => {
                      const p = item.clinic.pendingPlanChange as any;
                      return (
                        <div
                          key={item.clinic.id}
                          className="p-3.5 rounded-xl bg-white border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-900">{item.clinic.name}</span>
                            <span className="text-xs text-slate-500 ml-1">({item.doctor?.name || "Dr."})</span>
                            <p className="text-xs text-slate-600 mt-0.5">
                              Actuel : <strong className="capitalize">{item.clinic.plan}</strong> &rarr; Demandé :{" "}
                              <strong className="text-emerald-700 capitalize">
                                {p.requestedPlan} ({p.requestedCycle === "yearly" ? "Annuel" : p.requestedCycle === "quarterly" ? "Trimestriel" : "Mensuel"} - {p.requestedPrice} DH)
                              </strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={actionLoading === `approve-plan-${item.clinic.id}`}
                              onClick={() => handleApprovePlanChange(item.clinic.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                            >
                              {actionLoading === `approve-plan-${item.clinic.id}` ? "Validation..." : "Accepter & Mettre à jour"}
                            </button>

                            <button
                              type="button"
                              disabled={actionLoading === `reject-plan-${item.clinic.id}`}
                              onClick={() => handleRejectPlanChange(item.clinic.id)}
                              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold transition cursor-pointer"
                            >
                              Refuser
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* RECHERCHE & FILTRE CABINETS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 w-full sm:max-w-md">
                  <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                    search
                  </span>
                  <input
                    type="text"
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    placeholder="Rechercher cabinet, médecin, ville, spécialité..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition"
                  />
                </div>

                <div className="text-xs text-slate-500 font-semibold">
                  Total : <span className="text-slate-900 tabular-nums">{filteredDoctors.length}</span> cabinet{filteredDoctors.length > 1 ? "s" : ""}
                </div>
              </div>

              {/* LISTE DES CABINETS */}
              <div className="space-y-4">
                {filteredDoctors.map((item) => (
                  <div
                    key={item.clinic.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
                  >
                    {/* Header du cabinet */}
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">{item.clinic.name}</h2>
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {item.clinic.specialty}
                          </span>
                          <span className="text-xs text-slate-500">• {item.clinic.city}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Praticien : <strong className="text-slate-800">{item.doctor?.name || "Non assigné"}</strong> ({item.doctor?.email || "Pas d'email"}) • Assistante :{" "}
                          <strong className="text-slate-800">
                            {item.assistants.length > 0 ? item.assistants.map((a) => a.name).join(", ") : "Aucune"}
                          </strong>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                        {item.clinic.slug && (
                          <a
                            href={`https://${item.clinic.slug}.toncabinet.me`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition"
                          >
                            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                            <span>Accès Cabinet</span>
                          </a>
                        )}

                        <button
                          type="button"
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                          <span>Modifier</span>
                        </button>

                        <button
                          type="button"
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>

                    {/* Barre d'Abonnement, Formule & Actions Rapides */}
                    <div className="px-5 py-3 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Badge Formule */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                            item.clinic.plan === "standard"
                              ? "bg-slate-100 text-slate-800 border border-slate-300"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-300"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {item.clinic.plan === "standard" ? "history" : "verified"}
                          </span>
                          <span>{item.clinic.plan === "standard" ? "Plan STANDARD (30j)" : "Plan PRO (À vie)"}</span>
                        </span>

                        <span className="text-slate-600 font-medium">
                          {item.clinic.billingCycle === "yearly" ? "Annuel" : item.clinic.billingCycle === "quarterly" ? "Trimestriel" : "Mensuel"} •{" "}
                          <strong>{item.clinic.planPrice || (item.clinic.plan === "standard" ? 200 : 250)} DH</strong>
                        </span>

                        {/* Statut Abonnement */}
                        {item.clinic.subscriptionStatus === "trial" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-purple-50 text-purple-800 border border-purple-200">
                            <span className="material-symbols-outlined text-[13px]">timer</span>
                            <span>
                              {(item.clinic.daysRemaining || 0) > 0
                                ? `Essai 7 jours : Reste ${item.clinic.daysRemaining} j`
                                : "Essai 7 jours terminé"}
                            </span>
                          </span>
                        ) : item.clinic.daysRemaining !== null ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold text-[11px] ${
                              item.clinic.daysRemaining > 15
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : item.clinic.daysRemaining > 0
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            <span>
                              {item.clinic.daysRemaining > 0
                                ? `Actif : ${item.clinic.daysRemaining} j restants`
                                : "Abonnement expiré"}
                            </span>
                          </span>
                        ) : null}
                      </div>

                      {/* Actions rapides Formule / Prolongation */}
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
                        {item.clinic.subscriptionStatus === "trial" && (
                          <button
                            type="button"
                            disabled={actionLoading === `renew-${item.clinic.id}`}
                            onClick={() => handleRenewSubscription(item.clinic.id, "validate_trial")}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
                          >
                            Valider le 1er paiement
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={actionLoading === `renew-${item.clinic.id}`}
                          onClick={() =>
                            handleRenewSubscription(
                              item.clinic.id,
                              "change_plan",
                              item.clinic.plan === "standard" ? "pro" : "standard"
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px] transition cursor-pointer"
                          title="Basculer instantanément de Standard à Pro ou inversement"
                        >
                          Passer en {item.clinic.plan === "standard" ? "PRO" : "STANDARD"}
                        </button>

                        <button
                          type="button"
                          disabled={actionLoading === `renew-${item.clinic.id}`}
                          onClick={() => handleRenewSubscription(item.clinic.id, "1month")}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px] transition cursor-pointer"
                        >
                          +1 Mois
                        </button>

                        <button
                          type="button"
                          disabled={actionLoading === `renew-${item.clinic.id}`}
                          onClick={() => handleRenewSubscription(item.clinic.id, "1year")}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px] transition cursor-pointer"
                        >
                          +1 An
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================
              PAGE 3 : DEMANDES D'INSCRIPTION & ONBOARDING
             ============================================================ */}
          {activePage === "requests" && (
            <div className="space-y-6">
              {/* DEMANDES EN ATTENTE (CARTE OTP) */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Demandes en attente d&apos;activation ({data.pendingRequests.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Vérifiez les informations, confirmez le code ou validez directement en un clic.
                    </p>
                  </div>
                </div>

                {data.pendingRequests.length === 0 ? (
                  <div className="bg-white p-10 rounded-2xl border border-slate-200/90 text-center shadow-2xs">
                    <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">inbox</span>
                    <h3 className="text-sm font-bold text-slate-800">Aucune demande en attente</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Toutes les inscriptions ont été traitées. Les nouvelles demandes apparaîtront ici automatiquement.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-white rounded-2xl border-2 border-amber-300 p-5 space-y-4 shadow-sm relative"
                      >
                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div>
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                              Demande #{req.id} • {req.selectedPlan === "standard" ? "Plan Standard" : "Plan Pro"}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 mt-0.5">{req.clinicName}</h3>
                          </div>

                          <div className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 text-xs font-bold font-mono">
                            {getTimeRemainingText(req.expiresAt)}
                          </div>
                        </div>

                        <div className="text-xs space-y-1.5 text-slate-600">
                          <p>Médecin : <strong className="text-slate-900">{req.doctorName}</strong> ({req.doctorEmail})</p>
                          <p>Téléphone : <strong className="text-slate-900">{req.doctorPhone}</strong></p>
                          <p>Spécialité : {req.specialty} • {req.clinicCity}</p>
                          {req.assistantEmail && (
                            <p>Assistante : <strong className="text-slate-900">{req.assistantName || "Secrétaire"}</strong> ({req.assistantEmail})</p>
                          )}
                          <p>Formule choisie : <strong className="capitalize">{req.selectedPlan || "Pro"}</strong> ({req.selectedCycle || "mensuel"} - {req.selectedPrice || 250} DH)</p>
                        </div>

                        {/* Code OTP en évidence */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Code de validation :</span>
                          <span className="text-lg font-black font-mono tracking-widest text-slate-900">{req.otpCode}</span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={actionLoading === `approve-${req.id}`}
                            onClick={() => handleApprove(req.id)}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                          >
                            {actionLoading === `approve-${req.id}` ? "Activation..." : "Valider & Créer le Cabinet"}
                          </button>

                          <button
                            type="button"
                            disabled={actionLoading === `reject-${req.id}`}
                            onClick={() => handleReject(req.id)}
                            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold transition cursor-pointer"
                          >
                            Rejeter
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* HISTORIQUE COMPLET DES DEMANDES */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Archive des demandes d&apos;inscription</h2>
                    <p className="text-xs text-slate-500">Toutes les demandes passées validées, rejetées ou expirées.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={requestSearch}
                      onChange={(e) => setRequestSearch(e.target.value)}
                      placeholder="Filtrer l'historique..."
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                    />

                    <select
                      value={requestStatusFilter}
                      onChange={(e: any) => setRequestStatusFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="approved">Validées</option>
                      <option value="rejected">Rejetées</option>
                      <option value="expired">Expirées</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3">ID</th>
                        <th className="px-5 py-3">Cabinet / Ville</th>
                        <th className="px-5 py-3">Médecin</th>
                        <th className="px-5 py-3">Formule</th>
                        <th className="px-5 py-3">Statut</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRequestsHistory.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3 font-mono font-bold text-slate-500">#{r.id}</td>
                          <td className="px-5 py-3">
                            <span className="font-bold text-slate-900 block">{r.clinicName}</span>
                            <span className="text-[11px] text-slate-400">{r.clinicCity} • {r.specialty}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="font-semibold text-slate-800 block">{r.doctorName}</span>
                            <span className="text-[11px] text-slate-400">{r.doctorEmail}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="capitalize font-bold text-slate-800">{r.selectedPlan || "Pro"}</span>
                            <span className="text-[11px] text-slate-400 block">{r.selectedCycle || "mensuel"}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                r.status === "verified" || r.status === "approved"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : r.status === "rejected"
                                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRequest(r.id)}
                              className="text-slate-400 hover:text-rose-600 transition"
                              title="Supprimer définitivement de l'historique"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              PAGE 4 : GESTION DES PERSONNES (USERS MANAGEMENT)
             ============================================================ */}
          {activePage === "users" && (
            <AdminUsersManagement
              users={data.allUsers || []}
              clinics={data.allClinics || []}
              onUserPasswordChange={(user) => {
                setPasswordModalUser({
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  roleLabel: user.role === "doctor" ? "Médecin" : user.role === "assistant" ? "Assistante" : "Admin",
                });
                setNewPassword("");
              }}
              onRefresh={() => refreshData(true)}
              showFeedback={showFeedback}
            />
          )}

          {/* ============================================================
              PAGE 5 : SUPPORT & WHATSAPP CONFIGURATION
             ============================================================ */}
          {activePage === "platform" && (
            <AdminPlatformSupport
              initialSettings={data.platformSettings}
              onSaved={() => refreshData(true)}
              showFeedback={showFeedback}
            />
          )}

          {/* ============================================================
              PAGE 6 : INFRASTRUCTURE NEON (TÉLÉMÉTRIE)
             ============================================================ */}
          {activePage === "neon" && (
            <AdminNeonHealth
              stats={data.stats}
              onRunVacuum={handleRunVacuum}
              actionLoading={actionLoading}
            />
          )}

          {/* ============================================================
              PAGE 7 : EXPLORATEUR DE BASE DE DONNÉES
             ============================================================ */}
          {activePage === "database" && (
            <AdminDatabaseExplorer />
          )}
        </div>
      </main>

      {/* ============================================================
          MODALES DE GESTION (ÉDITION, CRÉATION, PASSWORD, SUPPRESSION)
         ============================================================ */}

      {/* Modale Édition Cabinet */}
      {editingClinic && (
        <AdminClinicEditModal
          clinic={editingClinic}
          onClose={() => setEditingClinic(null)}
          onSuccess={() => {
            setEditingClinic(null);
            showFeedback("success", "Cabinet mis à jour avec succès.");
            refreshData(true);
          }}
        />
      )}

      {/* Modale Création Cabinet Direct */}
      {createClinicModalOpen && (
        <AdminCreateClinicModal
          prefill={createClinicPrefill}
          onClose={() => setCreateClinicModalOpen(false)}
          onSuccess={() => {
            setCreateClinicModalOpen(false);
            showFeedback("success", "Cabinet et praticiens créés avec succès !");
            refreshData(true);
          }}
        />
      )}

      {/* Modale Réinitialisation Mot de passe */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Modifier le mot de passe : {passwordModalUser.name}
              </h3>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nouveau mot de passe (min. 6 caractères)
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ex: SecurPass2026!"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={actionLoading === "update-password"}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  {actionLoading === "update-password" ? "Enregistrement..." : "Appliquer le mot de passe"}
                </button>

                <button
                  type="button"
                  onClick={copyCredentials}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  title="Copier les identifiants pour WhatsApp"
                >
                  {copiedNotice ? "Copié !" : "Copier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Confirmation Suppression Définitive */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Supprimer définitivement {deleteTarget.clinicName} ?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Cette action supprimera irréversiblement le cabinet, le compte du médecin ({deleteTarget.doctorName}), l&apos;assistante, ainsi que l&apos;ensemble des {deleteTarget.patientsCount} patients et {deleteTarget.visitsCount} consultations associées.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={actionLoading?.startsWith("delete-clinic")}
                onClick={handleConfirmDeleteClinic}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                {actionLoading?.startsWith("delete-clinic") ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
