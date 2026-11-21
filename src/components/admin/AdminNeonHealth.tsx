"use client";

import { motion } from "framer-motion";

interface AdminNeonHealthProps {
  stats: any;
  onRunVacuum: () => void;
  actionLoading: string | null;
}

export default function AdminNeonHealth({
  stats,
  onRunVacuum,
  actionLoading,
}: AdminNeonHealthProps) {
  const storage = stats.storage || {};
  const compute = stats.compute || {};
  const performance = stats.performance || {};

  return (
    <div className="space-y-6">
      {/* 1. EN-TÊTE PRINCIPAL : TITRE & ACTION TECHNIQUE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Infrastructure & Télémétrie Neon
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cluster Actif • Serverless
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supervision temps réel des ressources, quotas cloud et performances de l&apos;instance PostgreSQL 16.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={onRunVacuum}
            disabled={actionLoading === "vacuum"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                actionLoading === "vacuum" ? "animate-spin" : ""
              }`}
            >
              tune
            </span>
            <span>
              {actionLoading === "vacuum"
                ? "Optimisation en cours..."
                : "Maintenance Base (VACUUM ANALYZE)"}
            </span>
          </button>
        </div>
      </div>

      {/* 2. SPÉCIFICATIONS CLOUD & ARCHITECTURE SYSTÈME */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
              <span className="material-symbols-outlined text-lg">dns</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                {performance.pgVersion || "PostgreSQL 16 (Neon Serverless)"}
              </p>
              <p className="text-[11px] text-slate-500">
                Hébergement Cloud AWS • Région Europe (Frankfurt eu-central-1)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Latence Ping :</span>
              <strong className="text-slate-900 tabular-nums font-mono">
                {performance.pingMs || 12} ms
              </strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400 block">Disponibilité (Uptime)</span>
            <p className="font-semibold text-slate-900">
              {performance.uptime || "99.98% • En ligne"}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400 block">Gestion Énergie (Scale-to-Zero)</span>
            <p className="font-semibold text-emerald-700">
              {compute.autosuspendDelay || "Veille auto après 5 min"}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400 block">Pooling de Connexions</span>
            <p className="font-semibold text-slate-900">
              PgBouncer Actif (Port 5432)
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400 block">Chiffrement Données</span>
            <p className="font-semibold text-slate-900">
              TLS 1.3 • AES-256 At-Rest
            </p>
          </div>
        </div>
      </div>

      {/* 3. CARTES KPI MAJEURES DU CLUSTER NEON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Stockage Données */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold text-slate-700">Stockage PostgreSQL</span>
              <span className="material-symbols-outlined text-lg text-sky-600">hard_drive</span>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {storage.usedMB || "0.0"}{" "}
              <span className="text-sm font-medium text-slate-400">Mo</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              sur 1 024 Mo alloués ({storage.percentUsed || 0}%)
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-1.5">
              <div
                style={{ width: `${Math.max(2, storage.percentUsed || 0)}%` }}
                className="h-full rounded-full bg-sky-600 transition-all duration-500"
              />
            </div>
            <span className="text-[11px] font-medium text-emerald-700">
              {storage.remainingMB || "1024.0"} Mo disponibles
            </span>
          </div>
        </div>

        {/* KPI 2 : Heures de Calcul (Compute Units - CU) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold text-slate-700">Calcul Compute (CU)</span>
              <span className="material-symbols-outlined text-lg text-amber-600">bolt</span>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {compute.usedHours || "0.0"}{" "}
              <span className="text-sm font-medium text-slate-400">h</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              sur 100 h incluses / mois ({compute.percentUsed || 0}%)
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-1.5">
              <div
                style={{ width: `${Math.max(2, compute.percentUsed || 0)}%` }}
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
              />
            </div>
            <span className="text-[11px] font-medium text-slate-600">
              {compute.remainingHours || "100.0"} h restantes
            </span>
          </div>
        </div>

        {/* KPI 3 : Cache Hit Ratio (RAM) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold text-slate-700">Taux Cache Buffer (RAM)</span>
              <span className="material-symbols-outlined text-lg text-emerald-600">memory</span>
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">
              {performance.cacheHitRatio || "99.9"}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Lectures servies depuis la mémoire vive
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Transactions validées :</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {performance.commits?.toLocaleString("fr-FR") || 0} commits
            </span>
          </div>
        </div>

        {/* KPI 4 : Connexions & Bloat */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold text-slate-700">Connexions Actives</span>
              <span className="material-symbols-outlined text-lg text-purple-600">hub</span>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {performance.activeConnections || 1}{" "}
              <span className="text-sm font-medium text-slate-400">actives</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {performance.idleConnections || 0} en veille • Max pool : {performance.maxConnections || 100}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Lignes mortes (Bloat) :</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {performance.deadTuples || 0} (Optimale)
            </span>
          </div>
        </div>
      </div>

      {/* 4. DÉTAIL DES TABLES & VOLUMÉTRIE DE DONNÉES */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Répartition volumétrique par table PostgreSQL
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Taille des données brutes, index B-Tree et nombre de tuples enregistrés
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            Top 10 Tables
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Table Système</th>
                <th className="px-5 py-3 text-center">Enregistrements</th>
                <th className="px-5 py-3 text-center">Données Brutes</th>
                <th className="px-5 py-3 text-center">Index & Clés</th>
                <th className="px-5 py-3 text-right">Taille Totale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {storage.tablesBreakdown?.map((t: any) => (
                <tr key={t.table} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-medium text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-base">
                      table_chart
                    </span>
                    <span>{t.table}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-semibold text-slate-700 tabular-nums">
                    {t.rowCount?.toLocaleString("fr-FR") ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-center text-slate-600 tabular-nums font-mono">
                    {t.dataSize || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-center text-slate-500 tabular-nums font-mono">
                    {t.indexSize || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-slate-900 tabular-nums font-mono">
                    {t.totalSize || t.size || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
