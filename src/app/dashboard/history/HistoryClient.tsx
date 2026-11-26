"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { exportClinicPatientsData } from "@/actions/settings";

interface HistoryItem {
  id: number;
  amountToPay: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  disease: string | null;
  diagnosis: string | null;
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    age: number;
    phone: string;
    cin?: string | null;
    mutuelle?: string | null;
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
}

export default function HistoryClient({
  items,
  role,
  isStandard = false,
  archivedCount = 0,
  daysUntilReset = 30,
  supportWhatsapp = "+212600000000",
  supportWhatsappMessage = "Bonjour, je souhaite passer à la formule Pro pour conserver l'historique permanent de mon cabinet.",
}: HistoryClientProps) {
  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState<"all" | "paid" | "pending">("all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await exportClinicPatientsData();
      if (res?.success && res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.filename || `sauvegarde_cabinet_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setExportNotice("Export Excel téléchargé avec succès !");
        setTimeout(() => setExportNotice(null), 4000);
      }
    } catch (e) {
      console.error("Erreur téléchargement export:", e);
    } finally {
      setIsExporting(false);
    }
  };

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterPayment === "paid" && item.paymentStatus !== "paid") return false;
      if (filterPayment === "pending" && item.paymentStatus === "paid") return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.patient.lastName.toLowerCase().includes(q) ||
        item.patient.firstName.toLowerCase().includes(q) ||
        item.patient.phone.includes(q) ||
        (item.patient.cin && item.patient.cin.toLowerCase().includes(q)) ||
        (item.disease && item.disease.toLowerCase().includes(q)) ||
        (item.diagnosis && item.diagnosis.toLowerCase().includes(q))
      );
    });
  }, [items, search, filterPayment]);

  return (
    <div className="space-y-6">
      {/* Header avec Titre & Bouton d'Exportation Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Historique des consultations
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
          <p className="text-slate-500 text-sm mt-0.5">
            {isStandard
              ? "Consultations des 30 derniers jours et gestion des encaissements."
              : "Archives complètes des consultations terminées et statuts d'encaissement."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Bouton d'exportation Excel (.CSV) */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
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

          <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">Actifs en ligne :</span>
            <span className="text-xs font-bold text-slate-900 tabular-nums">{items.length}</span>
          </div>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{exportNotice}</span>
        </div>
      )}

      {/* BANDEAU HISTORIQUE STANDARD 30 JOURS (AVEC COMPTE À REBOURS DU CYCLE MENSUEL) */}
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

      {/* Recherche & Filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, téléphone, diagnostic..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition"
          />
        </div>

        <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterPayment("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              filterPayment === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tous ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterPayment("paid")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              filterPayment === "paid" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Payés
          </button>
          <button
            type="button"
            onClick={() => setFilterPayment("pending")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              filterPayment === "pending" ? "bg-white text-amber-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            En attente
          </button>
        </div>
      </div>

      {/* Tableau des consultations */}
      <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] border border-slate-200/90 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Consultations répertoriées ({filtered.length})
          </h2>
          {isStandard && archivedCount > 0 && (
            <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
              +{archivedCount} consultation{archivedCount > 1 ? "s" : ""} dans vos archives locales
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center text-slate-500 py-14 px-4 flex flex-col items-center">
            <h3 className="font-medium text-slate-800 text-sm">Aucun historique correspondant</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Aucune consultation ne correspond à vos filtres actuels.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((visit) => {
              const initials = `${visit.patient.firstName[0] || ""}${visit.patient.lastName[0] || ""}`.toUpperCase();
              const visitDate = new Date(visit.createdAt).toLocaleDateString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={visit.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-600 font-semibold text-xs shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm truncate">
                          {visit.patient.lastName} {visit.patient.firstName}
                        </h3>
                        {visit.disease && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                            {visit.disease}
                          </span>
                        )}
                        {visit.patient.cin && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 font-mono text-[10px]">
                            {visit.patient.cin}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="capitalize">{visitDate}</span>
                        <span>•</span>
                        <span>{visit.patient.age} ans</span>
                        <span>•</span>
                        <span className="tabular-nums">{visit.patient.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="flex items-center sm:justify-end gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            visit.paymentStatus === "paid" ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              visit.paymentStatus === "paid" ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {visit.paymentStatus === "paid" ? "Payé" : "En attente"}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 tabular-nums">
                          {visit.amountToPay ? `${visit.amountToPay} DH` : "0 DH"}
                        </span>
                      </div>
                    </div>

                    {role === "doctor" && (
                      <Link
                        href={`/dashboard/consultation/${visit.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">folder_open</span>
                        <span>Dossier</span>
                      </Link>
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
