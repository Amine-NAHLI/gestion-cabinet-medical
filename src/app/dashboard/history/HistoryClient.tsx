"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { exportClinicPatientsData } from "@/actions/settings";
import { downloadFilledPrescriptionPdf } from "@/lib/prescriptionTemplateUtils";
import { updatePatient, deletePatient } from "@/actions/patients";
import AddPatientModal from "@/components/AddPatientModal";

export interface ClinicalDocument {
  id: string;
  title: string;
  type: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface PatientVisitRecord {
  id: number;
  date: string;
  disease: string | null;
  diagnosis: string | null;
  notes: string | null;
  status: string;
  bloodPressure?: string | null;
  heartRate?: number | null;
  temperature?: string | null;
  weight?: string | null;
  height?: string | null;
  amountToPay: string | null;
  paymentStatus: string;
  paymentMethod?: string | null;
  documents?: ClinicalDocument[];
  medicines?: Array<{ name: string; instructions: string }>;
}

export interface PatientHistoryProfile {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  age: number;
  mutuelle: string | null;
  cin: string | null;
  gender: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  antecedents: string | null;
  address: string | null;
  createdAt: string;
  visits: PatientVisitRecord[];
  lastVisitDate: string | null;
  totalVisits: number;
  finishedVisitsCount: number;
}

export interface HistoryVisitItem {
  id: number;
  patientId: number;
  amountToPay: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paidAt?: string | null;
  disease: string | null;
  diagnosis: string | null;
  notes?: string | null;
  bloodPressure?: string | null;
  heartRate?: number | null;
  temperature?: string | null;
  weight?: string | null;
  height?: string | null;
  documents?: ClinicalDocument[];
  medicines?: Array<{ name: string; instructions: string }>;
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
    address?: string | null;
    createdAt?: string;
  };
  createdAt: string;
}

interface HistoryClientProps {
  visits: HistoryVisitItem[];
  patients: PatientHistoryProfile[];
  role?: string;
  isStandard?: boolean;
  archivedCount?: number;
  daysUntilReset?: number;
  supportWhatsapp?: string;
  supportWhatsappMessage?: string;
  clinicSettings?: any;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  biologie: "Bilan Biologique",
  imagerie: "Imagerie / Radio / Scanner",
  compte_rendu: "Compte-rendu",
  ordonnance_externe: "Ordonnance externe",
  note: "Observation clinique",
  autre: "Document médical",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Espèces",
  card: "Carte bancaire",
  check: "Chèque",
  insurance: "Mutuelle / Prise en charge",
  free: "Gratuit / Exonéré",
};

export default function HistoryClient({
  visits: initialVisits,
  patients: initialPatients,
  role,
  isStandard = false,
  archivedCount = 0,
  daysUntilReset = 30,
  clinicSettings,
}: HistoryClientProps) {
  // Navigation entre les deux perspectives : Par Patient vs Journal chronologique
  const [activeTab, setActiveTab] = useState<"patients" | "visits">("patients");

  const [patientsList, setPatientsList] = useState(initialPatients);
  const [visitsList, setVisitsList] = useState(initialVisits);

  useEffect(() => {
    setPatientsList(initialPatients);
  }, [initialPatients]);

  useEffect(() => {
    setVisitsList(initialVisits);
  }, [initialVisits]);

  // Recherche & filtres universels
  const [search, setSearch] = useState("");
  const [patientFilter, setPatientFilter] = useState<"all" | "allergies" | "antecedents" | "with_visits" | "without_visits">("all");
  const [filterPayment, setFilterPayment] = useState<"all" | "paid" | "pending">("all");
  const [filterDocument, setFilterDocument] = useState<"all" | "with_docs">("all");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today" | "week" | "month">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Tiroirs d'inspection
  const [selectedPatientDossier, setSelectedPatientDossier] = useState<PatientHistoryProfile | null>(null);
  const [selectedVisitDossier, setSelectedVisitDossier] = useState<HistoryVisitItem | null>(null);

  // Édition coordonnées patient
  const [editingPatient, setEditingPatient] = useState<PatientHistoryProfile | null>(null);
  const [editMutuelleChoice, setEditMutuelleChoice] = useState("");
  const [editCustomMutuelle, setEditCustomMutuelle] = useState("");

  // Visualiseur de documents haute définition
  const [activeViewerDoc, setActiveViewerDoc] = useState<{
    doc: ClinicalDocument;
    patientName: string;
    date: string;
  } | null>(null);

  // États de chargement et retours d'action
  const [deletingPatientId, setDeletingPatientId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // Pré-remplissage du sélecteur mutuelle lors de l'édition
  useEffect(() => {
    if (editingPatient) {
      const val = editingPatient.mutuelle || "";
      const KNOWN = ["CNSS", "CNOPS", "FAR", "Saham", "RMA", "AXA", "Wafa Assurance", "AtlantaSanad", "MGPAP"];
      if (!val) {
        setEditMutuelleChoice("");
        setEditCustomMutuelle("");
      } else if (KNOWN.includes(val)) {
        setEditMutuelleChoice(val);
        setEditCustomMutuelle("");
      } else {
        setEditMutuelleChoice("Autre");
        setEditCustomMutuelle(val);
      }
    }
  }, [editingPatient]);

  // Synchronisation du patient inspecté si ses données sont modifiées
  useEffect(() => {
    if (selectedPatientDossier) {
      const current = patientsList.find((p) => p.id === selectedPatientDossier.id);
      if (current) setSelectedPatientDossier(current);
    }
  }, [patientsList, selectedPatientDossier]);

  // Suppression d'un dossier patient
  const handleDeletePatient = async (patientId: number, name: string) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer définitivement le dossier de ${name} ?\nToutes les consultations et ordonnances associées seront effacées.`
      )
    ) {
      return;
    }

    try {
      setDeletingPatientId(patientId);
      const res = await deletePatient(patientId);
      if (res && res.success) {
        showToast(`Dossier de ${name} supprimé avec succès.`);
        setPatientsList((prev) => prev.filter((p) => p.id !== patientId));
        setVisitsList((prev) => prev.filter((v) => v.patientId !== patientId));
        if (selectedPatientDossier?.id === patientId) setSelectedPatientDossier(null);
        if (selectedVisitDossier?.patientId === patientId) setSelectedVisitDossier(null);
        if (editingPatient?.id === patientId) setEditingPatient(null);
      } else {
        showToast(res?.error || "Erreur lors de la suppression.");
      }
    } finally {
      setDeletingPatientId(null);
    }
  };

  // Soumission de mise à jour de fiche patient
  const handleUpdatePatientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPatient) return;
    const formData = new FormData(e.currentTarget);
    const res = await updatePatient(editingPatient.id, formData);
    if (res && res.success) {
      showToast("Dossier patient mis à jour.");
      const updatedFields = {
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        phone: formData.get("phone") as string,
        age: parseInt(formData.get("age") as string) || editingPatient.age,
        mutuelle: (formData.get("mutuelle") as string) || null,
        cin: (formData.get("cin") as string) || null,
        bloodGroup: (formData.get("bloodGroup") as string) || null,
        allergies: (formData.get("allergies") as string) || null,
        antecedents: (formData.get("antecedents") as string) || null,
        address: (formData.get("address") as string) || null,
      };

      setPatientsList((prev) =>
        prev.map((p) => (p.id === editingPatient.id ? { ...p, ...updatedFields } : p))
      );
      setVisitsList((prev) =>
        prev.map((v) =>
          v.patientId === editingPatient.id
            ? { ...v, patient: { ...v.patient, ...updatedFields } }
            : v
        )
      );
      setEditingPatient(null);
    } else {
      showToast(res?.error || "Erreur lors de la mise à jour.");
    }
  };

  // Téléchargement ordonnance PDF
  const handleDownloadPrescription = (
    e: React.MouseEvent,
    patientInfo: {
      firstName: string;
      lastName: string;
      age: number;
      phone: string;
      gender?: string | null;
      cin?: string | null;
      mutuelle?: string | null;
    },
    medicines?: Array<{ name: string; instructions: string }>,
    dateStr?: string
  ) => {
    e.stopPropagation();
    if (!medicines || medicines.length === 0) return;
    downloadFilledPrescriptionPdf({
      patient: patientInfo,
      medicines,
      date: dateStr ? new Date(dateStr) : new Date(),
      settings: clinicSettings,
    });
  };

  // Exportation CSV
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await exportClinicPatientsData();
      if (res?.success && res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          res.filename || `sauvegarde_cabinet_${new Date().toISOString().split("T")[0]}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Export Excel (.CSV) téléchargé avec succès.");
      }
    } catch {
      showToast("Erreur lors de l'exportation.");
    } finally {
      setIsExporting(false);
    }
  };

  // Calcul IMC
  const computeBmi = (weight?: string | null, height?: string | null) => {
    if (!weight || !height) return null;
    const w = parseFloat(weight.replace(",", "."));
    const h = parseFloat(height.replace(",", ".")) / 100;
    if (w > 0 && h > 0) return (w / (h * h)).toFixed(1);
    return null;
  };

  // Filtrage des patients (Vue Par Patient)
  const filteredPatients = useMemo(() => {
    return patientsList.filter((p) => {
      if (patientFilter === "allergies" && !p.allergies) return false;
      if (patientFilter === "antecedents" && !p.antecedents) return false;
      if (patientFilter === "with_visits" && p.totalVisits === 0) return false;
      if (patientFilter === "without_visits" && p.totalVisits > 0) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();

      const fullName = `${p.lastName} ${p.firstName}`.toLowerCase();
      const phone = p.phone.toLowerCase();
      const cin = (p.cin || "").toLowerCase();
      const mutuelle = (p.mutuelle || "").toLowerCase();
      const allergies = (p.allergies || "").toLowerCase();
      const antecedents = (p.antecedents || "").toLowerCase();

      const hasMatchingVisit = p.visits.some(
        (v) =>
          (v.disease && v.disease.toLowerCase().includes(q)) ||
          (v.diagnosis && v.diagnosis.toLowerCase().includes(q)) ||
          (v.notes && v.notes.toLowerCase().includes(q)) ||
          v.medicines?.some((m) => m.name.toLowerCase().includes(q)) ||
          v.documents?.some((d) => d.title.toLowerCase().includes(q))
      );

      return (
        fullName.includes(q) ||
        phone.includes(q) ||
        cin.includes(q) ||
        mutuelle.includes(q) ||
        allergies.includes(q) ||
        antecedents.includes(q) ||
        hasMatchingVisit
      );
    });
  }, [patientsList, search, patientFilter]);

  // Filtrage des consultations (Vue Journal chronologique)
  const filteredVisits = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return visitsList.filter((item) => {
      if (filterPayment === "paid" && item.paymentStatus !== "paid") return false;
      if (filterPayment === "pending" && item.paymentStatus === "paid") return false;
      if (filterDocument === "with_docs" && (!item.documents || item.documents.length === 0)) return false;

      const itemTime = new Date(item.createdAt).getTime();
      if (filterPeriod === "today" && itemTime < startOfToday) return false;
      if (filterPeriod === "week" && itemTime < sevenDaysAgo) return false;
      if (filterPeriod === "month" && itemTime < startOfMonth) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();

      const patientName = `${item.patient.lastName} ${item.patient.firstName}`.toLowerCase();
      const patientPhone = item.patient.phone.toLowerCase();
      const cin = (item.patient.cin || "").toLowerCase();
      const mutuelle = (item.patient.mutuelle || "").toLowerCase();
      const disease = (item.disease || "").toLowerCase();
      const diagnosis = (item.diagnosis || "").toLowerCase();
      const notes = (item.notes || "").toLowerCase();
      const medicineMatch = item.medicines?.some(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.instructions && m.instructions.toLowerCase().includes(q))
      );
      const documentMatch = item.documents?.some(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.notes && d.notes.toLowerCase().includes(q))
      );

      return (
        patientName.includes(q) ||
        patientPhone.includes(q) ||
        cin.includes(q) ||
        mutuelle.includes(q) ||
        disease.includes(q) ||
        diagnosis.includes(q) ||
        notes.includes(q) ||
        Boolean(medicineMatch) ||
        Boolean(documentMatch)
      );
    });
  }, [visitsList, search, filterPayment, filterDocument, filterPeriod]);

  // Statistiques calculées pour la vue d'ensemble
  const totalPatientsCount = patientsList.length;
  const activeFollowupsCount = patientsList.filter((p) => p.totalVisits > 0).length;
  const alertVigilanceCount = patientsList.filter((p) => p.allergies || p.antecedents).length;
  const totalArchivedVisitsCount = visitsList.length;

  return (
    <div className="space-y-5">
      {/* Toast d'action */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-xl text-xs font-bold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* 1. EN-TÊTE UNIFIÉ DE L'HISTORIQUE & DOSSIERS PATIENTS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Historique & Dossiers Médicaux
            </h1>
            {isStandard ? (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                Plan Standard (Fenêtre 30 jours)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                Plan Pro (Historique permanent à vie)
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Dossiers longitudinaux des patients, antécédents, historique complet des consultations, bilans et ordonnances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <AddPatientModal />

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Exporter l'ensemble des données patients au format Excel / CSV"
          >
            {isExporting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
                <span>Exportation...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px] text-slate-500">download</span>
                <span>Export Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. BANDEAU DE ROTATION (SI FORMULE STANDARD) */}
      {isStandard && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50/80 via-slate-50 to-amber-50/80 border border-amber-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <span className="material-symbols-outlined text-[20px]">schedule</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  Fenêtre glissante de 30 jours (Plan Standard)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                  Prochain cycle dans {daysUntilReset} jour{daysUntilReset > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Votre formule actuelle conserve l'accès direct aux 30 derniers jours de consultations. 
                {archivedCount > 0 ? (
                  <strong className="text-slate-900"> {archivedCount} consultation{archivedCount > 1 ? "s" : ""} antérieure{archivedCount > 1 ? "s" : ""} {archivedCount > 1 ? "sont archivées" : "est archivée"}. </strong>
                ) : " "}
                Vous pouvez exporter vos données ou basculer sur le Plan Pro pour débloquer l'historique permanent à vie sans limite.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-400">workspace_premium</span>
              <span>Passer au Plan Pro</span>
            </Link>
          </div>
        </div>
      )}

      {/* 3. SWITCHER DE PERSPECTIVE PRINCIPAL : PAR PATIENT / PAR CONSULTATION */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <div className="grid grid-cols-2 gap-1.5 flex-1 max-w-lg">
          <button
            type="button"
            onClick={() => setActiveTab("patients")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "patients"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">folder_shared</span>
            <span>Dossiers par Patient</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "patients" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {totalPatientsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("visits")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "visits"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">history</span>
            <span>Journal des Consultations</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "visits" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {totalArchivedVisitsCount}
            </span>
          </button>
        </div>

        {/* Sélecteur de vue (Tableau / Cartes) */}
        <div className="flex items-center gap-1 p-0.5 bg-white/70 rounded-xl border border-slate-200/80 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === "table" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">table_rows</span>
            <span>Tableau</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === "cards" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">grid_view</span>
            <span>Cartes</span>
          </button>
        </div>
      </div>

      {/* 4. BARRE DE RECHERCHE ET FILTRES RAPIDES */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "patients"
                ? "Rechercher patient, téléphone, CIN, mutuelle, groupe sanguin, allergies, antécédents..."
                : "Rechercher consultation, motif, diagnostic posé, médicament prescrit, bilan joint..."
            }
            className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>

        {/* Ligne des filtres contextuels selon l'onglet actif */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {activeTab === "patients" ? (
            /* Filtres spécifiques à la vue Par Patient */
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                {[
                  { id: "all", label: "Tous les patients" },
                  { id: "allergies", label: "Avec allergies" },
                  { id: "antecedents", label: "Avec antécédents" },
                  { id: "with_visits", label: "Avec consultations" },
                  { id: "without_visits", label: "Nouveaux inscrits" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPatientFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      patientFilter === f.id
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Filtres spécifiques au Journal des Consultations */
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                {[
                  { id: "all", label: "Toutes dates" },
                  { id: "today", label: "Aujourd'hui" },
                  { id: "week", label: "7 jours" },
                  { id: "month", label: "Ce mois" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFilterPeriod(p.id as any)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      filterPeriod === p.id
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                {[
                  { id: "all", label: "Tous règlements" },
                  { id: "paid", label: "Payés" },
                  { id: "pending", label: "En attente" },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setFilterPayment(pm.id as any)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      filterPayment === pm.id
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setFilterDocument(filterDocument === "all" ? "with_docs" : "all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border ${
                  filterDocument === "with_docs"
                    ? "bg-violet-700 border-violet-700 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">attach_file</span>
                <span>Avec bilans joints</span>
              </button>
            </div>
          )}

          <div className="text-[11px] text-slate-400 font-medium">
            {activeTab === "patients"
              ? `${filteredPatients.length} patient${filteredPatients.length > 1 ? "s" : ""} trouvé${filteredPatients.length > 1 ? "s" : ""}`
              : `${filteredVisits.length} consultation${filteredVisits.length > 1 ? "s" : ""} répertoriée${filteredVisits.length > 1 ? "s" : ""}`}
          </div>
        </div>
      </div>

      {/* 5. CONTENU PRINCIPAL SELON L'ONGLET SÉLECTIONNÉ */}
      {activeTab === "patients" ? (
        /* VUE 1 : DOSSIERS PAR PATIENT */
        filteredPatients.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">person_off</span>
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Aucun dossier patient correspondant</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Aucun patient ne correspond à vos filtres actuels. Modifiez votre recherche ou enregistrez une nouvelle admission.
            </p>
          </div>
        ) : viewMode === "table" ? (
          /* TABLEAU STRUCTURÉ DES DOSSIERS PATIENTS */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Contact & Pièce</th>
                    <th className="py-3 px-4">Couverture & Groupe</th>
                    <th className="py-3 px-4">Vigilance Médicale</th>
                    <th className="py-3 px-4">Historique & Suivi</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((patient) => {
                    const initials = `${patient.firstName[0] || ""}${patient.lastName[0] || ""}`.toUpperCase();
                    const lastVisitDateFormatted = patient.lastVisitDate
                      ? new Date(patient.lastVisitDate).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : null;

                    return (
                      <tr
                        key={patient.id}
                        onClick={() => setSelectedPatientDossier(patient)}
                        className="hover:bg-slate-50/80 transition cursor-pointer group"
                      >
                        {/* Patient */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-xs truncate group-hover:text-sky-700 transition">
                                {patient.lastName} {patient.firstName}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {patient.age} ans {patient.gender === "F" ? "• Femme" : "• Homme"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact & CIN */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono text-slate-800 text-xs">{patient.phone}</div>
                          {patient.cin ? (
                            <span className="font-mono text-[10px] text-slate-400">CIN : {patient.cin}</span>
                          ) : (
                            <span className="text-[10px] text-slate-300 italic">Sans CIN</span>
                          )}
                        </td>

                        {/* Mutuelle & Groupe sanguin */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {patient.mutuelle ? (
                              <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold">
                                {patient.mutuelle}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Sans mutuelle</span>
                            )}
                            {patient.bloodGroup && (
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                                {patient.bloodGroup}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Vigilance Médicale */}
                        <td className="py-3.5 px-4 max-w-xs">
                          {patient.allergies || patient.antecedents ? (
                            <div className="space-y-0.5">
                              {patient.allergies && (
                                <div className="text-[11px] font-semibold text-rose-700 truncate" title={patient.allergies}>
                                  Allergie : {patient.allergies}
                                </div>
                              )}
                              {patient.antecedents && (
                                <div className="text-[11px] text-amber-800 truncate" title={patient.antecedents}>
                                  ATCD : {patient.antecedents}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Aucune alerte signalée</span>
                          )}
                        </td>

                        {/* Suivi & Nombre de Consultations */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 text-xs">
                            {patient.totalVisits} consultation{patient.totalVisits > 1 ? "s" : ""}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {lastVisitDateFormatted ? `Dernière le ${lastVisitDateFormatted}` : "Aucune visite passée"}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedPatientDossier(patient)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition shadow-2xs cursor-pointer"
                              title="Consulter le dossier médical complet de cette personne"
                            >
                              <span className="material-symbols-outlined text-[14px]">clinical_notes</span>
                              <span>Dossier</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingPatient(patient)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                              title="Modifier les coordonnées du patient"
                            >
                              <span className="material-symbols-outlined text-[15px]">edit</span>
                            </button>

                            <button
                              type="button"
                              disabled={deletingPatientId === patient.id}
                              onClick={() => handleDeletePatient(patient.id, `${patient.lastName} ${patient.firstName}`)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition cursor-pointer disabled:opacity-50"
                              title="Supprimer définitivement la fiche patient"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                {deletingPatientId === patient.id ? "progress_activity" : "delete"}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* VUE CARTES DES DOSSIERS PATIENTS */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredPatients.map((patient) => {
              const initials = `${patient.firstName[0] || ""}${patient.lastName[0] || ""}`.toUpperCase();
              const lastVisitDateFormatted = patient.lastVisitDate
                ? new Date(patient.lastVisitDate).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null;

              return (
                <div
                  key={patient.id}
                  onClick={() => setSelectedPatientDossier(patient)}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate group-hover:text-sky-700 transition">
                            {patient.lastName} {patient.firstName}
                          </h4>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {patient.age} ans • Tél. {patient.phone}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {patient.bloodGroup && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 text-[10px] font-bold border border-rose-200">
                            {patient.bloodGroup}
                          </span>
                        )}
                        {patient.mutuelle && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 text-[10px] font-bold border border-sky-200">
                            {patient.mutuelle}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Vigilance et antécédents */}
                    {(patient.allergies || patient.antecedents) && (
                      <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-xs space-y-1">
                        {patient.allergies && (
                          <div className="font-semibold text-rose-900 text-[11px] truncate">
                            Allergie : {patient.allergies}
                          </div>
                        )}
                        {patient.antecedents && (
                          <div className="text-amber-900 text-[11px] truncate">
                            Antécédent : {patient.antecedents}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Carte */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 text-[11px] block">
                        {patient.totalVisits} consultation{patient.totalVisits > 1 ? "s" : ""}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {lastVisitDateFormatted ? `Dernière : ${lastVisitDateFormatted}` : "Aucune visite"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedPatientDossier(patient)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition shadow-2xs"
                      >
                        Consulter dossier
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* VUE 2 : JOURNAL CHRONOLOGIQUE DES CONSULTATIONS */
        filteredVisits.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">folder_off</span>
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Aucune consultation correspondante</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Aucune consultation ne correspond à vos filtres actuels. Modifiez votre recherche ou réinitialisez les filtres.
            </p>
          </div>
        ) : viewMode === "table" ? (
          /* REGISTRE DES CONSULTATIONS EN TABLEAU */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date & Heure</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Motif & Diagnostic</th>
                    <th className="py-3 px-4">Prescription & Bilans</th>
                    <th className="py-3 px-4">Honoraires & Règlement</th>
                    <th className="py-3 px-4 text-right">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVisits.map((item) => {
                    const initials = `${item.patient.firstName[0] || ""}${item.patient.lastName[0] || ""}`.toUpperCase();
                    const visitDate = new Date(item.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                    const visitTime = new Date(item.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const medsCount = item.medicines?.length || 0;
                    const docsCount = item.documents?.length || 0;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedVisitDossier(item)}
                        className="hover:bg-slate-50/80 transition cursor-pointer group"
                      >
                        {/* Date & Heure */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{visitDate}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{visitTime}</div>
                        </td>

                        {/* Patient */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-xs truncate group-hover:text-sky-700 transition">
                                {item.patient.lastName} {item.patient.firstName}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                <span>{item.patient.age} ans</span>
                                {item.patient.mutuelle && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-sky-800">{item.patient.mutuelle}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Motif & Diagnostic */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-slate-800 truncate" title={item.diagnosis || item.disease || "Consultation"}>
                            {item.diagnosis || item.disease || "Consultation générale"}
                          </div>
                          {item.disease && item.diagnosis && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              Motif : {item.disease}
                            </div>
                          )}
                        </td>

                        {/* Prescription & Bilans */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {medsCount > 0 ? (
                              <span
                                onClick={(e) =>
                                  handleDownloadPrescription(
                                    e,
                                    item.patient,
                                    item.medicines,
                                    item.createdAt
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-200 transition cursor-pointer"
                                title="Télécharger l'ordonnance PDF"
                              >
                                <span className="material-symbols-outlined text-[13px]">prescriptions</span>
                                <span>{medsCount} méd.</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-300 italic">Sans ordonnance</span>
                            )}

                            {docsCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-800 text-[10px] font-bold border border-violet-200">
                                <span className="material-symbols-outlined text-[13px]">attach_file</span>
                                <span>{docsCount}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Honoraires & Règlement */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.paymentStatus === "paid" ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                            <span className="font-bold text-slate-900 tabular-nums">
                              {item.amountToPay ? `${item.amountToPay} DH` : "0 DH"}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                item.paymentStatus === "paid"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-amber-50 text-amber-800"
                              }`}
                            >
                              {item.paymentStatus === "paid" ? "Payé" : "En attente"}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVisitDossier(item);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition cursor-pointer"
                          >
                            <span>Consulter</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* REGISTRE DES CONSULTATIONS EN CARTES */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredVisits.map((item) => {
              const initials = `${item.patient.firstName[0] || ""}${item.patient.lastName[0] || ""}`.toUpperCase();
              const visitDate = new Date(item.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const medsCount = item.medicines?.length || 0;
              const docsCount = item.documents?.length || 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedVisitDossier(item)}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-sky-700 transition">
                            {item.patient.lastName} {item.patient.firstName}
                          </h4>
                          <div className="text-[11px] text-slate-400">
                            {item.patient.age} ans • {item.patient.phone}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-400 font-medium shrink-0 bg-slate-50 px-2 py-0.5 rounded-md">
                        {visitDate}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {item.diagnosis || item.disease || "Consultation générale"}
                      </div>
                      {item.disease && item.diagnosis && (
                        <div className="text-[11px] text-slate-500 truncate">
                          Motif : {item.disease}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      {medsCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 text-[10px] font-bold border border-indigo-200">
                          {medsCount} méd.
                        </span>
                      )}
                      {docsCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-800 text-[10px] font-bold border border-violet-200">
                          {docsCount} doc.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          item.paymentStatus === "paid"
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {item.amountToPay ? `${item.amountToPay} DH` : "0 DH"}
                      </span>
                      <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-slate-900 transition">
                        chevron_right
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* 6. GRAND TIROIR SLIDE-OVER : DOSSIER MÉDICAL COMPLET D'UN PATIENT (LONGITUDINAL) */}
      {selectedPatientDossier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Header du Dossier */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  {selectedPatientDossier.firstName[0]}
                  {selectedPatientDossier.lastName[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base truncate">
                      {selectedPatientDossier.lastName} {selectedPatientDossier.firstName}
                    </h3>
                    {selectedPatientDossier.mutuelle && (
                      <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold">
                        {selectedPatientDossier.mutuelle}
                      </span>
                    )}
                    {selectedPatientDossier.bloodGroup && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                        {selectedPatientDossier.bloodGroup}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{selectedPatientDossier.age} ans</span>
                    <span>•</span>
                    <span className="font-mono">{selectedPatientDossier.phone}</span>
                    {selectedPatientDossier.cin && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-medium">CIN : {selectedPatientDossier.cin}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPatientDossier(null)}
                className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
                title="Fermer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Actions rapides sur le patient */}
            <div className="px-4 sm:px-5 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 text-xs shrink-0">
              <div className="text-slate-500">
                Inscrit le{" "}
                <strong className="text-slate-800">
                  {new Date(selectedPatientDossier.createdAt).toLocaleDateString("fr-FR")}
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPatient(selectedPatientDossier)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                  <span>Modifier coordonnées</span>
                </button>
              </div>
            </div>

            {/* Corps Scrollable du Dossier */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* Alerte Vigilance Médicale */}
              {(selectedPatientDossier.allergies || selectedPatientDossier.antecedents) ? (
                <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-950 uppercase tracking-wider text-[10px]">
                    <span className="material-symbols-outlined text-[15px] text-rose-600">warning</span>
                    <span>Vigilance médicale du patient</span>
                  </div>
                  <div className="space-y-1 pt-0.5">
                    {selectedPatientDossier.allergies && (
                      <div className="text-rose-900 font-bold">
                        Allergies : {selectedPatientDossier.allergies}
                      </div>
                    )}
                    {selectedPatientDossier.antecedents && (
                      <div className="text-amber-900 font-semibold">
                        Antécédents majeurs : {selectedPatientDossier.antecedents}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                  <span>Aucune allergie ni antécédent médical particulier signalé.</span>
                </div>
              )}

              {/* Historique chronologique complet des consultations de ce patient */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[17px] text-slate-500">history_edu</span>
                    <span>Historique de toutes les consultations ({selectedPatientDossier.visits.length})</span>
                  </h4>
                </div>

                {selectedPatientDossier.visits.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                    <span className="material-symbols-outlined text-[28px] text-slate-300 block mb-1">
                      clinical_notes
                    </span>
                    <p className="font-semibold text-slate-700 text-xs">Aucune consultation enregistrée pour ce patient.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Les consultations passées s'afficheront ici au fur et à mesure.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedPatientDossier.visits.map((visit, vIdx) => {
                      const vDate = new Date(visit.date);
                      const dateStr = vDate.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      });
                      const timeStr = vDate.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      const vitals = [
                        visit.bloodPressure ? { label: "Tension", val: `${visit.bloodPressure} mmHg` } : null,
                        visit.heartRate ? { label: "Pouls", val: `${visit.heartRate} bpm` } : null,
                        visit.temperature ? { label: "Temp.", val: `${visit.temperature} °C` } : null,
                        visit.weight ? { label: "Poids", val: `${visit.weight} kg` } : null,
                        visit.height ? { label: "Taille", val: `${visit.height} cm` } : null,
                        computeBmi(visit.weight, visit.height)
                          ? { label: "IMC", val: computeBmi(visit.weight, visit.height)! }
                          : null,
                      ].filter(Boolean) as { label: string; val: string }[];

                      const meds = visit.medicines || [];
                      const docs = visit.documents || [];

                      return (
                        <div
                          key={visit.id}
                          className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs divide-y divide-slate-100"
                        >
                          {/* En-tête de visite */}
                          <div className="p-3.5 bg-slate-50/90 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                                {selectedPatientDossier.visits.length - vIdx}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 capitalize text-xs block">
                                  {dateStr}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {timeStr} • Visite #{visit.id}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs tabular-nums">
                                {visit.amountToPay ? `${visit.amountToPay} DH` : "0 DH"}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  visit.paymentStatus === "paid"
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "bg-amber-50 text-amber-800"
                                }`}
                              >
                                {visit.paymentStatus === "paid" ? "Payé" : "En attente"}
                              </span>
                            </div>
                          </div>

                          {/* Constantes vitales */}
                          {vitals.length > 0 && (
                            <div className="p-3 bg-white grid grid-cols-3 sm:grid-cols-6 gap-2">
                              {vitals.map((vt) => (
                                <div key={vt.label} className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                                  <span className="text-[10px] text-slate-400 block font-medium">{vt.label}</span>
                                  <span className="text-xs font-bold text-slate-900 tabular-nums">{vt.val}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Diagnostic & Observations */}
                          <div className="p-3.5 space-y-2">
                            {visit.disease && (
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Motif
                                </span>
                                <p className="text-slate-900 font-medium text-xs mt-0.5">{visit.disease}</p>
                              </div>
                            )}

                            {visit.diagnosis && (
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Diagnostic clinique
                                </span>
                                <p className="text-slate-900 font-semibold text-xs mt-0.5 whitespace-pre-line">
                                  {visit.diagnosis}
                                </p>
                              </div>
                            )}

                            {visit.notes && (
                              <div className="pt-1.5 border-t border-slate-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Observations & Consignes
                                </span>
                                <p className="text-slate-700 text-xs mt-0.5 whitespace-pre-line leading-relaxed">
                                  {visit.notes}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Traitement prescrit */}
                          {meds.length > 0 && (
                            <div className="p-3.5 bg-slate-50/50 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[15px] text-indigo-600">
                                    prescriptions
                                  </span>
                                  <span>Ordonnance ({meds.length} médicament{meds.length > 1 ? "s" : ""})</span>
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleDownloadPrescription(
                                      e,
                                      selectedPatientDossier,
                                      meds,
                                      visit.date
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold border border-indigo-200 transition cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[13px]">download</span>
                                  <span>Télécharger PDF</span>
                                </button>
                              </div>

                              <ul className="divide-y divide-slate-100">
                                {meds.map((m, mIdx) => (
                                  <li key={mIdx} className="py-1.5 flex items-start gap-2">
                                    <span className="w-4 h-4 rounded bg-indigo-100 text-indigo-900 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                      {mIdx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <strong className="text-slate-900 text-xs">{m.name}</strong>
                                      {m.instructions && (
                                        <p className="text-slate-600 text-[11px] italic mt-0.5">{m.instructions}</p>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Bilans & Pièces numérisées */}
                          {docs.length > 0 && (
                            <div className="p-3.5 space-y-2">
                              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[15px] text-violet-600">
                                  attach_file
                                </span>
                                <span>Bilans & Documents joints ({docs.length})</span>
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {docs.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 flex flex-col justify-between"
                                  >
                                    <div>
                                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                                        <span className="px-1.5 py-0.2 rounded bg-violet-100 text-violet-800 font-bold">
                                          {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                                        </span>
                                        <span>{new Date(doc.createdAt).toLocaleDateString("fr-FR")}</span>
                                      </div>
                                      <h6 className="font-bold text-slate-900 text-xs truncate mt-1">
                                        {doc.title}
                                      </h6>
                                      {doc.notes && (
                                        <p className="text-slate-600 text-[11px] italic line-clamp-2 mt-0.5">
                                          "{doc.notes}"
                                        </p>
                                      )}
                                    </div>

                                    {doc.fileUrl && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveViewerDoc({
                                            doc,
                                            patientName: `${selectedPatientDossier.lastName} ${selectedPatientDossier.firstName}`,
                                            date: dateStr,
                                          })
                                        }
                                        className="mt-1 py-1 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-[13px] text-violet-700">
                                          visibility
                                        </span>
                                        <span>Visualiser le fichier</span>
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Footer de visite : Lien consultation */}
                          {role === "doctor" && (
                            <div className="p-2.5 bg-slate-50/60 flex items-center justify-end">
                              <Link
                                href={`/dashboard/consultation/${visit.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900"
                              >
                                <span>Ouvrir dans l'espace consultation</span>
                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Slide-over */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPatientDossier(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. SLIDE-OVER : INSPECTION D'UNE CONSULTATION SPÉCIFIQUE */}
      {selectedVisitDossier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Header du Dossier */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  {selectedVisitDossier.patient.firstName[0]}
                  {selectedVisitDossier.patient.lastName[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base truncate">
                      {selectedVisitDossier.patient.lastName} {selectedVisitDossier.patient.firstName}
                    </h3>
                    {selectedVisitDossier.patient.mutuelle && (
                      <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold">
                        {selectedVisitDossier.patient.mutuelle}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{selectedVisitDossier.patient.age} ans</span>
                    <span>•</span>
                    <span className="font-mono">{selectedVisitDossier.patient.phone}</span>
                    {selectedVisitDossier.patient.cin && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-medium">CIN : {selectedVisitDossier.patient.cin}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVisitDossier(null)}
                className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
                title="Fermer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Passerelle directe vers le dossier complet du patient */}
            <div className="px-4 sm:px-5 py-2.5 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between gap-2 text-xs shrink-0">
              <span className="text-sky-900 font-medium">
                Vous examinez la consultation #{selectedVisitDossier.id}
              </span>

              <button
                type="button"
                onClick={() => {
                  const targetPatient = patientsList.find((p) => p.id === selectedVisitDossier.patientId);
                  if (targetPatient) {
                    setSelectedVisitDossier(null);
                    setSelectedPatientDossier(targetPatient);
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-sky-900 hover:bg-sky-800 text-white font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">folder_shared</span>
                <span>Voir tout le dossier de ce patient</span>
              </button>
            </div>

            {/* Corps du Dossier Déroulant */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  Consultation du{" "}
                  <strong className="text-slate-900">
                    {new Date(selectedVisitDossier.createdAt).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>{" "}
                  à{" "}
                  <span className="font-mono text-slate-900">
                    {new Date(selectedVisitDossier.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                  Dossier #{selectedVisitDossier.id}
                </span>
              </div>

              {/* Alerte Vigilance */}
              {(selectedVisitDossier.patient.allergies || selectedVisitDossier.patient.antecedents) && (
                <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-950 uppercase tracking-wider text-[10px]">
                    <span className="material-symbols-outlined text-[15px] text-rose-600">warning</span>
                    <span>Vigilance médicale du patient</span>
                  </div>
                  <div className="space-y-0.5 pt-0.5">
                    {selectedVisitDossier.patient.allergies && (
                      <div className="text-rose-900 font-bold">
                        Allergies : {selectedVisitDossier.patient.allergies}
                      </div>
                    )}
                    {selectedVisitDossier.patient.antecedents && (
                      <div className="text-amber-900 font-semibold">
                        Antécédents majeurs : {selectedVisitDossier.patient.antecedents}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Constantes Vitales */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">vital_signs</span>
                  <span>Constantes vitales</span>
                </span>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                  {[
                    { label: "Tension", val: selectedVisitDossier.bloodPressure ? `${selectedVisitDossier.bloodPressure} mmHg` : "—" },
                    { label: "Pouls", val: selectedVisitDossier.heartRate ? `${selectedVisitDossier.heartRate} bpm` : "—" },
                    { label: "Temp.", val: selectedVisitDossier.temperature ? `${selectedVisitDossier.temperature} °C` : "—" },
                    { label: "Poids", val: selectedVisitDossier.weight ? `${selectedVisitDossier.weight} kg` : "—" },
                    { label: "Taille", val: selectedVisitDossier.height ? `${selectedVisitDossier.height} cm` : "—" },
                    { label: "IMC", val: computeBmi(selectedVisitDossier.weight, selectedVisitDossier.height) || "—" },
                  ].map((c) => (
                    <div key={c.label} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400 block font-medium">{c.label}</span>
                      <span className="text-xs font-bold text-slate-900 tabular-nums">{c.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnostic & Observations */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">clinical_notes</span>
                  <span>Diagnostic & Observations cliniques</span>
                </span>

                {selectedVisitDossier.disease && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Motif d'admission</span>
                    <p className="text-slate-900 font-medium mt-0.5">{selectedVisitDossier.disease}</p>
                  </div>
                )}

                {selectedVisitDossier.diagnosis && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Diagnostic posé</span>
                    <p className="text-slate-900 font-semibold mt-0.5 whitespace-pre-line">{selectedVisitDossier.diagnosis}</p>
                  </div>
                )}

                {selectedVisitDossier.notes && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Notes confidentielles du médecin</span>
                    <p className="text-slate-700 mt-0.5 whitespace-pre-line leading-relaxed">{selectedVisitDossier.notes}</p>
                  </div>
                )}
              </div>

              {/* Prescription Médicamenteuse */}
              {selectedVisitDossier.medicines && selectedVisitDossier.medicines.length > 0 && (
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-indigo-600">prescriptions</span>
                      <span>Traitement prescrit ({selectedVisitDossier.medicines.length} médicament{selectedVisitDossier.medicines.length > 1 ? "s" : ""})</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) =>
                        handleDownloadPrescription(
                          e,
                          selectedVisitDossier.patient,
                          selectedVisitDossier.medicines,
                          selectedVisitDossier.createdAt
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs transition cursor-pointer border border-indigo-200"
                    >
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      <span>Télécharger PDF officiel</span>
                    </button>
                  </div>

                  <ul className="divide-y divide-slate-100 pt-1">
                    {selectedVisitDossier.medicines.map((m, mIdx) => (
                      <li key={mIdx} className="py-2 flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {mIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <strong className="text-slate-900 text-xs">{m.name}</strong>
                          {m.instructions && (
                            <p className="text-slate-600 text-[11px] mt-0.5 italic">{m.instructions}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bilans & Documents joints */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-[16px] text-violet-600">attach_file</span>
                  <span>Bilans & Documents joints ({selectedVisitDossier.documents?.length || 0})</span>
                </span>

                {selectedVisitDossier.documents && selectedVisitDossier.documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {selectedVisitDossier.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-violet-100 text-violet-800 font-bold">
                              {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                            </span>
                            <span>{new Date(doc.createdAt).toLocaleDateString("fr-FR")}</span>
                          </div>
                          <h5 className="font-bold text-slate-900 text-xs truncate" title={doc.title}>
                            {doc.title}
                          </h5>
                          {doc.notes && (
                            <p className="text-slate-600 text-[11px] mt-1 italic line-clamp-2 leading-relaxed">
                              "{doc.notes}"
                            </p>
                          )}
                        </div>

                        {doc.fileUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveViewerDoc({
                                doc,
                                patientName: `${selectedVisitDossier.patient.lastName} ${selectedVisitDossier.patient.firstName}`,
                                date: new Date(selectedVisitDossier.createdAt).toLocaleDateString("fr-FR"),
                              })
                            }
                            className="mt-2 py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px] text-violet-700">visibility</span>
                            <span>Visualiser le fichier</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-xs">
                    Aucun bilan ou document joint pour cette consultation.
                  </p>
                )}
              </div>

              {/* Statut Financier & Règlement */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                    Mode de règlement
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {PAYMENT_METHOD_LABELS[selectedVisitDossier.paymentMethod || "cash"] || selectedVisitDossier.paymentMethod}
                  </span>
                  {selectedVisitDossier.paidAt && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Encaissé le {new Date(selectedVisitDossier.paidAt).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                    Honoraires
                  </span>
                  <span className="text-base font-bold text-slate-900 tabular-nums">
                    {selectedVisitDossier.amountToPay ? `${selectedVisitDossier.amountToPay} DH` : "0 DH"}
                  </span>
                  <span
                    className={`text-[10px] font-bold block ${
                      selectedVisitDossier.paymentStatus === "paid" ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {selectedVisitDossier.paymentStatus === "paid" ? "Payé" : "En attente"}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Slide-over */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedVisitDossier(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Fermer
              </button>

              {role === "doctor" && (
                <Link
                  href={`/dashboard/consultation/${selectedVisitDossier.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs"
                >
                  <span className="material-symbols-outlined text-[15px]">edit_note</span>
                  <span>Ouvrir dans l'espace consultation</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL D'ÉDITION DE COORDONNÉES D'UN PATIENT */}
      {editingPatient && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Modifier le dossier patient
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingPatient.lastName} {editingPatient.firstName} • Dossier #{editingPatient.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingPatient(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdatePatientSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nom de famille *</label>
                  <input
                    name="lastName"
                    required
                    defaultValue={editingPatient.lastName}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prénom *</label>
                  <input
                    name="firstName"
                    required
                    defaultValue={editingPatient.firstName}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Téléphone *</label>
                  <input
                    name="phone"
                    required
                    defaultValue={editingPatient.phone}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Âge</label>
                  <input
                    name="age"
                    type="number"
                    defaultValue={editingPatient.age}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">CIN</label>
                  <input
                    name="cin"
                    defaultValue={editingPatient.cin || ""}
                    placeholder="BE123456"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Groupe sanguin</label>
                  <select
                    name="bloodGroup"
                    defaultValue={editingPatient.bloodGroup || ""}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-slate-900"
                  >
                    <option value="">Non renseigné</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mutuelle</label>
                  <select
                    value={editMutuelleChoice}
                    onChange={(e) => setEditMutuelleChoice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-slate-900"
                  >
                    <option value="">Sans mutuelle / Particulier</option>
                    <option value="CNSS">CNSS (AMO)</option>
                    <option value="CNOPS">CNOPS</option>
                    <option value="FAR">FAR</option>
                    <option value="Saham">Saham Assurance</option>
                    <option value="RMA">RMA Watanya</option>
                    <option value="AXA">AXA Assurance</option>
                    <option value="Wafa Assurance">Wafa Assurance</option>
                    <option value="AtlantaSanad">AtlantaSanad</option>
                    <option value="MGPAP">MGPAP</option>
                    <option value="Autre">Autre mutuelle...</option>
                  </select>
                </div>
              </div>

              {editMutuelleChoice === "Autre" && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nom de la mutuelle</label>
                  <input
                    type="text"
                    value={editCustomMutuelle}
                    onChange={(e) => setEditCustomMutuelle(e.target.value)}
                    placeholder="Préciser la mutuelle ou assurance"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-slate-900"
                  />
                  <input
                    type="hidden"
                    name="mutuelle"
                    value={editCustomMutuelle}
                  />
                </div>
              )}
              {editMutuelleChoice !== "Autre" && (
                <input
                  type="hidden"
                  name="mutuelle"
                  value={editMutuelleChoice}
                />
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Allergies connues (vigilance rouge)
                </label>
                <input
                  name="allergies"
                  defaultValue={editingPatient.allergies || ""}
                  placeholder="Ex : Pénicilline, Aspirine, Produits de contraste..."
                  className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/30 text-rose-900 placeholder-rose-300 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Antécédents majeurs & Terrain
                </label>
                <textarea
                  name="antecedents"
                  rows={2}
                  defaultValue={editingPatient.antecedents || ""}
                  placeholder="Ex : Diabète de type 2, HTA, Asthme sévère, Cardiopathie..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Adresse de résidence</label>
                <input
                  name="address"
                  defaultValue={editingPatient.address || ""}
                  placeholder="Ville, quartier..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-2xs cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL VISUALISEUR HAUTE DÉFINITION DE BILAN / DOCUMENT */}
      {activeViewerDoc && (
        <div className="fixed inset-0 z-70 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-800 text-[10px] font-bold">
                    {DOCUMENT_TYPE_LABELS[activeViewerDoc.doc.type] || activeViewerDoc.doc.type}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {activeViewerDoc.doc.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Patient : <strong>{activeViewerDoc.patientName}</strong> — Consultation du {activeViewerDoc.date}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeViewerDoc.doc.fileUrl && (
                  <a
                    href={activeViewerDoc.doc.fileUrl}
                    download={activeViewerDoc.doc.fileName || "document_medical"}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                    title="Télécharger le fichier"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setActiveViewerDoc(null)}
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
                  title="Fermer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-100 min-h-[300px]">
              {activeViewerDoc.doc.notes && (
                <div className="w-full mb-4 p-3 rounded-xl bg-white border border-slate-200 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Observation & Motif clinique
                  </span>
                  <p className="text-slate-800 leading-relaxed italic">
                    "{activeViewerDoc.doc.notes}"
                  </p>
                </div>
              )}

              {activeViewerDoc.doc.fileUrl ? (
                activeViewerDoc.doc.fileType?.startsWith("image/") ||
                activeViewerDoc.doc.fileUrl.startsWith("data:image/") ||
                /\.(jpg|jpeg|png|webp)$/i.test(activeViewerDoc.doc.fileName || "") ? (
                  <div className="max-w-full max-h-[60vh] overflow-auto flex items-center justify-center rounded-xl border border-slate-300 bg-black/5 p-2">
                    <img
                      src={activeViewerDoc.doc.fileUrl}
                      alt={activeViewerDoc.doc.title}
                      className="max-h-[58vh] max-w-full object-contain rounded-lg shadow-sm"
                    />
                  </div>
                ) : (
                  <iframe
                    src={activeViewerDoc.doc.fileUrl}
                    title={activeViewerDoc.doc.title}
                    className="w-full h-[60vh] rounded-xl border border-slate-300 bg-white shadow-sm"
                  />
                )
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Aucun fichier numérique joint à cette observation.
                </div>
              )}
            </div>

            <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>{activeViewerDoc.doc.fileName || "Fichier médical archivé"}</span>
              <button
                type="button"
                onClick={() => setActiveViewerDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Fermer l'aperçu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
