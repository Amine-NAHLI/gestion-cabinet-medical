"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { adminGetTableRecords, adminDeleteTableRecord } from "@/actions/admin";

interface AdminDatabaseExplorerProps {
  onRefresh: () => Promise<void>;
  showFeedback: (type: "success" | "error", message: string) => void;
}

export default function AdminDatabaseExplorer({
  onRefresh,
  showFeedback,
}: AdminDatabaseExplorerProps) {
  const [selectedTable, setSelectedTable] = useState("users");
  const [tablePage, setTablePage] = useState(1);
  const [tableData, setTableData] = useState<{
    columns: { name: string; type: string }[];
    rows: Record<string, any>[];
    total: number;
    totalPages: number;
  } | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [viewRecordModal, setViewRecordModal] = useState<Record<string, any> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async (tableName: string, page = 1) => {
    setTableLoading(true);
    try {
      const res: any = await adminGetTableRecords(tableName, page);
      if (res?.success) {
        setTableData(res);
        setTablePage(page);
      } else {
        showFeedback("error", res?.error || "Erreur lors du chargement de la table.");
      }
    } catch {
      showFeedback("error", "Erreur réseau.");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedTable, tablePage);
  }, [selectedTable, tablePage]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setActionLoading("delete-record");
    try {
      const res = await adminDeleteTableRecord(selectedTable, deleteTarget);
      if (res?.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback("success", res.message || "Enregistrement supprimé.");
        setDeleteTarget(null);
        await loadData(selectedTable, tablePage);
        await onRefresh();
      }
    } catch {
      showFeedback("error", "Erreur lors de la suppression.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Explorateur Direct Base de Données</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
              Super Admin
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit, consultation et gestion directe de chaque table en temps réel.
          </p>
        </div>

        <button
          onClick={() => loadData(selectedTable, tablePage)}
          disabled={tableLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition cursor-pointer disabled:opacity-50 self-start sm:self-center"
        >
          <span
            className={`material-symbols-outlined text-[15px] ${
              tableLoading ? "animate-spin" : ""
            }`}
          >
            refresh
          </span>
          <span>Rafraîchir</span>
        </button>
      </div>

      {/* SÉLECTEUR DE TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-slate-500 shrink-0">Table PostgreSQL :</span>
          <select
            value={selectedTable}
            onChange={(e) => {
              setSelectedTable(e.target.value);
              setTablePage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 cursor-pointer"
          >
            <option value="users">users (Utilisateurs & Praticiens)</option>
            <option value="clinics">clinics (Cabinets médicaux)</option>
            <option value="patients">patients (Dossiers patients)</option>
            <option value="visits">visits (Consultations & Visites)</option>
            <option value="appointments">appointments (Rendez-vous)</option>
            <option value="prescriptions">prescriptions (Ordonnances)</option>
            <option value="clinic_settings">clinic_settings (Paramètres cabinets)</option>
            <option value="custom_medications">custom_medications (Médicaments)</option>
            <option value="clinic_messages">clinic_messages (Chat Interne cabinet)</option>
            <option value="community_posts">community_posts (Posts Communauté)</option>
            <option value="community_messages">community_messages (Chat Confraternel)</option>
            <option value="onboarding_requests">onboarding_requests (Demandes OTP)</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>
            Total :{" "}
            <strong className="text-slate-900 tabular-nums">
              {tableData?.total ?? "..."}
            </strong>{" "}
            enregistrement{(tableData?.total || 0) > 1 ? "s" : ""}
          </span>
          <span>•</span>
          <span>
            Page{" "}
            <strong className="text-slate-900 tabular-nums">{tablePage}</strong> sur{" "}
            <strong className="text-slate-900 tabular-nums">
              {tableData?.totalPages || 1}
            </strong>
          </span>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
        {tableLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
            <span>Chargement des données...</span>
          </div>
        ) : !tableData || tableData.rows.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            Aucun enregistrement dans cette table.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  {tableData.columns.slice(0, 7).map((col) => (
                    <th key={col.name} className="px-4 py-2.5 whitespace-nowrap">
                      <span className="font-mono">{col.name}</span>
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableData.rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    {tableData.columns.slice(0, 7).map((col) => {
                      const val = row[col.name];
                      const displayVal =
                        val === null || val === undefined
                          ? "—"
                          : typeof val === "object"
                          ? JSON.stringify(val)
                          : String(val);
                      return (
                        <td
                          key={col.name}
                          className="px-4 py-2.5 font-mono text-[11px] text-slate-700 max-w-[200px] truncate"
                          title={displayVal}
                        >
                          {displayVal}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewRecordModal(row)}
                          title="Voir le JSON complet"
                          className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700 transition cursor-pointer"
                        >
                          Voir
                        </button>
                        {row.id && (
                          <button
                            onClick={() => setDeleteTarget(Number(row.id))}
                            title="Supprimer cette ligne"
                            className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-[11px] font-medium text-red-600 transition cursor-pointer"
                          >
                            Supprimer
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

        {/* PAGINATION */}
        {tableData && tableData.totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
            <button
              disabled={tablePage <= 1}
              onClick={() => setTablePage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40"
            >
              Précédent
            </button>

            <span className="text-xs text-slate-500">
              Page {tablePage} sur {tableData.totalPages}
            </span>

            <button
              disabled={tablePage >= tableData.totalPages}
              onClick={() => setTablePage((p) => Math.min(tableData.totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {/* MODALE VISUALISATION ENREGISTREMENT (JSON) */}
      <AnimatePresence>
        {viewRecordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewRecordModal(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative z-10 w-full max-w-2xl bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-100 shrink-0">
                <h3 className="font-semibold text-slate-900 text-sm font-mono">
                  Détail {selectedTable} #{viewRecordModal.id || "0"}
                </h3>
                <button
                  onClick={() => setViewRecordModal(null)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-900 rounded-xl p-4 text-xs font-mono text-emerald-400">
                <pre>{JSON.stringify(viewRecordModal, null, 2)}</pre>
              </div>

              <div className="flex justify-end pt-3 mt-3 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => setViewRecordModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE CONFIRMATION SUPPRESSION LIGNE */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative z-10 w-full max-w-sm bg-white rounded-2xl border border-red-200 p-5 sm:p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                  <span className="material-symbols-outlined text-xl">delete_forever</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Supprimer cet enregistrement ?
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Table: {selectedTable} • ID #{deleteTarget}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                Cette ligne sera définitivement supprimée de la base de données.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={actionLoading === "delete-record"}
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading === "delete-record" ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
