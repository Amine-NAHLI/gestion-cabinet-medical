"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addPatientAndVisit } from "@/actions/patients";

export default function AddPatientModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    await addPatientAndVisit(formData);
    setIsLoading(false);
    setIsOpen(false);
  }

  return (
    <>
      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide uppercase shadow-xs hover:shadow-md hover:shadow-teal-600/20 transition-all cursor-pointer"
      >
        <span className="material-symbols-outlined text-base">person_add</span>
        Nouveau Patient
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
              transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
              className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                    <span className="material-symbols-outlined text-xl">person_add</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Nouvelle Inscription</h2>
                    <p className="text-xs text-slate-500">Ajout du dossier et placement immédiat en file d&apos;attente.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nom *</label>
                    <input 
                      type="text" 
                      name="lastName" 
                      required 
                      placeholder="Ex: Benali" 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Prénom *</label>
                    <input 
                      type="text" 
                      name="firstName" 
                      required 
                      placeholder="Ex: Yassine" 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Téléphone *</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    required 
                    placeholder="06 12 34 56 78" 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Âge *</label>
                    <input 
                      type="text" 
                      name="age" 
                      required 
                      placeholder="Ex: 34"
                      pattern="\d*"
                      maxLength={3}
                      onKeyDown={(e) => {
                        if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Delete') {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Couverture (Optionnel)</label>
                    <input 
                      type="text" 
                      name="mutuelle" 
                      placeholder="CNSS, CNOPS..." 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all" 
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
                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit" 
                    disabled={isLoading} 
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md hover:shadow-teal-600/25 transition disabled:opacity-70 cursor-pointer"
                  >
                    {isLoading ? (
                      "Enregistrement..."
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">check</span>
                        Inscrire & Mettre en File
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
