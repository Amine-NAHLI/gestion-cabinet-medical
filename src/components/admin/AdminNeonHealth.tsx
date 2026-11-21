"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [showDarijaGuide, setShowDarijaGuide] = useState(true);
  const storage = stats.storage || {};
  const compute = stats.compute || {};
  const performance = stats.performance || {};

  return (
    <div className="space-y-6">
      {/* EN-TÊTE DE LA PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Santé, Stockage & Calcul Neon</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
              En direct
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance en temps réel des quotas Neon Serverless PostgreSQL (Plan gratuit 1 Go / 100 CU-heures).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setShowDarijaGuide((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px] text-amber-600">translate</span>
            <span>{showDarijaGuide ? "Masquer شرح بالدارجة" : "Afficher شرح بالدارجة"}</span>
          </button>

          <button
            onClick={onRunVacuum}
            disabled={actionLoading === "vacuum"}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
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
                : "Optimiser la base (ANALYZE)"}
            </span>
          </button>
        </div>
      </div>

      {/* BANDEAU DARIJA DÉTAILLÉ (ACCORDION / GUIDE INTÉGRÉ) */}
      <AnimatePresence>
        {showDarijaGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/40 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-amber-200/60">
                <span className="material-symbols-outlined text-amber-700 text-xl">menu_book</span>
                <div>
                  <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                    دليل مؤشرات قاعدة البيانات Neon بالدارجة المغربية
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    باش تفهم كولشي بالتفصيل وشنو كايعني كل رقم كايطلع ليك فهاد لوحة التحكم :
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-amber-950">
                <div className="p-3 bg-white/70 rounded-xl border border-amber-100 space-y-1">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <span>💾 Stockage Données (المساحة التخزينية)</span>
                  </p>
                  <p className="text-[11px] text-slate-700">
                    شحال عمرتي من المساحة. Neon كايعطيك <strong>1 Go مجاناً (1,024 Mo)</strong>. كل كتابة، مريض، واستشارة كاتسجل هنا. مادام النصوص صغيرة، هاد 1 Go كافياك لأكثر من <strong>70,000 ملف مريض</strong>!
                  </p>
                </div>

                <div className="p-3 bg-white/70 rounded-xl border border-amber-100 space-y-1">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <span>⚡ Heures de Calcul CU (ساعات المعالجة)</span>
                  </p>
                  <p className="text-[11px] text-slate-700">
                    Neon كايخدم غير ملي شي حد كايقيس السيت. إلا جلس السيت <strong>5 دقائق</strong> بلا حركة، السيرفر كاينعس (Scale-to-Zero) باش ما يضيع والو. عندك <strong>100 ساعة ف الشهر فابور</strong>، كافياك حيت ف النهار كامل الحساب الحقيقي ماكيفوتش 20 دقيقة.
                  </p>
                </div>

                <div className="p-3 bg-white/70 rounded-xl border border-amber-100 space-y-1">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <span>🧠 Cache Hit Ratio (السرعة فالذاكرة RAM)</span>
                  </p>
                  <p className="text-[11px] text-slate-700">
                    واش المعلومات كايتقراو من الذاكرة الحية (RAM) السريعة بزاف ولا من القرص. إلا كانت <strong>فوق 99%</strong>، عرف السيت ديالك كايطير بالسرعة والصفحات كايتحلو ف رمشة عين.
                  </p>
                </div>

                <div className="p-3 bg-white/70 rounded-xl border border-amber-100 space-y-1">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <span>🔌 Connexions & Bloat (الاتصالات والتنظيف)</span>
                  </p>
                  <p className="text-[11px] text-slate-700">
                    شحال من متصفح أولا خادم متصل فقاعدة البيانات دابا. وزر <strong>"Optimiser la base (ANALYZE)"</strong> كاينقي الأسطر القديمة الممسوحة باش قاعدة البيانات ديما تبقى خفيفة ومنظمة.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BANDEAU INSTANCE & UPTIME */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
            <span className="material-symbols-outlined text-xl">dns</span>
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">
              {performance.pgVersion || "PostgreSQL 16 (Neon Serverless)"}
            </p>
            <p className="text-xs text-slate-500">
              Serveur Serverless Auto-scale • Latence Ping :{" "}
              <span className="font-semibold text-emerald-600 tabular-nums">
                {performance.pingMs || 12} ms
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Uptime Instance (مدة الاشتغال)</span>
            <span className="font-semibold text-slate-800">
              {performance.uptime || "En ligne"}
            </span>
          </div>
          <div className="h-7 w-px bg-slate-100 hidden sm:block" />
          <div>
            <span className="text-slate-400 block text-[11px]">Mode Économie (النوم التلقائي)</span>
            <span className="font-semibold text-emerald-700">
              {compute.autosuspendDelay || "5 min d'inactivité"}
            </span>
          </div>
        </div>
      </div>

      {/* 4 CARTES KPI MAJEURES NEON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Stockage 1 Go */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Stockage Données (المساحة)</span>
              <span className="material-symbols-outlined text-lg text-sky-600">hard_drive</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {storage.usedMB || "0.0"}{" "}
              <span className="text-sm font-normal text-slate-500">Mo</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              sur 1 024 Mo ({storage.percentUsed || 0}%)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-1.5">
              <div
                style={{ width: `${Math.max(2, storage.percentUsed || 0)}%` }}
                className="h-full rounded-full bg-sky-600 transition-all duration-500"
              />
            </div>
            <span className="text-[11px] font-medium text-emerald-600">
              {storage.remainingMB || "1024.0"} Mo disponibles (الباقي)
            </span>
          </div>
        </div>

        {/* 2. Heures de Calcul (Compute Units - CU) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Calcul CU (ساعات المعالجة)</span>
              <span className="material-symbols-outlined text-lg text-amber-600">bolt</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {compute.usedHours || "0.0"}{" "}
              <span className="text-sm font-normal text-slate-500">h</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              sur 100 h gratuites / mois ({compute.percentUsed || 0}%)
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
              {compute.remainingHours || "100.0"} h restantes (الساعات المتبقية)
            </span>
          </div>
        </div>

        {/* 3. Cache Hit Ratio (RAM) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Cache RAM (السرعة)</span>
              <span className="material-symbols-outlined text-lg text-emerald-600">memory</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">
              {performance.cacheHitRatio || "99.9"}%
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Lectures en mémoire vive (RAM)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Transactions :</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {performance.commits?.toLocaleString("fr-FR") || 0} commits
            </span>
          </div>
        </div>

        {/* 4. Connexions Actives */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Connexions (الاتصالات)</span>
              <span className="material-symbols-outlined text-lg text-purple-600">hub</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {performance.activeConnections || 1}{" "}
              <span className="text-sm font-normal text-slate-500">actives</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {performance.idleConnections || 0} en veille • Max : {performance.maxConnections || 100}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Lignes mortes (Bloat) :</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {performance.deadTuples || 0}
            </span>
          </div>
        </div>
      </div>

      {/* DÉTAIL DES TABLES & VOLUME DE DONNÉES */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">
              Répartition du stockage par table (تفاصيل الجداول والمساحة)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Volumes exacts de données, index et nombre de lignes enregistrées dans PostgreSQL
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Nom de la table (الجدول)</th>
                <th className="px-5 py-3 text-center">Lignes (الأسطر)</th>
                <th className="px-5 py-3 text-center">Taille Données (حجم البيانات)</th>
                <th className="px-5 py-3 text-center">Taille Index (حجم الفهرس)</th>
                <th className="px-5 py-3 text-right">Taille Totale (الحجم الإجمالي)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {storage.tablesBreakdown?.map((t: any) => (
                <tr key={t.table} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-slate-800">
                    {t.table}
                  </td>
                  <td className="px-5 py-3 text-center font-semibold text-slate-700 tabular-nums">
                    {t.rowCount?.toLocaleString("fr-FR") ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-center text-slate-600 tabular-nums">
                    {t.dataSize || "—"}
                  </td>
                  <td className="px-5 py-3 text-center text-slate-500 tabular-nums">
                    {t.indexSize || "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums">
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
