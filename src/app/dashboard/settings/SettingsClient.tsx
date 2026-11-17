"use client";

import { useState } from "react";
import { updateClinicSettings } from "@/actions/settings";
import { motion, AnimatePresence } from "framer-motion";

interface SettingsClientProps {
  initialSettings: {
    clinicName: string;
    doctorName: string;
    specialty: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    orderNumber: string | null;
    taxId: string | null;
    defaultFee: string | null;
  };
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await updateClinicSettings(formData);
    setIsLoading(false);
    if (res.success) {
      showToast("Paramètres du cabinet mis à jour avec succès !");
    } else {
      showToast(res.error || "Erreur lors de la sauvegarde.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 border border-slate-700"
          >
            <span className="material-symbols-outlined text-teal-400 text-base">check_circle</span>
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1 : EN-TÊTE MÉDICAL & IDENTITÉ */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">medical_information</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">En-tête & Identité du Praticien</h2>
              <p className="text-xs text-slate-500">Ces informations figurent automatiquement sur les ordonnances et quittances imprimées.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Nom du Médecin Praticien *
              </label>
              <input
                type="text"
                name="doctorName"
                defaultValue={initialSettings.doctorName}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Spécialité Médicale *
              </label>
              <input
                type="text"
                name="specialty"
                defaultValue={initialSettings.specialty}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Nom du Cabinet ou de la Clinique *
            </label>
            <input
              type="text"
              name="clinicName"
              defaultValue={initialSettings.clinicName}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* SECTION 2 : COORDONNÉES DU CABINET */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">location_on</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Coordonnées & Localisation</h2>
              <p className="text-xs text-slate-500">Adresse géographique et contacts affichés aux patients.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Adresse du Cabinet *
              </label>
              <input
                type="text"
                name="address"
                defaultValue={initialSettings.address}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Ville *
              </label>
              <input
                type="text"
                name="city"
                defaultValue={initialSettings.city}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Téléphone Fixe / Portable *
              </label>
              <input
                type="text"
                name="phone"
                defaultValue={initialSettings.phone}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Email de Contact *
              </label>
              <input
                type="email"
                name="email"
                defaultValue={initialSettings.email}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3 : IDENTIFIANTS FISCAUX & DÉONTOLOGIQUES */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">verified</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Mentions Légales & Fiscales</h2>
              <p className="text-xs text-slate-500">Obligatoires pour le remboursement des feuilles de soins et quittances mutuelle (CNSS, CNOPS).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                N° d'Ordre des Médecins / INPE
              </label>
              <input
                type="text"
                name="orderNumber"
                defaultValue={initialSettings.orderNumber || ""}
                placeholder="Ex: INPE: 045812903 • Ordre: 14209"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Identifiants Fiscaux (ICE, IF, Patente)
              </label>
              <input
                type="text"
                name="taxId"
                defaultValue={initialSettings.taxId || ""}
                placeholder="Ex: ICE: 002938475000012 • IF: 45091823"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Honoraires par défaut (DH)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                DH
              </span>
              <input
                type="number"
                name="defaultFee"
                defaultValue={initialSettings.defaultFee || "250.00"}
                step="10"
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Bouton d'enregistrement */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-base">sync</span>
                <span>Enregistrement en cours...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">save</span>
                <span>Enregistrer les Paramètres</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
