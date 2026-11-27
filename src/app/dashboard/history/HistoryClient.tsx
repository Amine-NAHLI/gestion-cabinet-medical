"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { exportClinicPatientsData } from "@/actions/settings";
import { downloadFilledPrescriptionPdf } from "@/lib/prescriptionTemplateUtils";

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

export interface HistoryItem {
  id: number;
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
  };
  createdAt: string;
}

interface HistoryClientProps {
  items: HistoryItem[];
  role?: string;
  isStandard?: boolean;
  archivedCount?: number;
  daysUntilReset?: number;
  supportWhatsapp?: string;
  supportWhatsappMessage?: string;
  clinicSettings?: any;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  biologie: "Bilan Biologique / Analyses",
  imagerie: "Imagerie / Radio / Scanner",
  compte_rendu: "Compte-rendu médical",
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
  items,
  role,
  isStandard = false,
  archivedCount = 0,
  daysUntilReset = 30,
  supportWhatsapp = "+212600000000",
  supportWhatsappMessage = "Bonjour, je souhaite passer à la formule Pro pour conserver l'historique permanent de mon cabinet.",
  clinicSettings,
}: HistoryClientProps) {
  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState<"all" | "paid" | "pending">("all");
  const [filterDocument, setFilterDocument] = useState<"all" | "with_docs">("all");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today" | "week" | "month">("all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Accordion state: which visits are expanded
  const [expandedVisits, setExpandedVisits] = useState<Record<number, boolean>>({});

  // Document modal viewer state
  const [activeViewerDoc, setActiveViewerDoc] = useState<{
    doc: ClinicalDocument;
    patientName: string;
    date: string;
  } | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedVisits((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    filtered.forEach((v) => {
      all[v.id] = true;
    });
    setExpandedVisits(all);
  };

  const collapseAll = () => {
    setExpandedVisits({});
  };

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
        setExportNotice("Export Excel téléchargé avec succès.");
        setTimeout(() => setExportNotice(null), 4000);
      }
    } catch (e) {
      console.error("Erreur téléchargement export:", e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPrescription = (visit: HistoryItem) => {
    if (!visit.medicines || visit.medicines.length === 0) return;
    downloadFilledPrescriptionPdf({
      patient: visit.patient,
      medicines: visit.medicines,
      date: new Date(visit.createdAt),
      settings: clinicSettings,
    });
  };

  // KPI aggregates
  const totalCollectedRevenue = useMemo(() => {
    return items
      .filter((i) => i.paymentStatus === "paid")
      .reduce((acc, curr) => acc + (parseFloat(curr.amountToPay || "0") || 0), 0);
  }, [items]);

  const totalIndexedDocuments = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.documents?.length || 0), 0);
  }, [items]);

  const totalPrescriptions = useMemo(() => {
    return items.filter((i) => (i.medicines?.length || 0) > 0).length;
  }, [items]);

  // Filtering
  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return items.filter((item) => {
      // Payment filter
      if (filterPayment === "paid" && item.paymentStatus !== "paid") return false;
      if (filterPayment === "pending" && item.paymentStatus === "paid") return false;

      // Document filter
      if (filterDocument === "with_docs" && (!item.documents || item.documents.length === 0)) return false;

      // Period filter
      const itemTime = new Date(item.createdAt).getTime();
      if (filterPeriod === "today" && itemTime < startOfToday) return false;
      if (filterPeriod === "week" && itemTime < sevenDaysAgo) return false;
      if (filterPeriod === "month" && itemTime < startOfMonth) return false;

      // Search query
      if (!search.trim()) return true;
      const q = search.toLowerCase();

      const patientName = `${item.patient.lastName} ${item.patient.firstName}`.toLowerCase();
      const patientPhone = item.patient.phone.toLowerCase();
      const cin = (item.patient.cin || "").toLowerCase();
      const mutuelle = (item.patient.mutuelle || "").toLowerCase();
      const disease = (item.disease || "").toLowerCase();
      const diagnosis = (item.diagnosis || "").toLowerCase();
      const notes = (item.notes || "").toLowerCase();
      const medicineMatch = item.medicines?.some((m) =>
        m.name.toLowerCase().includes(q) || (m.instructions && m.instructions.toLowerCase().includes(q))
      );
      const documentMatch = item.documents?.some((d) =>
        d.title.toLowerCase().includes(q) || (d.notes && d.notes.toLowerCase().includes(q))
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
  }, [items, search, filterPayment, filterDocument, filterPeriod]);

  // Helper BMI
  const computeBmi = (weight?: string | null, height?: string | null) => {
    if (!weight || !height) return null;
    const w = parseFloat(weight.replace(",", "."));
    const h = parseFloat(height.replace(",", ".")) / 100;
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header avec Titre & Statut Formule */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Archives Cliniques & Historique
            </h1>
            {isStandard ? (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                Formule Standard (30 jours)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                Formule Pro (Permanent à vie)
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {isStandard
              ? "Consultations des 30 derniers jours, bilans, ordonnances et règlements."
              : "Base de données clinique complète : dossiers médicaux, bilans rattachés, ordonnances et comptabilité."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Bouton d'exportation Excel */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            title="Télécharger l'intégralité des dossiers patients au format CSV / Excel"
          >
            {isExporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Exportation en cours...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[17px]">download</span>
                <span>Télécharger l'export Excel (.CSV)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{exportNotice}</span>
        </div>
      )}

      {/* BANDEAU HISTORIQUE STANDARD (AVEC COMPTE À REBOURS DU CYCLE MENSUEL) */}
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
                Votre formule actuelle affiche les consultations des 30 derniers jours. 
                {archivedCount > 0 ? (
                  <strong className="text-slate-900"> {archivedCount} consultation{archivedCount > 1 ? "s" : ""} antérieure{archivedCount > 1 ? "s" : ""} {archivedCount > 1 ? "sont archivées" : "est archivée"}. </strong>
                ) : " "}
                Pensez à télécharger votre sauvegarde Excel régulière pour conserver vos archives locales. Vous pouvez basculer sur le Plan Pro pour débloquer l'historique permanent à vie sans limite.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-400">workspace_premium</span>
              <span>Débloquer l'historique à vie (Plan Pro)</span>
            </a>
          </div>
        </div>
      )}

      {/* CARTES STATISTIQUES RÉCAPITULATIVES DE L'ARCHIVE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Consultations archivées</span>
            <span className="material-symbols-outlined text-[18px] text-slate-400">inventory_2</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            {items.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {isStandard ? "30 derniers jours actifs" : "Total permanent"}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Recettes perçues</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-600">payments</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 tabular-nums">
            {totalCollectedRevenue.toLocaleString("fr-FR")} DH
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Règlements encaissés
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Documents & Bilans</span>
            <span className="material-symbols-outlined text-[18px] text-violet-600">attach_file</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            {totalIndexedDocuments}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Analyses, radios, comptes-rendus
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Ordonnances délivrées</span>
            <span className="material-symbols-outlined text-[18px] text-indigo-600">prescriptions</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            {totalPrescriptions}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Avec posologies indexées
          </span>
        </div>
      </div>

      {/* BARRE DE FILTRES MULTI-CRITÈRES */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Recherche textuelle universelle */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher patient, téléphone, CIN, diagnostic, médicament, document..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition"
            />
          </div>

          {/* Boutons d'expansion globale */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              title="Tout déplier pour lecture intégrale"
            >
              <span className="material-symbols-outlined text-[16px]">unfold_more</span>
              <span>Déplier tout</span>
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              title="Tout replier"
            >
              <span className="material-symbols-outlined text-[16px]">unfold_less</span>
              <span>Replier tout</span>
            </button>
          </div>
        </div>

        {/* Ligne des filtres de sélection */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Filtres de Période */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Période :</span>
            {[
              { id: "all", label: "Toutes" },
              { id: "today", label: "Aujourd'hui" },
              { id: "week", label: "7 jours" },
              { id: "month", label: "Ce mois" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setFilterPeriod(p.id as any)}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  filterPeriod === p.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Filtres de Règlement */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Règlement :</span>
            {[
              { id: "all", label: "Tous" },
              { id: "paid", label: "Payés", color: "text-emerald-700" },
              { id: "pending", label: "En attente", color: "text-amber-700" },
            ].map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setFilterPayment(pm.id as any)}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  filterPayment === pm.id
                    ? "bg-slate-900 text-white"
                    : `${pm.color || "text-slate-600"} hover:bg-slate-100`
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>

          {/* Filtre Documents */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Pièces jointes :</span>
            <button
              type="button"
              onClick={() => setFilterDocument(filterDocument === "all" ? "with_docs" : "all")}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                filterDocument === "with_docs"
                  ? "bg-violet-700 text-white"
                  : "text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">attach_file</span>
              <span>Avec bilans / fichiers</span>
            </button>
          </div>
        </div>
      </div>

      {/* LISTE DES DOSSIERS CLINIQUES ARCHIVÉS */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>{filtered.length} consultation{filtered.length > 1 ? "s" : ""} trouvée{filtered.length > 1 ? "s" : ""}</span>
          {isStandard && archivedCount > 0 && (
            <span className="text-amber-700 font-medium">
              +{archivedCount} consultation{archivedCount > 1 ? "s" : ""} antérieure{archivedCount > 1 ? "s" : ""} dans vos archives locales
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">folder_off</span>
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Aucune consultation correspondante</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Modifiez votre recherche ou vos critères de filtres pour afficher vos archives.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isExpanded = Boolean(expandedVisits[item.id]);
            const initials = `${item.patient.firstName[0] || ""}${item.patient.lastName[0] || ""}`.toUpperCase();
            const visitDate = new Date(item.createdAt).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            const visitTime = new Date(item.createdAt).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            });

            const bmi = computeBmi(item.weight, item.height);
            const vitalsList = [
              item.bloodPressure ? { label: "Tension", val: `${item.bloodPressure} mmHg` } : null,
              item.heartRate ? { label: "Pouls", val: `${item.heartRate} bpm` } : null,
              item.temperature ? { label: "Température", val: `${item.temperature} °C` } : null,
              item.weight ? { label: "Poids", val: `${item.weight} kg` } : null,
              item.height ? { label: "Taille", val: `${item.height} cm` } : null,
              bmi ? { label: "IMC", val: bmi } : null,
            ].filter(Boolean) as { label: string; val: string }[];

            const docsCount = item.documents?.length || 0;
            const medsCount = item.medicines?.length || 0;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* EN-TÊTE DU DOSSIER CONSULTATION */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                          {item.patient.lastName} {item.patient.firstName}
                        </h3>

                        {item.disease && (
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                            {item.disease}
                          </span>
                        )}

                        {item.patient.mutuelle && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold">
                            {item.patient.mutuelle}
                          </span>
                        )}

                        {item.patient.cin && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                            CIN: {item.patient.cin}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="capitalize font-medium text-slate-700">{visitDate} à {visitTime}</span>
                        <span>•</span>
                        <span>{item.patient.age} ans</span>
                        <span>•</span>
                        <span className="tabular-nums font-mono text-slate-600">{item.patient.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges d'état & Bouton d'Expansion */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                    {/* Badge Ordonnance */}
                    {medsCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                        <span className="material-symbols-outlined text-[14px]">prescriptions</span>
                        <span>{medsCount} méd.</span>
                      </span>
                    )}

                    {/* Badge Documents */}
                    {docsCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200 text-violet-800 text-[11px] font-bold">
                        <span className="material-symbols-outlined text-[14px]">attach_file</span>
                        <span>{docsCount} document{docsCount > 1 ? "s" : ""}</span>
                      </span>
                    )}

                    {/* Badge Règlement */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold bg-slate-50">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.paymentStatus === "paid" ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      <span className={item.paymentStatus === "paid" ? "text-emerald-800" : "text-amber-800"}>
                        {item.paymentStatus === "paid" ? "Payé" : "En attente"} :
                      </span>
                      <span className="tabular-nums text-slate-900 font-bold">
                        {item.amountToPay ? `${item.amountToPay} DH` : "0 DH"}
                      </span>
                    </div>

                    {/* Bouton d'expansion */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                    >
                      <span>{isExpanded ? "Masquer" : "Consulter dossier"}</span>
                      <span className="material-symbols-outlined text-[16px]">
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* CONTENU DÉTAILLÉ DE L'ARCHIVE CLINIQUEMENT STRUCTURÉE */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs">
                    {/* Alerte Vigilance Allergies/Antécédents si renseignés */}
                    {(item.patient.allergies || item.patient.antecedents) && (
                      <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/90 text-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-rose-600 shrink-0">warning</span>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {item.patient.allergies && (
                            <span className="text-rose-900 font-bold">
                              Allergies : {item.patient.allergies}
                            </span>
                          )}
                          {item.patient.antecedents && (
                            <span className="text-amber-900 font-medium">
                              Antécédents majeurs : {item.patient.antecedents}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* BLOC 1 : CONSTANTES CLINIQUES */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-slate-500">vital_signs</span>
                            <span>Constantes vitales relevées</span>
                          </span>
                          {vitalsList.length === 0 && (
                            <span className="text-slate-400 text-[11px]">Non renseignées</span>
                          )}
                        </div>

                        {vitalsList.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2.5 pt-1">
                            {vitalsList.map((vt) => (
                              <div key={vt.label} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                <span className="text-[10px] text-slate-400 block font-medium">{vt.label}</span>
                                <span className="text-xs font-bold text-slate-900 tabular-nums">{vt.val}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 italic text-xs">
                            Aucune constante enregistrée pour cette consultation.
                          </p>
                        )}
                      </div>

                      {/* BLOC 2 : DIAGNOSTIC & OBSERVATIONS */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-slate-500">clinical_notes</span>
                            <span>Diagnostic & Observations</span>
                          </span>
                        </div>

                        {item.diagnosis ? (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                              Diagnostic posé
                            </span>
                            <p className="text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                              {item.diagnosis}
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-400 italic text-xs">Aucun diagnostic textuel précisé.</p>
                        )}

                        {item.notes && (
                          <div className="space-y-1 pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                              Notes confidentielles du médecin
                            </span>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                              {item.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* BLOC 3 : ORDONNANCE & PRESCRIPTION MÉDICAMENTEUSE */}
                    {medsCount > 0 && (
                      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-indigo-600">prescriptions</span>
                            <span className="font-bold text-slate-900">
                              Prescription médicale ({medsCount} médicament{medsCount > 1 ? "s" : ""})
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDownloadPrescription(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs transition cursor-pointer border border-indigo-200"
                            title="Télécharger l'ordonnance en format PDF conforme"
                          >
                            <span className="material-symbols-outlined text-[15px]">download</span>
                            <span>Télécharger Ordonnance PDF</span>
                          </button>
                        </div>

                        <ul className="divide-y divide-slate-100">
                          {item.medicines?.map((med, mIdx) => (
                            <li key={mIdx} className="py-2 flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {mIdx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <strong className="text-slate-900 text-xs">{med.name}</strong>
                                {med.instructions && (
                                  <p className="text-slate-600 text-[11px] mt-0.5 italic">
                                    {med.instructions}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* BLOC 4 : BILANS & DOCUMENTS ATTACHÉS (AVEC MOTIFS & VISUALISEUR) */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-violet-600">attach_file</span>
                          <span>Bilans, imagerie & pièces jointes ({docsCount})</span>
                        </span>
                      </div>

                      {docsCount > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {item.documents?.map((doc) => {
                            const isImg =
                              doc.fileType?.startsWith("image/") ||
                              doc.fileUrl?.startsWith("data:image/") ||
                              /\.(jpg|jpeg|png|webp)$/i.test(doc.fileName || "");

                            return (
                              <div
                                key={doc.id}
                                className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-2 flex flex-col justify-between"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-800 text-[10px] font-bold">
                                      {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                                    </span>
                                  </div>

                                  <h4 className="font-bold text-slate-900 text-xs truncate" title={doc.title}>
                                    {doc.title}
                                  </h4>

                                  {doc.notes && (
                                    <p className="text-[11px] text-slate-600 line-clamp-2 italic leading-relaxed">
                                      "{doc.notes}"
                                    </p>
                                  )}
                                </div>

                                {doc.fileUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveViewerDoc({
                                        doc,
                                        patientName: `${item.patient.lastName} ${item.patient.firstName}`,
                                        date: visitDate,
                                      })
                                    }
                                    className="w-full mt-2 py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[15px] text-violet-700">
                                      {isImg ? "visibility" : "open_in_new"}
                                    </span>
                                    <span>Visualiser le document</span>
                                  </button>
                                ) : (
                                  <div className="text-[10px] text-slate-400 italic pt-1">
                                    Note clinique archivée sans fichier joint
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic text-xs">
                          Aucun bilan ou document joint pour cette consultation.
                        </p>
                      )}
                    </div>

                    {/* BLOC 5 : ACTIONS DU DOSSIER */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Mode de règlement : <strong>{PAYMENT_METHOD_LABELS[item.paymentMethod || "cash"] || item.paymentMethod}</strong></span>
                        {item.paidAt && (
                          <span>• Encaissé le {new Date(item.paidAt).toLocaleDateString("fr-FR")}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {role === "doctor" && (
                          <Link
                            href={`/dashboard/consultation/${item.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[15px]">folder_open</span>
                            <span>Ouvrir dans l'espace consultation</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE VISUALISATION DE DOCUMENT / BILAN MÉDICAL */}
      {activeViewerDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
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

            {/* Modal Body / Viewer */}
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
                    {/* Visualisation Image */}
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

            {/* Modal Footer */}
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
