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
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Selected dossier for Slide-over inspection
  const [selectedDossier, setSelectedDossier] = useState<HistoryItem | null>(null);

  // Document modal viewer state
  const [activeViewerDoc, setActiveViewerDoc] = useState<{
    doc: ClinicalDocument;
    patientName: string;
    date: string;
  } | null>(null);

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

  const handleDownloadPrescription = (e: React.MouseEvent, visit: HistoryItem) => {
    e.stopPropagation();
    if (!visit.medicines || visit.medicines.length === 0) return;
    downloadFilledPrescriptionPdf({
      patient: visit.patient,
      medicines: visit.medicines,
      date: new Date(visit.createdAt),
      settings: clinicSettings,
    });
  };

  // Filtering
  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return items.filter((item) => {
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

  const computeBmi = (weight?: string | null, height?: string | null) => {
    if (!weight || !height) return null;
    const w = parseFloat(weight.replace(",", "."));
    const h = parseFloat(height.replace(",", ".")) / 100;
    if (w > 0 && h > 0) return (w / (h * h)).toFixed(1);
    return null;
  };

  return (
    <div className="space-y-5">
      {/* 1. HEADER DU REGISTRE MÉDICAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Archives & Registre Clinique
            </h1>
            {isStandard ? (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                Plan Standard (Fenêtre 30 jours)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                Plan Pro (Permanent à vie)
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {isStandard
              ? "Historique des consultations des 30 derniers jours, bilans rattachés et encaissements."
              : "Base de données clinique exhaustive : dossiers patients, diagnostics, bilans numérisés et comptabilité."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            title="Télécharger l'intégralité des dossiers patients au format CSV / Excel"
          >
            {isExporting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Exportation...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Export Excel (.CSV)</span>
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

      {/* TOOLBAR CLINIQUE UNIFIÉE (RECHERCHE + FILTRES SEGMENTÉS + SWITCH VUE) */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Champ de recherche universelle */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher patient, téléphone, CIN, mutuelle, diagnostic, médicament, bilan..."
              className="w-full pl-10 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition"
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

          {/* Sélecteur de vue (Tableau / Cartes) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0 self-end lg:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">table_rows</span>
              <span>Registre</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "cards" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">grid_view</span>
              <span>Fiches</span>
            </button>
          </div>
        </div>

        {/* Ligne des Filtres Pilules */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Période */}
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

            {/* Règlement */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
              {[
                { id: "all", label: "Tous" },
                { id: "paid", label: "Payés", color: "text-emerald-700" },
                { id: "pending", label: "En attente", color: "text-amber-700" },
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

            {/* Pièces jointes */}
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
              <span>Avec bilans / fichiers</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            {filtered.length} consultation{filtered.length > 1 ? "s" : ""} répertoriée{filtered.length > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* 4. CONTENU PRINCIPAL : VUE REGISTRE (TABLEAU STRUCTURÉ) OU VUE FICHES */}
      {filtered.length === 0 ? (
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
        /* VUE REGISTRE CLINIQUE EN TABLEAU STRUCTURÉ */
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
                  <th className="py-3 px-4 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
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
                      onClick={() => setSelectedDossier(item)}
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
                            <div className="font-bold text-slate-900 text-xs truncate group-hover:text-violet-700 transition">
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
                              {item.patient.cin && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-[10px] text-slate-400">{item.patient.cin}</span>
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
                              onClick={(e) => handleDownloadPrescription(e, item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-200 transition cursor-pointer"
                              title="Cliquer pour télécharger l'ordonnance PDF"
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
                            setSelectedDossier(item);
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
        /* VUE FICHES CLINIQUES STRUCTURÉES */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filtered.map((item) => {
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
                onClick={() => setSelectedDossier(item)}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-violet-700 transition">
                          {item.patient.lastName} {item.patient.firstName}
                        </h4>
                        <div className="text-[11px] text-slate-400">
                          {item.patient.age} ans · {item.patient.phone}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium shrink-0 bg-slate-50 px-2 py-0.5 rounded-md">
                      {visitDate}
                    </span>
                  </div>

                  {/* Motif & Diagnostic */}
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

                {/* Footer de carte : Badges & Montant */}
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
      )}

      {/* 5. TIROIR COCKPIT CLINIQUE SLIDE-OVER (INSPECTION DU DOSSIER COMPLET) */}
      {selectedDossier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Header du Dossier */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  {selectedDossier.patient.firstName[0]}
                  {selectedDossier.patient.lastName[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base truncate">
                      {selectedDossier.patient.lastName} {selectedDossier.patient.firstName}
                    </h3>
                    {selectedDossier.patient.mutuelle && (
                      <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold">
                        {selectedDossier.patient.mutuelle}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{selectedDossier.patient.age} ans</span>
                    <span>•</span>
                    <span className="font-mono">{selectedDossier.patient.phone}</span>
                    {selectedDossier.patient.cin && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-medium">CIN: {selectedDossier.patient.cin}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
                title="Fermer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Corps du Dossier Déroulant */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* Date & Contexte de la Consultation */}
              <div className="flex items-center justify-between text-xs text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  Consultation du{" "}
                  <strong className="text-slate-900">
                    {new Date(selectedDossier.createdAt).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>{" "}
                  à{" "}
                  <span className="font-mono text-slate-900">
                    {new Date(selectedDossier.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                  Dossier #{selectedDossier.id}
                </span>
              </div>

              {/* Alerte Vigilance si Allergies ou Antécédents */}
              {(selectedDossier.patient.allergies || selectedDossier.patient.antecedents) && (
                <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-950 uppercase tracking-wider text-[10px]">
                    <span className="material-symbols-outlined text-[15px] text-rose-600">warning</span>
                    <span>Vigilance médicale du patient</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                    {selectedDossier.patient.allergies && (
                      <span className="text-rose-900 font-bold">
                        Allergies : {selectedDossier.patient.allergies}
                      </span>
                    )}
                    {selectedDossier.patient.antecedents && (
                      <span className="text-amber-900 font-semibold">
                        Antécédents majeurs : {selectedDossier.patient.antecedents}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 1. Constantes Vitales */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">vital_signs</span>
                  <span>Constantes vitales</span>
                </span>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                  {[
                    { label: "Tension", val: selectedDossier.bloodPressure ? `${selectedDossier.bloodPressure} mmHg` : "—" },
                    { label: "Pouls", val: selectedDossier.heartRate ? `${selectedDossier.heartRate} bpm` : "—" },
                    { label: "Temp.", val: selectedDossier.temperature ? `${selectedDossier.temperature} °C` : "—" },
                    { label: "Poids", val: selectedDossier.weight ? `${selectedDossier.weight} kg` : "—" },
                    { label: "Taille", val: selectedDossier.height ? `${selectedDossier.height} cm` : "—" },
                    { label: "IMC", val: computeBmi(selectedDossier.weight, selectedDossier.height) || "—" },
                  ].map((c) => (
                    <div key={c.label} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400 block font-medium">{c.label}</span>
                      <span className="text-xs font-bold text-slate-900 tabular-nums">{c.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Diagnostic & Observations */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">clinical_notes</span>
                  <span>Diagnostic & Observations cliniques</span>
                </span>

                {selectedDossier.disease && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Motif d'admission</span>
                    <p className="text-slate-900 font-medium mt-0.5">{selectedDossier.disease}</p>
                  </div>
                )}

                {selectedDossier.diagnosis && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Diagnostic posé</span>
                    <p className="text-slate-900 font-semibold mt-0.5 whitespace-pre-line">{selectedDossier.diagnosis}</p>
                  </div>
                )}

                {selectedDossier.notes && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Notes confidentielles du médecin</span>
                    <p className="text-slate-700 mt-0.5 whitespace-pre-line leading-relaxed">{selectedDossier.notes}</p>
                  </div>
                )}
              </div>

              {/* 3. Prescription Médicamenteuse */}
              {selectedDossier.medicines && selectedDossier.medicines.length > 0 && (
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-indigo-600">prescriptions</span>
                      <span>Traitement prescrit ({selectedDossier.medicines.length} médicament{selectedDossier.medicines.length > 1 ? "s" : ""})</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleDownloadPrescription(e, selectedDossier)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs transition cursor-pointer border border-indigo-200"
                    >
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      <span>Télécharger PDF officiel</span>
                    </button>
                  </div>

                  <ul className="divide-y divide-slate-100 pt-1">
                    {selectedDossier.medicines.map((m, mIdx) => (
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

              {/* 4. Bilans & Documents numérisés */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-[16px] text-violet-600">attach_file</span>
                  <span>Bilans & Documents joints ({selectedDossier.documents?.length || 0})</span>
                </span>

                {selectedDossier.documents && selectedDossier.documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {selectedDossier.documents.map((doc) => (
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
                                patientName: `${selectedDossier.patient.lastName} ${selectedDossier.patient.firstName}`,
                                date: new Date(selectedDossier.createdAt).toLocaleDateString("fr-FR"),
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

              {/* 5. Statut Financier & Règlement */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                    Mode de règlement
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {PAYMENT_METHOD_LABELS[selectedDossier.paymentMethod || "cash"] || selectedDossier.paymentMethod}
                  </span>
                  {selectedDossier.paidAt && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Encaissé le {new Date(selectedDossier.paidAt).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                    Honoraires
                  </span>
                  <span className="text-base font-bold text-slate-900 tabular-nums">
                    {selectedDossier.amountToPay ? `${selectedDossier.amountToPay} DH` : "0 DH"}
                  </span>
                  <span
                    className={`text-[10px] font-bold block ${
                      selectedDossier.paymentStatus === "paid" ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {selectedDossier.paymentStatus === "paid" ? "Payé" : "En attente"}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Slide-over */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Fermer
              </button>

              {role === "doctor" && (
                <Link
                  href={`/dashboard/consultation/${selectedDossier.id}`}
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

      {/* 6. MODAL VISUALISEUR HAUTE DÉFINITION DE DOCUMENT / BILAN */}
      {activeViewerDoc && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
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
