"use client";

import "@/app/globals.css";
import { useState } from "react";
import { registerClinic } from "@/actions/onboarding";
import MoroccanCitySelect from "@/components/MoroccanCitySelect";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<"standard" | "pro">("pro");
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "quarterly" | "yearly">("yearly");

  const [formData, setFormData] = useState({
    doctorName: "",
    doctorEmail: "",
    doctorPhone: "",
    specialty: "Médecine Générale",
    clinicName: "",
    clinicCity: "Casablanca",
    clinicAddress: "",
    assistantName: "",
    assistantEmail: "",
  });

  const PRICING = {
    standard: {
      monthly: 200,
      quarterly: 550,
      yearly: 1900,
    },
    pro: {
      monthly: 250,
      quarterly: 700,
      yearly: 2500,
    },
  };

  const currentPrice = PRICING[selectedPlan][selectedCycle];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.doctorName.trim() || !formData.doctorEmail.trim()) {
      setError("Veuillez renseigner le nom et l'email du médecin.");
      return;
    }

    if (!formData.clinicName.trim() || !formData.clinicCity.trim()) {
      setError("Veuillez renseigner le nom du cabinet et la ville.");
      return;
    }

    if (!formData.assistantName.trim() || !formData.assistantEmail.trim()) {
      setError("Les informations de l'assistante médicale (nom et email) sont obligatoires.");
      return;
    }

    if (formData.doctorEmail.trim().toLowerCase() === formData.assistantEmail.trim().toLowerCase()) {
      setError("L'email de l'assistante doit être différent de celui du médecin.");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        doctorName: formData.doctorName,
        doctorEmail: formData.doctorEmail,
        doctorPhone: formData.doctorPhone,
        specialty: formData.specialty,
        clinicName: formData.clinicName,
        clinicCity: formData.clinicCity,
        clinicAddress: formData.clinicAddress,
        assistantName: formData.assistantName,
        assistantEmail: formData.assistantEmail,
        selectedPlan,
        selectedCycle,
        selectedPrice: currentPrice,
      };

      const res: any = await registerClinic(payload);

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        setIsSubmitted(true);
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue lors de l'enregistrement de votre demande.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F9FB] text-slate-900 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation retour & Logo */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Retour à la connexion</span>
          </Link>

          <span className="font-signature text-3xl sm:text-4xl text-slate-900 select-none">
            Mon<span className="text-sky-700">Cabinet</span>
          </span>
        </div>

        {/* ÉCRAN DE CONFIRMATION SUCCÈS */}
        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-10 shadow-[0_1px_3px_rgba(16,24,40,0.06)] text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <span className="material-symbols-outlined text-3xl">mark_email_read</span>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Demande transmise avec succès
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Votre demande a bien été envoyée
              </h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Notre équipe vérifie vos coordonnées professionnelles. Vous recevrez l'activation et les accès complets à votre cabinet médical par email sous <strong>24 heures ouvrées</strong>.
              </p>
            </div>

            {/* Récapitulatif soumis */}
            <div className="text-left bg-slate-50 rounded-xl border border-slate-200/80 p-5 space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-200">
                Récapitulatif de votre demande
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Cabinet médical :</span>
                  <span className="font-semibold text-slate-900">{formData.clinicName} ({formData.clinicCity})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Médecin praticien :</span>
                  <span className="font-semibold text-slate-900">{formData.doctorName} • {formData.specialty}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email de contact :</span>
                  <span className="font-semibold text-slate-900">{formData.doctorEmail}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Téléphone :</span>
                  <span className="font-semibold text-slate-900">{formData.doctorPhone || "—"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block">Assistante médicale :</span>
                  <span className="font-semibold text-slate-900">{formData.assistantName} ({formData.assistantEmail})</span>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block">Formule & durée choisies :</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${selectedPlan === 'standard' ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                      {selectedPlan === "standard" ? "Plan STANDARD (Historique 30 jours + Export Excel)" : "⭐ Plan PRO (Historique Permanent à Vie)"}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {selectedCycle === "yearly" ? "1 An" : selectedCycle === "quarterly" ? "3 Mois" : "1 Mois"} — {currentPrice} DH
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info timing */}
            <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 text-xs text-sky-900 flex items-center gap-3 text-left">
              <span className="material-symbols-outlined text-xl text-sky-600 shrink-0">schedule</span>
              <p className="leading-relaxed">
                <strong>Délai moyen de validation :</strong> Moins de 24h. Vous recevrez un email de confirmation contenant votre lien de connexion sécurisé dès que votre espace est actif. Le règlement s'effectue après validation de votre compte.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition"
              >
                <span className="material-symbols-outlined text-base">login</span>
                <span>Retourner à la page de connexion</span>
              </Link>
            </div>
          </motion.div>
        ) : (
          /* FORMULAIRE D'INSCRIPTION */
          <div className="bg-white rounded-2xl border border-slate-200/90 p-7 sm:p-9 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
            <div className="mb-7 text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold mb-2">
                <span className="material-symbols-outlined text-[14px]">local_hospital</span>
                Solution clé en main pour praticiens & cabinets médicaux
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Inscrire mon cabinet médical
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Choisissez votre formule selon vos besoins d'archivage et renseignez les informations de votre cabinet pour recevoir vos accès sécurisés sous 24h.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

              {/* SECTION 0: CHOIX DU PLAN ET DE LA DURÉE */}
              <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sky-600 text-lg">loyalty</span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        1. Choisissez votre Formule & Période
                      </h3>
                      <p className="text-[11px] text-slate-500">Sans engagement initial. Règlement après validation de votre espace.</p>
                    </div>
                  </div>

                  {/* Boutons switch de période */}
                  <div className="inline-flex p-1 rounded-xl bg-slate-200/80 text-xs font-semibold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedCycle("monthly")}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer text-xs ${
                        selectedCycle === "monthly"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      1 Mois
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCycle("quarterly")}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer text-xs flex items-center gap-1 ${
                        selectedCycle === "quarterly"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>3 Mois</span>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">-50 DH</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCycle("yearly")}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer text-xs flex items-center gap-1 ${
                        selectedCycle === "yearly"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-700 hover:text-slate-900 font-bold"
                      }`}
                    >
                      <span>1 An</span>
                      <span className={`text-[10px] px-1 py-0.2 rounded font-bold ${selectedCycle === "yearly" ? "bg-white text-emerald-700" : "bg-emerald-100 text-emerald-800"}`}>
                        2 mois offerts ⭐
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2 Cartes de Plan (Standard vs Pro) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CARTE STANDARD */}
                  <div
                    onClick={() => setSelectedPlan("standard")}
                    className={`relative rounded-xl p-4 sm:p-5 transition cursor-pointer border-2 bg-white flex flex-col justify-between ${
                      selectedPlan === "standard"
                        ? "border-sky-600 shadow-md ring-2 ring-sky-500/10"
                        : "border-slate-200 hover:border-slate-300 opacity-90 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold uppercase tracking-wider">
                          Formule Standard
                        </span>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${selectedPlan === "standard" ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white"}`}>
                          {selectedPlan === "standard" && <span className="material-symbols-outlined text-[14px]">check</span>}
                        </div>
                      </div>

                      <div className="my-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-900">
                            {selectedCycle === "yearly" ? "1 900" : selectedCycle === "quarterly" ? "550" : "200"}
                          </span>
                          <span className="text-xs font-bold text-slate-500">DH</span>
                          <span className="text-xs text-slate-500 font-medium ml-1">
                            {selectedCycle === "yearly" ? "/ an (soit ~158 DH/mois)" : selectedCycle === "quarterly" ? "/ 3 mois (soit ~183 DH/mois)" : "/ mois"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Idéal pour les cabinets médicaux qui souhaitent archiver leurs dossiers localement.
                        </p>
                      </div>

                      <ul className="space-y-2 text-xs text-slate-600 mt-4 border-t border-slate-100 pt-3">
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-sky-600 text-[16px] shrink-0 mt-0.5">history</span>
                          <span><strong>Historique 30 jours</strong> (consultation des dossiers des 30 derniers jours)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">download_for_offline</span>
                          <span><strong>Export Excel illimité</strong> pour sauvegarder et archiver vos consultations</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-slate-500 text-[16px] shrink-0 mt-0.5">check_circle</span>
                          <span>Salle d'attente connectée & Cockpit consultation complet</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-slate-500 text-[16px] shrink-0 mt-0.5">check_circle</span>
                          <span>Ordonnances personnalisées & impression PDF</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-slate-500 text-[16px] shrink-0 mt-0.5">check_circle</span>
                          <span>Messagerie interne & Interphone cabinet</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className={`block text-center py-2 rounded-lg text-xs font-bold transition ${
                        selectedPlan === "standard"
                          ? "bg-sky-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}>
                        {selectedPlan === "standard" ? "✓ Formule Standard sélectionnée" : "Choisir la formule Standard"}
                      </span>
                    </div>
                  </div>

                  {/* CARTE PRO */}
                  <div
                    onClick={() => setSelectedPlan("pro")}
                    className={`relative rounded-xl p-4 sm:p-5 transition cursor-pointer border-2 bg-white flex flex-col justify-between ${
                      selectedPlan === "pro"
                        ? "border-emerald-600 shadow-md ring-2 ring-emerald-500/10 bg-emerald-50/10"
                        : "border-slate-200 hover:border-slate-300 opacity-90 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-amber-500">star</span>
                          Recommandé • Formule Pro
                        </span>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${selectedPlan === "pro" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}>
                          {selectedPlan === "pro" && <span className="material-symbols-outlined text-[14px]">check</span>}
                        </div>
                      </div>

                      <div className="my-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-900">
                            {selectedCycle === "yearly" ? "2 500" : selectedCycle === "quarterly" ? "700" : "250"}
                          </span>
                          <span className="text-xs font-bold text-slate-500">DH</span>
                          <span className="text-xs text-slate-500 font-medium ml-1">
                            {selectedCycle === "yearly" ? "/ an (soit ~208 DH/mois)" : selectedCycle === "quarterly" ? "/ 3 mois (soit ~233 DH/mois)" : "/ mois"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tranquillité totale : vos dossiers et antécédents médicaux sont conservés à vie.
                        </p>
                      </div>

                      <ul className="space-y-2 text-xs text-slate-700 mt-4 border-t border-slate-100 pt-3">
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">all_inclusive</span>
                          <span><strong className="text-emerald-900 font-bold">Historique permanent à vie</strong> (zéro suppression, suivi sans limite)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">download_for_offline</span>
                          <span><strong>Export Excel illimité</strong> à tout moment en 1 clic</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-slate-500 text-[16px] shrink-0 mt-0.5">check_circle</span>
                          <span>Salle d'attente connectée & Cockpit consultation complet</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-slate-500 text-[16px] shrink-0 mt-0.5">check_circle</span>
                          <span>Ordonnances personnalisées (en-tête & logo) + Recettes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-slate-500 text-[16px] shrink-0 mt-0.5">check_circle</span>
                          <span>Messagerie interne médecin-assistante en temps réel</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-amber-600 text-[16px] shrink-0 mt-0.5">support_agent</span>
                          <span><strong>Support prioritaire WhatsApp 7j/7</strong> & assistance démarrage</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className={`block text-center py-2 rounded-lg text-xs font-bold transition ${
                        selectedPlan === "pro"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}>
                        {selectedPlan === "pro" ? "✓ Formule Pro sélectionnée" : "Choisir la formule Pro"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sky-600 text-base">verified</span>
                    <span>
                      Votre choix : <strong>{selectedPlan === "pro" ? "Formule PRO" : "Formule STANDARD"}</strong> • <strong>{selectedCycle === "yearly" ? "1 An" : selectedCycle === "quarterly" ? "3 Mois" : "1 Mois"}</strong> ({currentPrice} DH)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">Paiement activé après validation de vos accès</span>
                </div>
              </div>
              
              {/* SECTION 2: CABINET */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <span className="material-symbols-outlined text-sky-600 text-base">domain</span>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    2. Coordonnées du Cabinet
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nom officiel du cabinet ou centre médical *
                    </label>
                    <input
                      type="text"
                      name="clinicName"
                      required
                      placeholder="Ex: Cabinet Médical Al Hikma"
                      value={formData.clinicName}
                      onChange={handleChange}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <MoroccanCitySelect
                      value={formData.clinicCity}
                      onChange={(city) => setFormData((prev) => ({ ...prev, clinicCity: city }))}
                      label="Ville d'exercice au Maroc"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Adresse du cabinet (optionnel)
                    </label>
                    <input
                      type="text"
                      name="clinicAddress"
                      placeholder="Ex: 45 Bd Zerktouni, 3ème étage"
                      value={formData.clinicAddress}
                      onChange={handleChange}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: MÉDECIN */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <span className="material-symbols-outlined text-teal-600 text-base">stethoscope</span>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    3. Médecin Titulaire (Praticien)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nom et Prénom du Médecin *
                    </label>
                    <input
                      type="text"
                      name="doctorName"
                      required
                      placeholder="Ex: Dr. Ahmed Benali"
                      value={formData.doctorName}
                      onChange={handleChange}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Spécialité médicale *
                    </label>
                    <input
                      type="text"
                      name="specialty"
                      required
                      placeholder="Ex: Cardiologie, Pédiatrie..."
                      value={formData.specialty}
                      onChange={handleChange}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email professionnel de connexion *
                    </label>
                    <input
                      type="email"
                      name="doctorEmail"
                      required
                      placeholder="dr.benali@gmail.com"
                      value={formData.doctorEmail}
                      onChange={handleChange}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Numéro de téléphone portable *
                    </label>
                    <input
                      type="tel"
                      name="doctorPhone"
                      required
                      placeholder="06 12 34 56 78"
                      value={formData.doctorPhone}
                      onChange={handleChange}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                    />
                  </div>

                  <div className="sm:col-span-2 p-3.5 rounded-xl bg-sky-50/70 border border-sky-100 flex items-start gap-2.5 text-xs text-sky-950">
                    <span className="material-symbols-outlined text-lg text-sky-600 shrink-0 mt-0.5">lock_clock</span>
                    <div>
                      <p className="font-semibold text-slate-800">Identifiants d'accès provisoires</p>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">
                        Votre mot de passe de premier accès vous sera transmis par l'administrateur sous 24h. Lors de votre première connexion, vous aurez le choix direct de conserver ce mot de passe ou d'en définir un nouveau selon vos préférences.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: ASSISTANTE (OBLIGATOIRE) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <span className="material-symbols-outlined text-emerald-600 text-base">support_agent</span>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    4. Assistante Médicale / Secrétariat *
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nom et Prénom de l'assistante *
                    </label>
                    <input
                      type="text"
                      name="assistantName"
                      required
                      placeholder="Ex: Fatima Zahra"
                      value={formData.assistantName}
                      onChange={handleChange}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email de connexion de l'assistante *
                    </label>
                    <input
                      type="email"
                      name="assistantEmail"
                      required
                      placeholder="secretariat@gmail.com"
                      value={formData.assistantEmail}
                      onChange={handleChange}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Bouton de validation */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Envoi de votre demande en cours...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">send</span>
                      <span>Envoyer ma demande d'inscription</span>
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-slate-400 mt-3">
                  En envoyant votre demande, vous recevrez vos accès complets par email sous 24h ouvrées.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
