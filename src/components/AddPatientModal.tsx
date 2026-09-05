"use client";

import { useState } from "react";
import { MotionDiv } from "./MotionWrapper";
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
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-all"
      >
        <span className="material-symbols-outlined">person_add</span>
        Nouveau Patient
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <MotionDiv 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Nouvelle Inscription</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nom *</label>
                  <input type="text" name="lastName" required className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Prénom *</label>
                  <input type="text" name="firstName" required className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Téléphone *</label>
                <input type="tel" name="phone" required className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Âge *</label>
                  <input 
                    type="text" 
                    name="age" 
                    required 
                    pattern="\d*"
                    maxLength={3}
                    onKeyDown={(e) => {
                      if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Delete') {
                        e.preventDefault();
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mutuelle (Optionnel)</label>
                  <input type="text" name="mutuelle" placeholder="Ex: CNSS" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">
                  Annuler
                </button>
                <button type="submit" disabled={isLoading} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm transition disabled:opacity-70">
                  {isLoading ? 'Ajout...' : 'Inscrire et Ajouter à la file'}
                </button>
              </div>
            </form>
          </MotionDiv>
        </div>
      )}
    </>
  );
}
