"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addPatientAndVisit, searchPatients, createVisitForExistingPatient } from "@/actions/patients";

export default function AddPatientModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"search" | "new">("search");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Recherche dynamique des patients existants
  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchPatients(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  // Admission d'un patient existant
  async function handleSelectExisting(patientId: number) {
    setIsLoading(true);
    const res = await createVisitForExistingPatient(patientId);
    setIsLoading(false);
    if (res.success) {
      setIsOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    } else {
      setFeedbackMsg(res.error || "Erreur");
    }
  }

  // Inscription d'un nouveau patient
  async function handleSubmitNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await addPatientAndVisit(formData);
    setIsLoading(false);
    if (res.success) {
      setIsOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    } else {
      setFeedbackMsg(res.error || "Erreur");
    }
  }

  return (
    <>
      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => { setIsOpen(true); setFeedbackMsg(null); }}
        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide uppercase shadow-xs hover:shadow-md hover:shadow-teal-600/20 transition-all cursor-pointer"
      >
        <span className="material-symbols-outlined text-base">person_add</span>
        Admission Patient
      </motion.button>

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
              transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
              className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                    <span className="material-symbols-outlined text-xl">person_add</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Admission en Salle d'Attente</h2>
                    <p className="text-xs text-slate-500">Rechercher un dossier existant ou enregistrer un nouveau patient.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Toggle Onglets : Patient Existant vs Nouveau */}
              <div className="p-4 bg-slate-50/40 border-b border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab("search")}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    tab === "search"
                      ? "bg-white text-teal-700 shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">search</span>
                  Patient Déjà Enregistré
                </button>
                <button
                  type="button"
                  onClick={() => setTab("new")}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    tab === "new"
                      ? "bg-white text-teal-700 shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">person_add_alt</span>
                  Nouveau Dossier
                </button>
              </div>

              {feedbackMsg && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{feedbackMsg}</span>
                </div>
              )}

              {/* ONGLET 1 : RECHERCHE PATIENT EXISTANT */}
              {tab === "search" && (
                <div className="p-6 space-y-4">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Tapez un nom, téléphone ou CIN..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all shadow-xs"
                      autoFocus
                    />
                  </div>

                  {isSearching && (
                    <div className="text-center py-4 text-xs text-slate-400 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-teal-600 text-base">sync</span>
                      Recherche dans les dossiers...
                    </div>
                  )}

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((p) => (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 hover:border-teal-300 hover:bg-teal-50/40 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-100/70 text-teal-800 flex items-center justify-center font-bold text-xs uppercase">
                            {p.firstName[0]}{p.lastName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                              <span>{p.lastName} {p.firstName}</span>
                              {p.cin && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                                  {p.cin}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>{p.age} ans</span>
                              <span>•</span>
                              <span>{p.phone}</span>
                              {p.mutuelle && (
                                <>
                                  <span>•</span>
                                  <span className="text-teal-700 font-semibold">{p.mutuelle}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleSelectExisting(p.id)}
                          className="bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          Admettre
                        </button>
                      </div>
                    ))}

                    {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        <p>Aucun patient trouvé correspondant à "{searchQuery}".</p>
                        <button
                          type="button"
                          onClick={() => setTab("new")}
                          className="mt-2 text-teal-600 font-bold hover:underline"
                        >
                          + Créer un nouveau dossier
                        </button>
                      </div>
                    )}

                    {searchQuery.length < 2 && (
                      <p className="text-center py-6 text-xs text-slate-400">
                        Saisissez au moins 2 lettres pour rechercher un patient existant.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ONGLET 2 : NOUVEAU PATIENT */}
              {tab === "new" && (
                <form onSubmit={handleSubmitNew} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nom de famille *</label>
                      <input 
                        type="text" 
                        name="lastName" 
                        required 
                        placeholder="Ex: Benali" 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Prénom *</label>
                      <input 
                        type="text" 
                        name="firstName" 
                        required 
                        placeholder="Ex: Yassine" 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone *</label>
                      <input 
                        type="tel" 
                        name="phone" 
                        required 
                        placeholder="06 12 34 56 78" 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Âge *</label>
                      <input 
                        type="number" 
                        name="age" 
                        required 
                        min="0"
                        max="125"
                        placeholder="Ex: 34"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CIN</label>
                      <input 
                        type="text" 
                        name="cin" 
                        placeholder="BE123456" 
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all uppercase" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Genre</label>
                      <select 
                        name="gender" 
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none"
                      >
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Groupe Sanguin</label>
                      <select 
                        name="bloodGroup" 
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none"
                      >
                        <option value="">Non précisé</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Organisme Mutuelle (Optionnel)</label>
                    <input 
                      type="text" 
                      name="mutuelle" 
                      placeholder="CNSS, CNOPS, Saham, RMA, AXA..." 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Allergies connues</label>
                      <input 
                        type="text" 
                        name="allergies" 
                        placeholder="Ex: Pénicilline, AINS, Pollen..." 
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Antécédents majeurs</label>
                      <input 
                        type="text" 
                        name="antecedents" 
                        placeholder="Ex: HTA, Diabète, Asthme..." 
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsOpen(false)} 
                      className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      disabled={isLoading} 
                      className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md hover:shadow-teal-600/25 transition disabled:opacity-70 cursor-pointer"
                    >
                      {isLoading ? (
                        "Enregistrement..."
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">check</span>
                          Créer Dossier & Admettre
                        </>
                      )}
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
