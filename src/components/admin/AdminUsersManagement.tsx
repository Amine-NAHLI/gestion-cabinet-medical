"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  adminDeleteClinic,
  adminCleanOrphanClinics,
} from "@/actions/admin";

interface UserItem {
  id: number;
  clinicId?: number | null;
  clinicName: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  isOnboarded: boolean;
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: string;
}

interface ClinicItem {
  id: number;
  name: string;
}

interface DoctorWithAssistantItem {
  clinic: {
    id: number;
    name: string;
    city: string;
    address: string;
    phone: string;
    specialty: string;
    createdAt: string;
  };
  doctor: {
    id: number;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
  } | null;
  assistants: Array<{
    id: number;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
  }>;
  metrics: {
    patientsCount: number;
    visitsCount: number;
    finishedVisitsCount: number;
    appointmentsCount: number;
    revenue: number;
  };
}

interface AdminUsersManagementProps {
  users: UserItem[];
  clinics: ClinicItem[];
  doctorsWithAssistants: DoctorWithAssistantItem[];
  onRefresh: () => Promise<void>;
  onPasswordModal: (user: { id: number; name: string; email: string; roleLabel: string }) => void;
  showFeedback: (type: "success" | "error", message: string) => void;
}

export default function AdminUsersManagement({
  users,
  clinics,
  doctorsWithAssistants,
  onRefresh,
  onPasswordModal,
  showFeedback,
}: AdminUsersManagementProps) {
  // Vue active : "teams" (Médecin + Assistante ensemble) ou "all" (Tableau à plat de tous les comptes)
  const [viewMode, setViewMode] = useState<"teams" | "all">("teams");
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "doctor" | "assistant" | "superadmin">("all");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Modale création d'utilisateur
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "assistant" as "doctor" | "assistant" | "superadmin",
    clinicId: clinics[0]?.id || undefined,
    status: "active" as "active" | "suspended",
  });

  // Modale modification d'utilisateur
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Modale suppression totale d'un cabinet (Médecin + Assistante + Patients + Consultations)
  const [cascadeDeleteTarget, setCascadeDeleteTarget] = useState<{
    clinicId: number;
    clinicName: string;
    doctorName: string;
    assistantsCount: number;
    patientsCount: number;
    visitsCount: number;
  } | null>(null);

  // Modale suppression d'une assistante uniquement
  const [assistantDeleteTarget, setAssistantDeleteTarget] = useState<{
    id: number;
    name: string;
    clinicName: string;
  } | null>(null);

  // Détecter les cabinets orphelins (cabinets qui n'ont plus de médecin titulaire)
  const orphanClinics = useMemo(() => {
    return (doctorsWithAssistants || []).filter((item) => item.doctor === null);
  }, [doctorsWithAssistants]);

  // Équipes médicales actives (Médecin + Assistante)
  const activeTeams = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const teams = (doctorsWithAssistants || []).filter((item) => item.doctor !== null);

    if (!q) return teams;
    return teams.filter((item) => {
      const matchDoc =
        item.doctor?.name.toLowerCase().includes(q) ||
        item.doctor?.email.toLowerCase().includes(q) ||
        item.doctor?.phone.toLowerCase().includes(q);
      const matchClinic =
        item.clinic.name.toLowerCase().includes(q) ||
        item.clinic.city.toLowerCase().includes(q) ||
        item.clinic.specialty.toLowerCase().includes(q);
      const matchAssistant = item.assistants.some(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.phone.toLowerCase().includes(q)
      );
      return matchDoc || matchClinic || matchAssistant;
    });
  }, [doctorsWithAssistants, userSearch]);

  // Utilisateurs superadmin seuls
  const superAdmins = useMemo(() => {
    return (users || []).filter((u) => u.role === "superadmin");
  }, [users]);

  // Filtrage pour le mode tableau complet
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return (users || []).filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.clinicName && u.clinicName.toLowerCase().includes(q))
      );
    });
  }, [users, userSearch, roleFilter]);

  // Nettoyage en 1 clic de tous les cabinets orphelins
  const handleCleanOrphans = async () => {
    setLoadingAction("clean-orphans");
    try {
      const res: any = await adminCleanOrphanClinics();
      if (res?.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback("success", res.message || "Cabinets orphelins nettoyés.");
        await onRefresh();
      }
    } catch {
      showFeedback("error", "Erreur lors du nettoyage.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Suppression cascade d'un cabinet
  const handleConfirmCascadeDelete = async () => {
    if (!cascadeDeleteTarget) return;
    setLoadingAction("cascade-delete");
    try {
      const res: any = await adminDeleteClinic(cascadeDeleteTarget.clinicId);
      if (res?.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback(
          "success",
          res.message || "Le cabinet, le médecin, l'assistante et tous les dossiers ont été supprimés."
        );
        setCascadeDeleteTarget(null);
        await onRefresh();
      }
    } catch {
      showFeedback("error", "Erreur lors de la suppression.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Suppression d'une assistante seule
  const handleConfirmAssistantDelete = async () => {
    if (!assistantDeleteTarget) return;
    setLoadingAction("assistant-delete");
    try {
      const res: any = await adminDeleteUser(assistantDeleteTarget.id);
      if (res?.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback(
          "success",
          `L'assistante "${assistantDeleteTarget.name}" a été retirée. Le cabinet et ses patients restent intacts.`
        );
        setAssistantDeleteTarget(null);
        await onRefresh();
      }
    } catch {
      showFeedback("error", "Erreur lors de la suppression.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Création utilisateur
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("create");
    try {
      const res: any = await adminCreateUser({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password || "Cabinet123!",
        phone: createForm.phone,
        role: createForm.role,
        clinicId: createForm.role === "superadmin" ? null : Number(createForm.clinicId),
        status: createForm.status,
      });

      if (res?.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback("success", res.message || "Utilisateur créé avec succès.");
        setIsCreating(false);
        setCreateForm({
          name: "",
          email: "",
          password: "",
          phone: "",
          role: "assistant",
          clinicId: clinics[0]?.id || undefined,
          status: "active",
        });
        await onRefresh();
      }
    } catch {
      showFeedback("error", "Erreur lors de la création.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Modification utilisateur
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoadingAction("edit");
    try {
      const res: any = await adminUpdateUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone || undefined,
        role: editingUser.role as any,
        clinicId: editingUser.role === "superadmin" ? null : editingUser.clinicId,
        status: editingUser.status as any,
        bio: editingUser.bio || undefined,
      });

      if (res?.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback("success", res.message || "Utilisateur mis à jour.");
        setEditingUser(null);
        await onRefresh();
      }
    } catch {
      showFeedback("error", "Erreur lors de la mise à jour.");
    } finally {
      setLoadingAction(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatMoney = (amount: number) =>
    `${Math.round(amount).toLocaleString("fr-FR")} DH`;

  return (
    <div className="space-y-6">
      {/* EN-TÊTE PRINCIPAL AVEC COMMUTATEUR DE VUE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Médecins & Assistantes (Équipes Médicales)</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold tabular-nums">
              {activeTeams.length} cabinet{activeTeams.length > 1 ? "s" : ""} actif{activeTeams.length > 1 ? "s" : ""}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualisez chaque médecin côte-à-côte avec son assistante, son cabinet et ses patients.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* Toggle de vue */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode("teams")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === "teams"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">medical_services</span>
              <span>Vue Équipes (Médecin ⟷ Assistante)</span>
            </button>

            <button
              onClick={() => setViewMode("all")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === "all"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">table_rows</span>
              <span>Tous les comptes ({users?.length || 0})</span>
            </button>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>Nouveau Compte</span>
          </button>
        </div>
      </div>

      {/* BANNIÈRE D'ALERTE : CABINETS ORPHELINS (SANS MÉDECIN) */}
      {orphanClinics.length > 0 && (
        <div className="bg-red-50/90 border border-red-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-red-200/70">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
              <div>
                <h3 className="font-bold text-red-950 text-sm">
                  {orphanClinics.length} Cabinet{orphanClinics.length > 1 ? "s" : ""} orphelin{orphanClinics.length > 1 ? "s" : ""} détecté{orphanClinics.length > 1 ? "s" : ""} (Sans médecin)
                </h3>
                <p className="text-xs text-red-800 mt-0.5">
                  Leur médecin a été supprimé précédemment, mais le cabinet et ses dossiers patients sont encore en base.
                </p>
              </div>
            </div>

            <button
              onClick={handleCleanOrphans}
              disabled={loadingAction === "clean-orphans"}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 self-start sm:self-center"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              <span>
                {loadingAction === "clean-orphans"
                  ? "Nettoyage en cours..."
                  : `Nettoyer les ${orphanClinics.length} cabinets orphelins`}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {orphanClinics.map((oc) => (
              <div
                key={oc.clinic.id}
                className="bg-white/80 p-3 rounded-xl border border-red-200/80 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{oc.clinic.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {oc.clinic.city} • {oc.metrics.patientsCount} patients restants
                  </p>
                </div>
                <button
                  onClick={() =>
                    setCascadeDeleteTarget({
                      clinicId: oc.clinic.id,
                      clinicName: oc.clinic.name,
                      doctorName: "Aucun médecin lié (Orphelin)",
                      assistantsCount: oc.assistants.length,
                      patientsCount: oc.metrics.patientsCount,
                      visitsCount: oc.metrics.visitsCount,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-[11px] font-semibold transition cursor-pointer"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BARRE DE RECHERCHE */}
      <div className="relative w-full">
        <span className="material-symbols-outlined text-[17px] text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">
          search
        </span>
        <input
          type="text"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder="Rechercher par médecin, assistante, ville, nom de cabinet..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 shadow-[0_1px_2px_rgba(16,24,40,0.04)] focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
        />
      </div>

      {/* ============================================================
          VUE 1 : ÉQUIPES MÉDICALES (MÉDECIN CÔTE-À-CÔTE AVEC SON ASSISTANTE)
         ============================================================ */}
      {viewMode === "teams" && (
        <div className="space-y-5">
          {activeTeams.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">
                medical_services
              </span>
              <h3 className="font-semibold text-slate-800 text-sm">
                Aucune équipe médicale active
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {userSearch
                  ? "Aucun résultat ne correspond à votre recherche."
                  : "Chaque médecin validé avec son assistante et son cabinet apparaîtra ici."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTeams.map((team) => (
                <div
                  key={team.clinic.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden"
                >
                  {/* EN-TÊTE DU CABINET & STATISTIQUES */}
                  <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-slate-900 text-base">
                          {team.clinic.name}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-semibold">
                          {team.clinic.specialty}
                        </span>
                        <span className="text-xs text-slate-500">• {team.clinic.city}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2 tabular-nums">
                        <span>Créé le {formatDate(team.clinic.createdAt)}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-800">
                          {team.metrics.patientsCount} patient{team.metrics.patientsCount > 1 ? "s" : ""}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-sky-700">
                          {team.metrics.visitsCount} consultation{team.metrics.visitsCount > 1 ? "s" : ""}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-700">
                          {formatMoney(team.metrics.revenue)}
                        </span>
                      </p>
                    </div>

                    {/* BOUTON SUPPRIMER TOUT LE CABINET */}
                    <button
                      onClick={() =>
                        setCascadeDeleteTarget({
                          clinicId: team.clinic.id,
                          clinicName: team.clinic.name,
                          doctorName: team.doctor?.name || "Médecin",
                          assistantsCount: team.assistants.length,
                          patientsCount: team.metrics.patientsCount,
                          visitsCount: team.metrics.visitsCount,
                        })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 text-xs font-semibold transition cursor-pointer self-start sm:self-center shrink-0"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete_forever</span>
                      <span>Supprimer TOUT (Cabinet + Patients)</span>
                    </button>
                  </div>

                  {/* CORPS : MÉDECIN ⟷ ASSISTANTE CÔTE-À-CÔTE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    {/* COLONNE GAUCHE : MÉDECIN TITULAIRE */}
                    <div className="p-5 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[17px] text-sky-600">
                              stethoscope
                            </span>
                            <span>Médecin Titulaire</span>
                          </span>

                          <span className="text-[11px] text-slate-400">
                            ID #{team.doctor?.id}
                          </span>
                        </div>

                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-sky-100 border border-sky-200 text-sky-800 flex items-center justify-center font-bold text-base shrink-0">
                            {team.doctor?.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 text-sm truncate">
                              {team.doctor?.name}
                            </h3>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {team.doctor?.email}
                            </p>
                            <p className="text-xs text-slate-600 font-mono mt-0.5">
                              {team.doctor?.phone || "Sans téléphone"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            if (!team.doctor) return;
                            const fullUser = users.find((u) => u.id === team.doctor!.id);
                            if (fullUser) setEditingUser(fullUser);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                          <span>Modifier</span>
                        </button>

                        <button
                          onClick={() => {
                            if (!team.doctor) return;
                            onPasswordModal({
                              id: team.doctor.id,
                              name: team.doctor.name,
                              email: team.doctor.email,
                              roleLabel: "Médecin",
                            });
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">key</span>
                          <span>Mot de passe</span>
                        </button>
                      </div>
                    </div>

                    {/* COLONNE DROITE : ASSISTANTE(S) */}
                    <div className="p-5 flex flex-col justify-between space-y-4 bg-slate-50/40">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-800 uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[17px] text-purple-600">
                              support_agent
                            </span>
                            <span>Assistante Médicale ({team.assistants.length})</span>
                          </span>
                        </div>

                        {team.assistants.length === 0 ? (
                          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-white/60 text-center space-y-2">
                            <p className="text-xs text-slate-400">
                              Aucune assistante n'est rattachée à ce cabinet.
                            </p>
                            <button
                              onClick={() => {
                                setCreateForm({
                                  name: "",
                                  email: "",
                                  password: "",
                                  phone: "",
                                  role: "assistant",
                                  clinicId: team.clinic.id,
                                  status: "active",
                                });
                                setIsCreating(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">add</span>
                              <span>Ajouter une assistante</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {team.assistants.map((assistant) => (
                              <div
                                key={assistant.id}
                                className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3"
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 text-purple-800 flex items-center justify-center font-bold text-xs shrink-0">
                                    {assistant.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 text-xs truncate">
                                      {assistant.name}
                                    </p>
                                    <p className="text-[11px] text-slate-500 truncate">
                                      {assistant.email}
                                    </p>
                                    <p className="text-[11px] text-slate-600 font-mono">
                                      {assistant.phone || "Sans tél"}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() =>
                                      onPasswordModal({
                                        id: assistant.id,
                                        name: assistant.name,
                                        email: assistant.email,
                                        roleLabel: "Assistante",
                                      })
                                    }
                                    title="Mot de passe"
                                    className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">key</span>
                                  </button>

                                  <button
                                    onClick={() =>
                                      setAssistantDeleteTarget({
                                        id: assistant.id,
                                        name: assistant.name,
                                        clinicName: team.clinic.name,
                                      })
                                    }
                                    title="Supprimer l'assistante uniquement"
                                    className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTION SUPER ADMINS */}
          {superAdmins.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <span className="material-symbols-outlined text-slate-600 text-[18px]">
                  shield_person
                </span>
                <span>Super Administrateurs Système ({superAdmins.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {superAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-xs truncate">
                          {admin.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{admin.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        onPasswordModal({
                          id: admin.id,
                          name: admin.name,
                          email: admin.email,
                          roleLabel: "Super Admin",
                        })
                      }
                      title="Changer le mot de passe"
                      className="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">key</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          VUE 2 : TOUS LES COMPTES (TABLEAU CLASSIQUE À PLAT)
         ============================================================ */}
      {viewMode === "all" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "Tous", count: users?.length || 0 },
              {
                id: "doctor",
                label: "Médecins",
                count: users?.filter((u) => u.role === "doctor").length || 0,
              },
              {
                id: "assistant",
                label: "Assistantes",
                count: users?.filter((u) => u.role === "assistant").length || 0,
              },
              {
                id: "superadmin",
                label: "Super Admins",
                count: users?.filter((u) => u.role === "superadmin").length || 0,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  roleFilter === tab.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.2 rounded-full ${
                    roleFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200/60 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                Aucun compte ne correspond à votre recherche.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Utilisateur</th>
                      <th className="px-5 py-3">Rôle</th>
                      <th className="px-5 py-3">Cabinet rattaché</th>
                      <th className="px-5 py-3">Statut</th>
                      <th className="px-5 py-3">Inscrit le</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">
                                {u.name}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {u.email}
                                {u.phone ? ` • ${u.phone}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              u.role === "doctor"
                                ? "bg-sky-50 text-sky-700 border border-sky-200"
                                : u.role === "assistant"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-slate-100 text-slate-800 border border-slate-300"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {u.role === "doctor"
                                ? "stethoscope"
                                : u.role === "assistant"
                                ? "support_agent"
                                : "shield_person"}
                            </span>
                            <span>
                              {u.role === "doctor"
                                ? "Médecin"
                                : u.role === "assistant"
                                ? "Assistante"
                                : "Super Admin"}
                            </span>
                          </span>
                        </td>

                        <td className="px-5 py-3 font-medium text-slate-700">
                          {u.clinicName || "—"}
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              u.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                            <span>{u.status === "active" ? "Actif" : "Suspendu"}</span>
                          </span>
                        </td>

                        <td className="px-5 py-3 text-slate-500 tabular-nums">
                          {formatDate(u.createdAt)}
                        </td>

                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingUser(u)}
                              title="Modifier"
                              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[17px]">edit</span>
                            </button>

                            <button
                              onClick={() =>
                                onPasswordModal({
                                  id: u.id,
                                  name: u.name,
                                  email: u.email,
                                  roleLabel:
                                    u.role === "doctor"
                                      ? "Médecin"
                                      : u.role === "assistant"
                                      ? "Assistante"
                                      : "Super Admin",
                                })
                              }
                              title="Changer mot de passe"
                              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[17px]">key</span>
                            </button>

                            {u.role !== "superadmin" && (
                              <button
                                onClick={() => {
                                  if (u.role === "doctor" && u.clinicId) {
                                    setCascadeDeleteTarget({
                                      clinicId: u.clinicId,
                                      clinicName: u.clinicName,
                                      doctorName: u.name,
                                      assistantsCount: 1,
                                      patientsCount: 0,
                                      visitsCount: 0,
                                    });
                                  } else {
                                    setAssistantDeleteTarget({
                                      id: u.id,
                                      name: u.name,
                                      clinicName: u.clinicName,
                                    });
                                  }
                                }}
                                title="Supprimer"
                                className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[17px]">delete</span>
                              </button>
                            )}
                          </div>
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

      {/* MODALE DE CONFIRMATION DE SUPPRESSION TOTALE DU CABINET */}
      <AnimatePresence>
        {cascadeDeleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCascadeDeleteTarget(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-red-200 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">delete_forever</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Suppression TOTALE du Cabinet
                  </h3>
                  <p className="text-xs text-red-600 font-medium">
                    {cascadeDeleteTarget.clinicName}
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-red-50 rounded-xl border border-red-100 text-xs text-red-950 space-y-1.5 leading-relaxed">
                <p className="font-semibold">
                  ⚠️ Cette action est irréversible et supprimera TOUT le contenu :
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-900">
                  <li>Le compte du médecin ({cascadeDeleteTarget.doctorName})</li>
                  <li>L'assistante rattachée à ce cabinet</li>
                  <li>
                    <strong>L'intégralité des {cascadeDeleteTarget.patientsCount} dossiers patients</strong>
                  </li>
                  <li>
                    <strong>Toutes les {cascadeDeleteTarget.visitsCount} consultations et ordonnances</strong>
                  </li>
                  <li>Les rendez-vous, messages et réglages du cabinet</li>
                  <li>Le cabinet lui-même de la base de données</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCascadeDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={loadingAction === "cascade-delete"}
                  onClick={handleConfirmCascadeDelete}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {loadingAction === "cascade-delete"
                    ? "Suppression totale..."
                    : "Oui, tout supprimer définitivement"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE DE SUPPRESSION D'UNE ASSISTANTE SEULE */}
      <AnimatePresence>
        {assistantDeleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssistantDeleteTarget(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative z-10 w-full max-w-sm bg-white rounded-2xl border border-red-200 p-5 shadow-2xl space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">person_remove</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Supprimer l'assistante ?
                  </h3>
                  <p className="text-xs text-slate-500">{assistantDeleteTarget.name}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Seul le compte de cette assistante sera supprimé. Le cabinet{" "}
                <strong>{assistantDeleteTarget.clinicName}</strong>, le médecin et tous les
                dossiers patients resteront intacts.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssistantDeleteTarget(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={loadingAction === "assistant-delete"}
                  onClick={handleConfirmAssistantDelete}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {loadingAction === "assistant-delete" ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE CRÉATION D'UTILISATEUR */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative z-10 w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-base">
                  Créer un nouvel utilisateur
                </h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="Dr. Ahmed Benali"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email de connexion *
                    </label>
                    <input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="ahmed@gmail.com"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="text"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="0612345678"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Mot de passe initial
                    </label>
                    <input
                      type="text"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Cabinet123!"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Rôle utilisateur
                    </label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value="doctor">Médecin</option>
                      <option value="assistant">Assistante</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>

                  {createForm.role !== "superadmin" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Cabinet associé
                      </label>
                      <select
                        value={createForm.clinicId || ""}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, clinicId: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none cursor-pointer"
                      >
                        {clinics.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loadingAction === "create"}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    {loadingAction === "create" ? "Création..." : "Créer l'utilisateur"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE ÉDITION D'UTILISATEUR */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative z-10 w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-base">
                  Modifier l'utilisateur #{editingUser.id}
                </h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      required
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="text"
                      value={editingUser.phone || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Rôle</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value="doctor">Médecin</option>
                      <option value="assistant">Assistante</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {editingUser.role !== "superadmin" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Cabinet associé
                      </label>
                      <select
                        value={editingUser.clinicId || ""}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            clinicId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none cursor-pointer"
                      >
                        <option value="">Aucun cabinet</option>
                        {clinics.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Statut</label>
                    <select
                      value={editingUser.status}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, status: e.target.value as any })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value="active">Actif</option>
                      <option value="suspended">Suspendu</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loadingAction === "edit"}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    {loadingAction === "edit" ? "Enregistrement..." : "Enregistrer"}
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
