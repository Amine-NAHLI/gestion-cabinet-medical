"use client";

import { useState, useEffect } from "react";
import {
  adminApproveRequest,
  adminRejectRequest,
  adminUpdateUserPassword,
  adminToggleUserStatus,
  adminToggleClinicStatus,
  getAdminDashboardData,
} from "@/actions/admin";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminDashboardClientProps {
  initialData: any;
  adminEmail: string;
}

export default function AdminDashboardClient({
  initialData,
  adminEmail,
}: AdminDashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<"otp" | "history" | "clinics" | "users">("otp");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Password reset modal state
  const [passwordModalUser, setPasswordModalUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Polling automatique toutes les 5 secondes pour les nouveaux codes OTP
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await getAdminDashboardData();
        setData(fresh);
      } catch (e) {
        // Ignorer les erreurs ponctuelles de polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1-Click Approval
  const handleApprove = async (requestId: number) => {
    setActionLoading(`approve-${requestId}`);
    const res: any = await adminApproveRequest(requestId);
    if (res?.error) {
      showFeedback("error", res.error);
    } else {
      showFeedback("success", "Cabinet et praticien activés avec succès !");
      const fresh = await getAdminDashboardData();
      setData(fresh);
    }
    setActionLoading(null);
  };

  // Rejet
  const handleReject = async (requestId: number) => {
    if (!confirm("Voulez-vous vraiment rejeter cette demande ?")) return;
    setActionLoading(`reject-${requestId}`);
    const res: any = await adminRejectRequest(requestId);
    if (res?.error) {
      showFeedback("error", res.error);
    } else {
      showFeedback("success", "Demande rejetée.");
      const fresh = await getAdminDashboardData();
      setData(fresh);
    }
    setActionLoading(null);
  };

  // Modification mot de passe
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword) return;

    setActionLoading("password-modal");
    const res = await adminUpdateUserPassword(passwordModalUser.id, newPassword);
    if (res.error) {
      showFeedback("error", res.error);
    } else {
      showFeedback("success", `Mot de passe de ${passwordModalUser.name} mis à jour !`);
      setPasswordModalUser(null);
      setNewPassword("");
      const fresh = await getAdminDashboardData();
      setData(fresh);
    }
    setActionLoading(null);
  };

  // Générateur de mot de passe fort
  const generateStrongPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  // Copier les identifiants pour WhatsApp / Email
  const copyCredentials = () => {
    if (!passwordModalUser || !newPassword) return;
    const text = `🏥 *Identifiants MediCabinet*\n👤 *Nom:* ${passwordModalUser.name}\n📧 *Email:* ${passwordModalUser.email}\n🔑 *Nouveau Mot de passe:* ${newPassword}\n🔗 *Lien:* http://localhost:3000/login`;
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  // Toggle statut utilisateur
  const handleToggleUser = async (userId: number, currentStatus: string) => {
    setActionLoading(`user-status-${userId}`);
    const res: any = await adminToggleUserStatus(userId, currentStatus);
    if (res?.error) {
      showFeedback("error", res.error);
    } else {
      showFeedback("success", res.message || "Statut mis à jour.");
      const fresh = await getAdminDashboardData();
      setData(fresh);
    }
    setActionLoading(null);
  };

  // Toggle statut cabinet
  const handleToggleClinic = async (clinicId: number, currentStatus: string) => {
    setActionLoading(`clinic-status-${clinicId}`);
    const res: any = await adminToggleClinicStatus(clinicId, currentStatus);
    if (res?.error) {
      showFeedback("error", res.error);
    } else {
      showFeedback("success", res.message || "Statut cabinet mis à jour.");
      const fresh = await getAdminDashboardData();
      setData(fresh);
    }
    setActionLoading(null);
  };

  // Helper pour calculer le temps restant d'un code OTP
  const getTimeRemainingText = (expiresAtStr: string) => {
    const diffMs = new Date(expiresAtStr).getTime() - Date.now();
    if (diffMs <= 0) return "Expiré";
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* 1. TOP EXECUTIVE NAVBAR (BLANC PRO) */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-sky-400 flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900">MediCabinet</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Super Admin
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Panneau de Contrôle Central de la Plateforme</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={async () => {
              setActionLoading("refreshing");
              try {
                const fresh = await getAdminDashboardData();
                setData(fresh);
                showFeedback("success", "Données actualisées");
              } catch {}
              setActionLoading(null);
            }}
            title="Rafraîchir les données"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs text-xs font-semibold transition cursor-pointer"
          >
            <span className={`material-symbols-outlined text-sm ${actionLoading === "refreshing" ? "animate-spin" : ""}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Actualiser</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{adminEmail}</span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/admin" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* FEEDBACK TOAST */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-18 right-8 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {feedback.type === "success" ? "check_circle" : "error"}
            </span>
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. STATS ROW (BLANC PRO) */}
      <div className="px-4 sm:px-8 pt-6 pb-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Demandes en attente</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-amber-600">{data.stats.pendingCount}</span>
              <span className="text-[11px] text-amber-700/80 font-medium">Codes OTP actifs</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Cabinets Actifs</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{data.stats.activeClinics}</span>
              <span className="text-[11px] text-slate-500">/ {data.stats.totalClinics} total</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Comptes Utilisateurs</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{data.stats.totalUsers}</span>
              <span className="text-[11px] text-slate-500">Médecins & Assistantes</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Passerelle Email</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-700">Resend Configuré</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION (BLANC PRO) */}
      <div className="px-4 sm:px-8 pt-4 pb-2">
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("otp")}
            className={`py-2.5 px-4 rounded-t-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "otp"
                ? "border-slate-900 text-slate-900 bg-white shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          >
            <span className="material-symbols-outlined text-base text-amber-500">bolt</span>
            <span>Codes OTP en Direct</span>
            {data.pendingRequests.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                {data.pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`py-2.5 px-4 rounded-t-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "history"
                ? "border-slate-900 text-slate-900 bg-white shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          >
            <span className="material-symbols-outlined text-base">history</span>
            <span>Historique des Demandes ({data.allRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("clinics")}
            className={`py-2.5 px-4 rounded-t-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "clinics"
                ? "border-slate-900 text-slate-900 bg-white shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          >
            <span className="material-symbols-outlined text-base">domain</span>
            <span>Cabinets Médicaux ({data.allClinics.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`py-2.5 px-4 rounded-t-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "users"
                ? "border-slate-900 text-slate-900 bg-white shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          >
            <span className="material-symbols-outlined text-base">group</span>
            <span>Utilisateurs & Mots de Passe ({data.allUsers.length})</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA (BLANC PRO) */}
      <main className="flex-1 px-4 sm:px-8 py-6">
        
        {/* ===================== TAB 1: CODES OTP EN DIRECT ===================== */}
        {activeTab === "otp" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  Demandes d'Onboarding en Temps Réel
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Les nouveaux médecins apparaissent ici instantanément. Le code à 6 chiffres expire au bout de 5 minutes.
                </p>
              </div>

              <span className="text-[11px] font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                Rafraîchissement automatique actif (5s)
              </span>
            </div>

            {data.pendingRequests.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-slate-200/80 shadow-xs my-6">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">mark_email_read</span>
                <h3 className="font-bold text-slate-800 text-base">Aucun code en attente</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Toutes les demandes ont été traitées. Lorsqu'un médecin s'inscrit sur <code className="text-slate-900 font-mono font-bold">/register</code>, son code s'affichera ici en grand.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.pendingRequests.map((req: any) => {
                  const timeLeft = getTimeRemainingText(req.expiresAt);
                  const isExp = timeLeft === "Expiré";

                  return (
                    <div
                      key={req.id}
                      className="p-6 rounded-3xl bg-white border border-sky-200 shadow-lg shadow-sky-500/5 relative overflow-hidden"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 font-bold text-[10px] uppercase tracking-wider border border-sky-200">
                          Demande #{req.id}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                            isExp
                              ? "bg-red-50 text-red-600 border border-red-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">timer</span>
                          <span>{isExp ? "Code expiré" : `Temps : ${timeLeft}`}</span>
                        </span>
                      </div>

                      {/* BIG OTP CODE DISPLAY */}
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center mb-4 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                          Code d'Activation à 6 Chiffres (OTP)
                        </span>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-3xl sm:text-4xl font-mono font-black text-sky-400 tracking-[8px]">
                            {req.otpCode}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(req.otpCode);
                              showFeedback("success", `Code ${req.otpCode} copié !`);
                            }}
                            title="Copier le code"
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                          </button>
                        </div>
                      </div>

                      {/* Doctor & Clinic Info Table */}
                      <div className="space-y-2 text-xs mb-5">
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Médecin :</span>
                          <span className="text-slate-900 font-bold">{req.doctorName} ({req.specialty})</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Téléphone portable :</span>
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${req.doctorPhone}`}
                              className="text-slate-900 hover:text-sky-600 font-bold flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-xs">call</span>
                              {req.doctorPhone}
                            </a>
                            <a
                              href={`https://wa.me/${req.doctorPhone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 transition"
                            >
                              WhatsApp
                            </a>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Email praticien :</span>
                          <span className="text-slate-800 font-medium font-mono text-[11px]">{req.doctorEmail}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Cabinet & Ville :</span>
                          <span className="text-teal-700 font-bold">{req.clinicName} — {req.clinicCity}</span>
                        </div>
                        {req.assistantName && (
                          <div className="flex justify-between items-center py-1.5">
                            <span className="text-slate-500 font-medium">Assistante :</span>
                            <span className="text-purple-700 font-medium">
                              {req.assistantName} ({req.assistantEmail})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          disabled={actionLoading === `approve-${req.id}`}
                          onClick={() => handleApprove(req.id)}
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/10 transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          <span>Approuver en 1 clic</span>
                        </button>

                        <button
                          disabled={actionLoading === `reject-${req.id}`}
                          onClick={() => handleReject(req.id)}
                          className="py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          <span>Rejeter</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: HISTORIQUE DES DEMANDES ===================== */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Journal des Inscriptions</h2>
                <p className="text-xs text-slate-500">Historique complet de toutes les demandes reçues sur la plateforme</p>
              </div>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Filtrer par médecin, cabinet, ville..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 shadow-xs w-full sm:w-64"
                />
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date & Réf</th>
                      <th className="py-3 px-4">Praticien</th>
                      <th className="py-3 px-4">Cabinet & Ville</th>
                      <th className="py-3 px-4">Code OTP</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.allRequests
                      .filter((r: any) =>
                        r.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.clinicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.clinicCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.doctorEmail.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((req: any) => (
                        <tr key={req.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">#{req.id}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(req.createdAt).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{req.doctorName}</span>
                            <span className="text-[11px] text-slate-500 block font-mono">{req.doctorEmail}</span>
                            <span className="text-[10px] text-sky-700 font-semibold">{req.doctorPhone}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 block">{req.clinicName}</span>
                            <span className="text-[11px] text-slate-500">{req.clinicCity}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                            {req.otpCode}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                req.status === "verified" || req.status === "approved"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : req.status === "pending"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {req.status === "verified"
                                ? "Validé par OTP"
                                : req.status === "approved"
                                ? "Approuvé Admin"
                                : req.status === "pending"
                                ? "En attente"
                                : req.status === "expired"
                                ? "Expiré"
                                : "Rejeté"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {req.status === "pending" && (
                              <button
                                onClick={() => handleApprove(req.id)}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                              >
                                Activer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: CABINETS MÉDICAUX ===================== */}
        {activeTab === "clinics" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cabinets Médicaux Enregistrés</h2>
              <p className="text-xs text-slate-500">Gérez le statut opérationnel de chaque cabinet (Multi-Tenancy)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.allClinics.map((clinic: any) => (
                <div
                  key={clinic.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        #{clinic.id}
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          clinic.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {clinic.status === "active" ? "Actif" : "Suspendu"}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900">{clinic.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{clinic.city} • {clinic.address || "Adresse non renseignée"}</p>
                    <p className="text-xs text-slate-700 mt-1 font-semibold">{clinic.phone || "Sans téléphone"}</p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Inscrit le {new Date(clinic.createdAt).toLocaleDateString("fr-FR")}
                    </span>

                    <button
                      disabled={actionLoading === `clinic-status-${clinic.id}`}
                      onClick={() => handleToggleClinic(clinic.id, clinic.status)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                        clinic.status === "active"
                          ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      }`}
                    >
                      {clinic.status === "active" ? "Suspendre l'accès" : "Réactiver le cabinet"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB 4: UTILISATEURS & MOTS DE PASSE ===================== */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Utilisateurs & Gestion des Mots de Passe</h2>
                <p className="text-xs text-slate-500">
                  Visualisez les identifiants d'accès et réinitialisez les mots de passe des praticiens et assistantes
                </p>
              </div>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Rechercher par nom, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 shadow-xs w-full sm:w-64"
                />
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Utilisateur</th>
                      <th className="py-3 px-4">Identifiant / Email</th>
                      <th className="py-3 px-4">Rôle</th>
                      <th className="py-3 px-4">Cabinet Rattaché</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.allUsers
                      .filter((u: any) =>
                        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.clinicName && u.clinicName.toLowerCase().includes(searchTerm.toLowerCase()))
                      )
                      .map((usr: any) => (
                        <tr key={usr.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{usr.name}</span>
                            <span className="text-[10px] text-slate-400">ID #{usr.id}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            {usr.email}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                usr.role === "superadmin"
                                  ? "bg-slate-900 text-white"
                                  : usr.role === "doctor"
                                  ? "bg-sky-50 text-sky-700 border border-sky-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                              }`}
                            >
                              {usr.role === "superadmin"
                                ? "Super Admin"
                                : usr.role === "doctor"
                                ? "Médecin"
                                : "Assistante"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {usr.clinicName ? (
                              <div>
                                <span className="font-semibold text-slate-800 block">{usr.clinicName}</span>
                                <span className="text-[10px] text-slate-500">{usr.clinicCity}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Plateforme centrale</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              disabled={actionLoading === `user-status-${usr.id}` || usr.role === "superadmin"}
                              onClick={() => handleToggleUser(usr.id, usr.status)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase cursor-pointer ${
                                usr.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {usr.status === "active" ? "Actif" : "Suspendu"}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setPasswordModalUser(usr);
                                setNewPassword("");
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold text-xs transition cursor-pointer shadow-xs"
                            >
                              <span className="material-symbols-outlined text-sm">key</span>
                              <span>Changer mot de passe</span>
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
      </main>

      {/* 5. MODAL MODIFICATION MOT DE PASSE (BLANC PRO) */}
      <AnimatePresence>
        {passwordModalUser && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-slate-800"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-900 text-xl">vpn_key</span>
                  <h3 className="font-bold text-base text-slate-900">Changer le Mot de Passe</h3>
                </div>
                <button
                  onClick={() => setPasswordModalUser(null)}
                  className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-4 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500 font-medium">Utilisateur :</span>
                  <span className="text-slate-900 font-bold">{passwordModalUser.name}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500 font-medium">Email d'accès :</span>
                  <span className="text-slate-800 font-mono font-semibold">{passwordModalUser.email}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500 font-medium">Rôle :</span>
                  <span className="text-slate-700 font-bold uppercase text-[10px]">{passwordModalUser.role}</span>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Nouveau mot de passe
                    </label>
                    <button
                      type="button"
                      onClick={generateStrongPassword}
                      className="text-[11px] text-sky-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                      Générer mot de passe fort
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Au moins 6 caractères"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-mono text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition shadow-xs"
                  />
                </div>

                {newPassword && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={copyCredentials}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      <span>{copiedNotice ? "Copié dans le presse-papier !" : "Copier identifiants pour WhatsApp / Email"}</span>
                    </button>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === "password-modal" || !newPassword}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    <span>Enregistrer</span>
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
