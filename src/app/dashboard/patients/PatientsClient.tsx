"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createVisitForExistingPatient, updatePatient } from "@/actions/patients";
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
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 border border-slate-700"
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
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  {/* Left: Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm tracking-wider shadow-xs">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-sky-700 transition-colors">
                          {patient.lastName} {patient.firstName}
                        </h3>
                        {patient.cin && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                            {patient.cin}
                          </span>
                        )}
                        {patient.bloodGroup && (
                          <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-black border border-red-200/50">
                            {patient.bloodGroup}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-1 font-medium">
                        <span>{patient.age} ans</span>
                        <span>•</span>
                        <span>Tél : {patient.phone}</span>
                        {patient.mutuelle && (
                          <>
                            <span>•</span>
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-bold text-[10px]">
                              {patient.mutuelle}
                            </span>
                          </>
                        )}
                        {patient.allergies && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 text-[11px] font-semibold flex items-center gap-1" title={patient.allergies}>
                              <span className="material-symbols-outlined text-xs">warning</span>
                              Allergies
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(patient)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Consulter le dossier médical complet"
                    >
                      <span className="material-symbols-outlined text-base">clinical_notes</span>
                      <span>Dossier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingPatient(patient)}
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      title="Modifier les coordonnées"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>

                    <button
                      type="button"
                      disabled={loadingId === patient.id}
                      onClick={() => handleAdmit(patient.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      title="Placer immédiatement en file d'attente pour aujourd'hui"
                    >
                      <span className="material-symbols-outlined text-base">queue</span>
                      <span>{loadingId === patient.id ? "Admission..." : "Admettre"}</span>
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
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-100"
            >
              {/* Header Dossier */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-black text-lg">
                    {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      {selectedPatient.lastName} {selectedPatient.firstName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dossier Patient #{selectedPatient.id} • {selectedPatient.age} ans {selectedPatient.cin ? `• CIN: ${selectedPatient.cin}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Contenu Scrollable */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Antécédents & Infos Cliniques */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Groupe Sanguin & Mutuelle
                    </span>
                    <p className="text-xs font-bold text-slate-800">
                      {selectedPatient.bloodGroup || "Non renseigné"} • {selectedPatient.mutuelle || "Aucune"}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50/70 rounded-2xl border border-red-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">warning</span>
                      Allergies Connues
                    </span>
                    <p className="text-xs font-bold text-red-900">
                      {selectedPatient.allergies || "Aucune allergie signalée"}
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                      Antécédents Majeurs
                    </span>
                    <p className="text-xs font-bold text-amber-900">
                      {selectedPatient.antecedents || "Aucun antécédent majeur"}
                    </p>
                  </div>
                </div>

                {/* Historique des Consultations */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sky-600 text-lg">history</span>
                    Historique Médical des Consultations ({selectedPatient.visits.length})
                  </h3>

                  {selectedPatient.visits.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      Aucune consultation passée pour ce patient.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedPatient.visits.map((v) => {
                        const d = new Date(v.date);
                        const dateFormatted = d.toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        });
                        const timeFormatted = d.toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const hasVitals =
                          v.bloodPressure || v.heartRate || v.temperature || v.weight || v.height;
                        const bmiVal =
                          v.weight && v.height && parseFloat(v.height) > 0
                            ? (
                                parseFloat(v.weight) /
                                Math.pow(parseFloat(v.height) / 100, 2)
                              ).toFixed(1)
                            : null;
                        const meds = v.medicines || [];

                        return (
                          <div
                            key={v.id}
                            className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                              <span className="font-extrabold text-slate-900 flex items-center gap-2 capitalize">
                                <span className="material-symbols-outlined text-sm text-indigo-600">
                                  calendar_today
                                </span>
                                {dateFormatted} à {timeFormatted}
                              </span>
                              <span className="font-bold text-slate-700">
                                {v.amountToPay ? `${v.amountToPay} DH` : "Sans frais"} (
                                {v.paymentStatus === "paid" ? "Payé" : "En attente"})
                              </span>
                            </div>

                            {hasVitals && (
                              <div className="flex flex-wrap gap-1.5">
                                {v.bloodPressure && (
                                  <span className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-100 text-[11px] font-bold text-sky-900">
                                    TA : {v.bloodPressure}
                                  </span>
                                )}
                                {v.heartRate && (
                                  <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100 text-[11px] font-bold text-rose-900">
                                    Pouls : {v.heartRate} bpm
                                  </span>
                                )}
                                {v.temperature && (
                                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100 text-[11px] font-bold text-amber-900">
                                    Temp : {v.temperature} °C
                                  </span>
                                )}
                                {v.weight && (
                                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-800">
                                    Poids : {v.weight} kg
                                  </span>
                                )}
                                {v.height && (
                                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-800">
                                    Taille : {v.height} cm
                                  </span>
                                )}
                                {bmiVal && (
                                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-[11px] font-extrabold text-indigo-800">
                                    IMC : {bmiVal}
                                  </span>
                                )}
                              </div>
                            )}

                            {v.disease && (
                              <p className="text-xs text-slate-600">
                                <span className="font-bold text-slate-800">Motif / Maladie :</span>{" "}
                                {v.disease}
                              </p>
                            )}

                            {v.diagnosis && (
                              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-line">
                                <span className="font-bold text-slate-900">Diagnostic :</span>{" "}
                                {v.diagnosis}
                              </p>
                            )}

                            {v.notes && (
                              <p className="text-xs text-slate-600 bg-sky-50/40 p-2.5 rounded-xl border border-sky-100 whitespace-pre-line">
                                <span className="font-bold text-sky-900">Notes :</span> {v.notes}
                              </p>
                            )}

                            {v.customData && v.customData.length > 0 && (
                              <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {v.customData.map((cf, cIdx) => (
                                  <div key={`${cf.id}-${cIdx}`} className="text-xs">
                                    <span className="font-bold text-indigo-900">{cf.label} : </span>
                                    <span className="text-slate-700">
                                      {cf.value}
                                      {cf.unit ? ` ${cf.unit}` : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {meds.length > 0 && (
                              <div className="bg-teal-50/40 border border-teal-100 rounded-xl p-3 space-y-1.5">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">medication</span>
                                  Ordonnance ({meds.length})
                                </p>
                                {meds.map((m, idx) => (
                                  <div key={idx} className="text-xs text-slate-800">
                                    <span className="font-bold">• {m.name}</span>
                                    {m.instructions && (
                                      <span className="text-slate-600"> — {m.instructions}</span>
                                    )}
                                  </div>
                                ))}
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
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mutuelle</label>
                  <input
                    type="text"
                    name="mutuelle"
                    defaultValue={editingPatient.mutuelle || ""}
                    placeholder="CNSS, CNOPS..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
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
