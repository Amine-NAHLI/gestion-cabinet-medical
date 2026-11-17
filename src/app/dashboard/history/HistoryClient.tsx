"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MotionDiv } from "@/components/MotionWrapper";

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

export default function HistoryClient({
  items,
  role,
}: {
  items: HistoryItem[];
  role?: string;
}) {
  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState<"all" | "paid" | "pending">("all");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      // Filtre statut
      if (filterPayment === "paid" && item.paymentStatus !== "paid") return false;
      if (filterPayment === "pending" && item.paymentStatus === "paid") return false;

      // Filtre recherche
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
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone, diagnostic..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setFilterPayment("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterPayment === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tous ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterPayment("paid")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterPayment === "paid" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Payés
          </button>
          <button
            type="button"
            onClick={() => setFilterPayment("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterPayment === "pending" ? "bg-white text-amber-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            En attente
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            Dossiers trouvés ({filtered.length})
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center text-slate-500 py-16 flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">history_toggle_off</span>
            <h3 className="font-bold text-slate-800 text-sm">Aucun historique correspondant</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">Aucune consultation ne correspond à vos filtres actuels.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((visit, index) => {
              const initials = `${visit.patient.firstName[0] || ""}${visit.patient.lastName[0] || ""}`.toUpperCase();
              const visitDate = new Date(visit.createdAt).toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              return (
                <MotionDiv 
                  key={visit.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-5 hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-600 font-bold text-sm tracking-wider group-hover:bg-sky-50 group-hover:text-sky-700 group-hover:border-sky-200 transition-colors">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base group-hover:text-sky-700 transition-colors">
                          {visit.patient.lastName} {visit.patient.firstName}
                        </h3>
                        {visit.disease && (
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            {visit.disease}
                          </span>
                        )}
                        {visit.patient.cin && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 font-mono text-[10px]">
                            {visit.patient.cin}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="capitalize">{visitDate}</span>
                        <span>•</span>
                        <span>{visit.patient.age} ans</span>
                        <span>•</span>
                        <span>Tél : {visit.patient.phone}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div>
                        {visit.paymentStatus === 'paid' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-full uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Payé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold rounded-full uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            En attente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Règlement : <span className="font-bold text-slate-900">{visit.amountToPay ? `${visit.amountToPay} DH` : 'Non fixé'}</span>
                      </p>
                    </div>
                    
                    {role === 'doctor' && (
                      <Link 
                        href={`/dashboard/consultation/${visit.id}`} 
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/50 transition-all shadow-xs"
                      >
                        <span className="material-symbols-outlined text-base">folder_open</span>
                        Dossier
                      </Link>
                    )}
                  </div>
                </MotionDiv>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
