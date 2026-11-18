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

      {/* Main Table Container */}
      <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] border border-slate-200/90 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Consultations archivées ({filtered.length})
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center text-slate-500 py-14 px-4 flex flex-col items-center">
            <h3 className="font-medium text-slate-800 text-sm">Aucun historique correspondant</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">Aucune consultation ne correspond à vos filtres actuels.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((visit) => {
              const initials = `${visit.patient.firstName[0] || ""}${visit.patient.lastName[0] || ""}`.toUpperCase();
              const visitDate = new Date(visit.createdAt).toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
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
                    
                    {role === 'doctor' && (
                      <Link 
                        href={`/dashboard/consultation/${visit.id}`} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">folder_open</span>
                        Dossier
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
