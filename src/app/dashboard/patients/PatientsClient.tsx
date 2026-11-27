"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createVisitForExistingPatient, updatePatient, deletePatient } from "@/actions/patients";
import AddPatientModal from "@/components/AddPatientModal";
import Link from "next/link";

interface PatientWithHistory {
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
  visits: {
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
    customData?: { id: string; label: string; value: string; unit?: string }[];
    medicines?: { name: string; instructions: string }[];
  }[];
}

export default function PatientsClient({ initialPatients }: { initialPatients: PatientWithHistory[] }) {
  const [patientsList, setPatientsList] = useState(initialPatients);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientWithHistory | null>(null);
  const [editingPatient, setEditingPatient] = useState<PatientWithHistory | null>(null);
  const [editMutuelleChoice, setEditMutuelleChoice] = useState("");
  const [editCustomMutuelle, setEditCustomMutuelle] = useState("");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  // Synchronisation automatique lorsque de nouveaux patients arrivent en direct
  useEffect(() => {
    setPatientsList(initialPatients);
    setSelectedPatient((prev) => {
      if (!prev) return null;
      return initialPatients.find((p) => p.id === prev.id) || prev;
    });
  }, [initialPatients]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDeletePatient(patientId: number, name: string) {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer définitivement le dossier de ${name} ?\nToutes les consultations associées seront également effacées.`
      )
    ) {
      return;
    }

    setDeletingId(patientId);
    try {
      const res = await deletePatient(patientId);
      if (res && res.success) {
        showToast(`Dossier de ${name} supprimé avec succès.`);
        setPatientsList((prev) => prev.filter((p) => p.id !== patientId));
        if (selectedPatient?.id === patientId) setSelectedPatient(null);
        if (editingPatient?.id === patientId) setEditingPatient(null);
      } else {
        showToast(res?.error || "Erreur lors de la suppression.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return patientsList;
    const q = search.toLowerCase();
    return patientsList.filter(p =>
      p.lastName.toLowerCase().includes(q) ||
      p.firstName.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.cin && p.cin.toLowerCase().includes(q)) ||
      (p.mutuelle && p.mutuelle.toLowerCase().includes(q))
    );
  }, [patientsList, search]);

  async function handleAdmit(patientId: number) {
    setLoadingId(patientId);
    const res = await createVisitForExistingPatient(patientId);
    setLoadingId(null);
    if (res.success) {
      showToast("Patient admis en salle d'attente avec succès !");
    } else {
      showToast("Erreur lors de l'admission.");
    }
  }

  async function handleUpdateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingPatient) return;
    const formData = new FormData(e.currentTarget);
    const res = await updatePatient(editingPatient.id, formData);
    if (res.success) {
      showToast("Dossier patient mis à jour !");
      setEditingPatient(null);
      // Mettre à jour l'état local
      setPatientsList(prev => prev.map(p => {
        if (p.id === editingPatient.id) {
          return {
            ...p,
            firstName: formData.get("firstName") as string,
            lastName: formData.get("lastName") as string,
            phone: formData.get("phone") as string,
            age: parseInt(formData.get("age") as string) || p.age,
            mutuelle: formData.get("mutuelle") as string || null,
            cin: formData.get("cin") as string || null,
            bloodGroup: formData.get("bloodGroup") as string || null,
            allergies: formData.get("allergies") as string || null,
            antecedents: formData.get("antecedents") as string || null,
            address: formData.get("address") as string || null,
          };
        }
        return p;
      }));
    } else {
      showToast("Erreur lors de la mise à jour.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 border border-slate-700"
          >
            <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone, CIN, mutuelle..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-3">
          <AddPatientModal />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sky-600 text-xl">folder_shared</span>
            <h2 className="text-sm font-bold text-slate-800">
              Répertoire Général des Dossiers ({filtered.length})
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total inscrits : {patientsList.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">person_search</span>
            <p className="text-xs font-semibold">Aucun patient trouvé correspondant aux critères.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((patient) => {
              const initials = `${patient.firstName[0] || ""}${patient.lastName[0] || ""}`.toUpperCase();

              return (
                <div
                  key={patient.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group"
                >
                  {/* Left: Info */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center font-semibold text-xs sm:text-sm shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm truncate">
                          {patient.lastName} {patient.firstName}
                        </h3>
                        {patient.cin && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                            {patient.cin}
                          </span>
                        )}
                        {patient.bloodGroup && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200/60">
                            {patient.bloodGroup}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                        <span>{patient.age} ans</span>
                        <span>•</span>
                        <span className="tabular-nums whitespace-nowrap">{patient.phone}</span>
                        {patient.mutuelle && (
                          <>
                            <span>•</span>
                            <span className="text-slate-700 font-medium">{patient.mutuelle}</span>
                          </>
                        )}
                        {patient.allergies && (
                          <>
                            <span>•</span>
                            <span className="text-red-700 text-[11px] font-medium inline-flex items-center gap-0.5" title={patient.allergies}>
                              <span className="material-symbols-outlined text-[13px]">warning</span>
                              Allergies
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions (pleine largeur et faciles à cliquer sur mobile) */}
                  <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(patient)}
                      className="flex-1 sm:flex-none justify-center px-3 py-2 sm:py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer"
                      title="Consulter le dossier médical complet"
                    >
                      <span className="material-symbols-outlined text-[16px]">clinical_notes</span>
                      <span>Dossier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingPatient(patient)}
                      className="p-2 sm:p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer shrink-0"
                      title="Modifier les coordonnées"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>

                    <button
                      type="button"
                      disabled={loadingId === patient.id}
                      onClick={() => handleAdmit(patient.id)}
                      className="flex-1 sm:flex-none justify-center px-3.5 py-2 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      title="Placer immédiatement en file d'attente pour aujourd'hui"
                    >
                      <span className="material-symbols-outlined text-[16px]">queue</span>
                      <span>{loadingId === patient.id ? "Admission..." : "Admettre"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === patient.id}
                      onClick={() => handleDeletePatient(patient.id, `${patient.lastName} ${patient.firstName}`)}
                      className="p-2 sm:p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition cursor-pointer shrink-0 disabled:opacity-50"
                      title="Supprimer définitivement la fiche patient"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {deletingId === patient.id ? "progress_activity" : "delete"}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL : DOSSIER MÉDICAL COMPLET DU PATIENT */}
      <AnimatePresence>
        {selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPatient(null)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90dvh] overflow-hidden flex flex-col border border-slate-200"
            >
              {/* Header Dossier sobre */}
              <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-semibold text-sm shrink-0">
                    {selectedPatient.firstName[0]}
                    {selectedPatient.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900 truncate">
                      {selectedPatient.lastName} {selectedPatient.firstName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {selectedPatient.age} ans • Tél. {selectedPatient.phone}
                      {selectedPatient.cin ? ` • CIN ${selectedPatient.cin}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={deletingId === selectedPatient.id}
                    onClick={() =>
                      handleDeletePatient(
                        selectedPatient.id,
                        `${selectedPatient.lastName} ${selectedPatient.firstName}`
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    title="Supprimer définitivement la fiche de ce patient"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {deletingId === selectedPatient.id ? "progress_activity" : "delete"}
                    </span>
                    <span className="hidden sm:inline">Supprimer fiche</span>
                  </button>

                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              {/* Contenu Scrollable */}
              <div className="p-5 overflow-y-auto space-y-5">
                {/* Fiche Synthèse compacte */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="px-3.5 py-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50">
                    <span className="text-[11px] text-slate-500 block">Groupe sanguin & mutuelle</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {selectedPatient.bloodGroup || "—"} • {selectedPatient.mutuelle || "Sans mutuelle"}
                    </p>
                  </div>
                  <div
                    className={`px-3.5 py-2.5 rounded-lg border-l-[3px] border ${
                      selectedPatient.allergies
                        ? "border-red-200 border-l-red-600 bg-red-50/40"
                        : "border-slate-200/80 border-l-slate-300 bg-slate-50/50"
                    }`}
                  >
                    <span className={`text-[11px] font-medium block ${selectedPatient.allergies ? "text-red-700" : "text-slate-500"}`}>
                      Allergies
                    </span>
                    <p className={`mt-0.5 ${selectedPatient.allergies ? "font-semibold text-red-950" : "text-slate-500"}`}>
                      {selectedPatient.allergies || "Aucune signalée"}
                    </p>
                  </div>
                  <div
                    className={`px-3.5 py-2.5 rounded-lg border-l-[3px] border ${
                      selectedPatient.antecedents
                        ? "border-amber-200 border-l-amber-500 bg-amber-50/40"
                        : "border-slate-200/80 border-l-slate-300 bg-slate-50/50"
                    }`}
                  >
                    <span className={`text-[11px] font-medium block ${selectedPatient.antecedents ? "text-amber-800" : "text-slate-500"}`}>
                      Antécédents
                    </span>
                    <p className={`mt-0.5 ${selectedPatient.antecedents ? "font-semibold text-amber-950" : "text-slate-500"}`}>
                      {selectedPatient.antecedents || "Aucun enregistré"}
                    </p>
                  </div>
                </div>

                {/* Historique des Consultations structuré */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Consultations ({selectedPatient.visits.length})
                  </h3>

                  {selectedPatient.visits.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center rounded-lg border border-dashed border-slate-200">
                      Aucune consultation passée pour ce patient.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedPatient.visits.map((v) => {
                        const d = new Date(v.date);
                        const dateFormatted = d.toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        });
                        const timeFormatted = d.toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const bmiVal =
                          v.weight && v.height && parseFloat(v.height) > 0
                            ? (
                                parseFloat(v.weight) /
                                Math.pow(parseFloat(v.height) / 100, 2)
                              ).toFixed(1)
                            : null;
                        const vitalsList = [
                          v.bloodPressure ? { label: "Tension", val: v.bloodPressure } : null,
                          v.heartRate ? { label: "Pouls", val: `${v.heartRate} bpm` } : null,
                          v.temperature ? { label: "Temp.", val: `${v.temperature} °C` } : null,
                          v.weight ? { label: "Poids", val: `${v.weight} kg` } : null,
                          v.height ? { label: "Taille", val: `${v.height} cm` } : null,
                          bmiVal ? { label: "IMC", val: bmiVal } : null,
                        ].filter(Boolean) as { label: string; val: string }[];
                        const meds = v.medicines || [];

                        return (
                          <div
                            key={v.id}
                            className="rounded-xl border border-slate-200/90 bg-white overflow-hidden divide-y divide-slate-100"
                          >
                            <div className="px-4 py-2.5 bg-slate-50/90 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-slate-900 capitalize">
                                {dateFormatted} · {timeFormatted}
                              </span>
                              <span className="text-slate-600 tabular-nums font-medium">
                                {v.amountToPay ? `${v.amountToPay} DH` : "0 DH"} •{" "}
                                <span className={v.paymentStatus === "paid" ? "text-emerald-700" : "text-amber-700"}>
                                  {v.paymentStatus === "paid" ? "Payé" : "En attente"}
                                </span>
                              </span>
                            </div>

                            {vitalsList.length > 0 && (
                              <div className="px-4 py-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
                                {vitalsList.map((vt) => (
                                  <div key={vt.label}>
                                    <span className="block text-[10px] text-slate-400">{vt.label}</span>
                                    <span className="text-xs font-semibold text-slate-900 tabular-nums">
                                      {vt.val}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {(v.disease || v.diagnosis || v.notes) && (
                              <div className="px-4 py-3 space-y-2 text-xs">
                                {v.disease && (
                                  <p>
                                    <span className="text-slate-400 mr-1.5">Motif :</span>
                                    <span className="font-medium text-slate-900">{v.disease}</span>
                                  </p>
                                )}
                                {v.diagnosis && (
                                  <p className="whitespace-pre-line text-slate-700">
                                    <span className="text-slate-400 mr-1.5">Diagnostic :</span>
                                    {v.diagnosis}
                                  </p>
                                )}
                                {v.notes && (
                                  <p className="whitespace-pre-line text-slate-600">
                                    <span className="text-slate-400 mr-1.5">Notes :</span>
                                    {v.notes}
                                  </p>
                                )}
                              </div>
                            )}

                            {v.customData && v.customData.length > 0 && (
                              <div className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                {v.customData.map((cf, cIdx) => (
                                  <div key={`${cf.id}-${cIdx}`}>
                                    <span className="text-slate-400">{cf.label} : </span>
                                    <span className="font-medium text-slate-900">
                                      {cf.value}
                                      {cf.unit ? ` ${cf.unit}` : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {meds.length > 0 && (
                              <div className="px-4 py-2.5 bg-slate-50/40 space-y-1 text-xs">
                                <p className="font-semibold text-slate-700">Ordonnance ({meds.length})</p>
                                <ol className="space-y-1">
                                  {meds.map((m, idx) => (
                                    <li key={idx} className="flex items-baseline gap-1.5">
                                      <span className="text-slate-400 font-mono text-[11px]">
                                        {String(idx + 1).padStart(2, "0")}.
                                      </span>
                                      <span className="font-medium text-slate-900">{m.name}</span>
                                      {m.instructions && (
                                        <span className="text-slate-500">— {m.instructions}</span>
                                      )}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/70 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL : MODIFIER DOSSIER PATIENT */}
      <AnimatePresence>
        {editingPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPatient(null)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">
                  Mettre à jour le Dossier Patient
                </h3>
                <button onClick={() => setEditingPatient(null)} className="text-slate-400 hover:text-slate-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleUpdateSubmit} className="p-6 space-y-3.5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      name="lastName"
                      defaultValue={editingPatient.lastName}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      name="firstName"
                      defaultValue={editingPatient.firstName}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone *</label>
                    <input
                      type="tel"
                      name="phone"
                      defaultValue={editingPatient.phone}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Âge *</label>
                    <input
                      type="number"
                      name="age"
                      defaultValue={editingPatient.age}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">CIN</label>
                    <input
                      type="text"
                      name="cin"
                      defaultValue={editingPatient.cin || ""}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Groupe Sanguin</label>
                    <input
                      type="text"
                      name="bloodGroup"
                      defaultValue={editingPatient.bloodGroup || ""}
                      placeholder="Ex: O+, A+..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Organisme Mutuelle / Assurance
                  </label>
                  <select
                    value={editMutuelleChoice}
                    onChange={(e) => setEditMutuelleChoice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900 cursor-pointer"
                  >
                    <option value="">Aucune / Sans mutuelle (Particulier)</option>
                    <option value="CNSS">CNSS (AMO)</option>
                    <option value="CNOPS">CNOPS (Secteur public)</option>
                    <option value="FAR">FAR (Forces Armées Royales)</option>
                    <option value="Saham">Saham / Sanlam</option>
                    <option value="RMA">RMA Watanya</option>
                    <option value="AXA">AXA Assurance</option>
                    <option value="Wafa Assurance">Wafa Assurance</option>
                    <option value="AtlantaSanad">AtlantaSanad</option>
                    <option value="MGPAP">MGPAP / Mutuelles publiques</option>
                    <option value="Autre">Autre organisme (Préciser...)</option>
                  </select>

                  {editMutuelleChoice === "Autre" && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={editCustomMutuelle}
                        onChange={(e) => setEditCustomMutuelle(e.target.value)}
                        placeholder="Saisir le nom de la mutuelle..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-slate-900"
                        autoFocus
                      />
                    </div>
                  )}

                  <input
                    type="hidden"
                    name="mutuelle"
                    value={editMutuelleChoice === "Autre" ? editCustomMutuelle.trim() : editMutuelleChoice}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Allergies</label>
                  <input
                    type="text"
                    name="allergies"
                    defaultValue={editingPatient.allergies || ""}
                    placeholder="Pénicilline..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Antécédents</label>
                  <input
                    type="text"
                    name="antecedents"
                    defaultValue={editingPatient.antecedents || ""}
                    placeholder="HTA, Diabète..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPatient(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase rounded-xl transition shadow-xs"
                  >
                    Enregistrer
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
