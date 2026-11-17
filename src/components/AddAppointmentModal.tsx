"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchPatients } from "@/actions/patients";
import { createAppointment, createNewPatientAndAppointment } from "@/actions/appointments";

export default function AddAppointmentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:30");
  const [reason, setReason] = useState("Consultation générale");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timeSlots = [
    "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
    "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"
  ];

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const results = await searchPatients(q);
    setSearchResults(results);
  }

  async function handleCreateExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) {
      setErrorMsg("Veuillez sélectionner un patient.");
      return;
    }
    if (!date) {
      setErrorMsg("Veuillez choisir une date.");
      return;
    }
    setIsLoading(true);
    const res = await createAppointment(selectedPatient.id, date, time, reason);
    setIsLoading(false);
    if (res.success) {
      setIsOpen(false);
      resetState();
    } else {
      setErrorMsg(res.error || "Erreur de création.");
    }
  }

  async function handleCreateNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("time", time);
    formData.set("reason", reason);
    const res = await createNewPatientAndAppointment(formData);
    setIsLoading(false);
    if (res.success) {
      setIsOpen(false);
      resetState();
    } else {
      setErrorMsg(res.error || "Erreur de création.");
    }
  }

  function resetState() {
    setSelectedPatient(null);
    setSearchQuery("");
    setSearchResults([]);
    setDate("");
    setTime("09:30");
    setReason("Consultation générale");
    setErrorMsg(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setIsOpen(true); resetState(); }}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs hover:shadow-md hover:shadow-indigo-600/25 cursor-pointer"
      >
        <span className="material-symbols-outlined text-base">event</span>
        Nouveau Rendez-vous
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">calendar_month</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Programmer un Rendez-vous</h2>
                    <p className="text-xs text-slate-500">Fixer une réservation pour un patient au cabinet.</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Onglets */}
              <div className="p-3 bg-slate-50/40 border-b border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab("existing")}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                    tab === "existing"
                      ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Patient Déjà Enregistré
                </button>
                <button
                  type="button"
                  onClick={() => setTab("new")}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                    tab === "new"
                      ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Nouveau Patient
                </button>
              </div>

              {errorMsg && (
                <div className="mx-6 mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* TAB 1 : PATIENT EXISTANT */}
              {tab === "existing" && (
                <form onSubmit={handleCreateExisting} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sélectionner le Patient *
                    </label>
                    {selectedPatient ? (
                      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-indigo-900 text-xs">
                            {selectedPatient.lastName} {selectedPatient.firstName}
                          </p>
                          <p className="text-[11px] text-indigo-700">
                            Tél : {selectedPatient.phone} • {selectedPatient.age} ans
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(null)}
                          className="text-xs text-indigo-600 font-bold hover:underline"
                        >
                          Changer
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearch(e.target.value)}
                          placeholder="Rechercher par nom, téléphone ou CIN..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                        />
                        {searchResults.length > 0 && (
                          <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                            {searchResults.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => { setSelectedPatient(p); setSearchResults([]); }}
                                className="w-full text-left p-2.5 hover:bg-slate-50 flex items-center justify-between text-xs"
                              >
                                <span className="font-bold text-slate-800">{p.lastName} {p.firstName}</span>
                                <span className="text-slate-400 font-mono">{p.phone}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Date du RDV *</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Créneau Horaire</label>
                      <select
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                      >
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Motif du Rendez-vous</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ex: Consultation de contrôle, Bilan sanguin..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded-xl transition shadow-xs disabled:opacity-50"
                    >
                      {isLoading ? "Programmation..." : "Confirmer le RDV"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2 : NOUVEAU PATIENT */}
              {tab === "new" && (
                <form onSubmit={handleCreateNew} className="p-6 space-y-3.5 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nom *</label>
                      <input
                        type="text"
                        name="lastName"
                        required
                        placeholder="Ex: Benali"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Prénom *</label>
                      <input
                        type="text"
                        name="firstName"
                        required
                        placeholder="Ex: Fatima"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone *</label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        placeholder="06 12 34 56 78"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Âge *</label>
                      <input
                        type="number"
                        name="age"
                        required
                        placeholder="35"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Date du RDV *</label>
                      <input
                        type="date"
                        name="date"
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Créneau Horaire</label>
                      <select
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                      >
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Motif</label>
                    <input
                      type="text"
                      name="reason"
                      defaultValue="Première consultation"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded-xl transition shadow-xs disabled:opacity-50"
                    >
                      {isLoading ? "Enregistrement..." : "Créer Patient & RDV"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
