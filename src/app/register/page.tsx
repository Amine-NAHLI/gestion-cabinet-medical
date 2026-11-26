"use client";

import "@/app/globals.css";
import { useState, Suspense } from "react";
import { registerClinic } from "@/actions/onboarding";
import MoroccanCitySelect from "@/components/MoroccanCitySelect";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const PRICING = {
  standard: {
    monthly: 200,
    quarterly: 550,
    yearly: 1900,
    unitMonthlyEquivalent: {
      monthly: 200,
      quarterly: 183,
      yearly: 158,
    },
  },
  pro: {
    monthly: 250,
    quarterly: 700,
    yearly: 2500,
    unitMonthlyEquivalent: {
      monthly: 250,
      quarterly: 233,
      yearly: 208,
    },
  },
};

function RegisterFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStep = searchParams.get("step") === "details" ? "form" : "pricing";
  const initialPlan = searchParams.get("plan") === "standard" ? "standard" : "pro";
  const initialCycle =
    searchParams.get("cycle") === "yearly"
      ? "yearly"
      : searchParams.get("cycle") === "quarterly"
      ? "quarterly"
      : "monthly";

  const [step, setStep] = useState<"pricing" | "form">(initialStep);
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "pro">(initialPlan);
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "quarterly" | "yearly">(initialCycle);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

  const currentPrice = PRICING[selectedPlan][selectedCycle];

  const handleSelectPlanAndContinue = (plan: "standard" | "pro") => {
    setSelectedPlan(plan);
    setStep("form");
    router.push(`/register?step=details&plan=${plan}&cycle=${selectedCycle}`, { scroll: true });
  };

  const handleBackToPricing = () => {
    setStep("pricing");
    router.push(`/register?plan=${selectedPlan}&cycle=${selectedCycle}`, { scroll: true });
  };

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
      <div className={step === "pricing" ? "max-w-5xl mx-auto" : "max-w-3xl mx-auto"}>
        
        {/* Navigation supérieure & Logo */}
        <div className="mb-8 flex items-center justify-between">
          {step === "form" && !isSubmitted ? (
            <button
              type="button"
              onClick={handleBackToPricing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Modifier mon offre</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Retour à la connexion</span>
            </Link>
          )}

          <span className="font-signature text-3xl sm:text-4xl text-slate-900 select-none">
            Mon<span className="text-sky-700">Cabinet</span>
          </span>
        </div>

        {/* ============================================================
            VUE 1 : GRILLE TARIFAIRE PURE & MARKETING VISUEL (SANS FORMULAIRE)
           ============================================================ */}
        {step === "pricing" && (
          <div className="space-y-8">
            {/* En-tête de la page de tarification */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[14px] text-sky-700">verified</span>
                Tarification transparente pour praticiens
              </span>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Choisissez la formule adaptée à votre cabinet
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Une solution médicale tout-en-un sans engagement préalable. Vos accès complets sont configurés sous 24h ouvrées.
              </p>

              {/* Sélecteur de cycle de facturation */}
              <div className="pt-2 flex justify-center">
                <div className="inline-flex p-1 rounded-xl bg-slate-200/80 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setSelectedCycle("monthly")}
                    className={`px-4 py-2 rounded-lg transition cursor-pointer text-xs ${
                      selectedCycle === "monthly"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    1 Mois (Mensuel)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCycle("quarterly")}
                    className={`px-4 py-2 rounded-lg transition cursor-pointer text-xs flex items-center gap-1.5 ${
                      selectedCycle === "quarterly"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>3 Mois</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">-50 DH</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCycle("yearly")}
                    className={`px-4 py-2 rounded-lg transition cursor-pointer text-xs flex items-center gap-1.5 ${
                      selectedCycle === "yearly"
                        ? "bg-slate-900 text-white shadow-xs font-bold"
                        : "text-slate-700 hover:text-slate-900 font-bold"
                    }`}
                  >
                    <span>1 An (Annuel)</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${selectedCycle === "yearly" ? "bg-white text-slate-900" : "bg-emerald-100 text-emerald-800"}`}>
                      2 mois offerts
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grille des 2 Cartes de Plan (Standard vs Pro) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch pt-2">
              
              {/* CARTE 1 : PLAN STANDARD (L'OFFRE BASELINE AVEC FONCTIONS BARRÉES) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 flex flex-col justify-between shadow-[0_1px_3px_rgba(16,24,40,0.06)] relative">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Formule Baseline
                      </span>
                      <h2 className="text-xl font-bold text-slate-900 mt-0.5">Plan Standard</h2>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                      Essentiel
                    </span>
                  </div>

                  {/* Prix */}
                  <div className="my-5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums">
                        {PRICING.standard[selectedCycle]}
                      </span>
                      <span className="text-sm font-bold text-slate-500">DH</span>
                      <span className="text-xs text-slate-500 font-medium ml-1">
                        {selectedCycle === "yearly"
                          ? "/ an"
                          : selectedCycle === "quarterly"
                          ? "/ 3 mois"
                          : "/ mois"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedCycle === "yearly"
                        ? "Soit l'équivalent de ~158 DH par mois."
                        : selectedCycle === "quarterly"
                        ? "Soit l'équivalent de ~183 DH par mois."
                        : "Sans engagement, renouvelable chaque mois."}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 mb-5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    Pour les praticiens souhaitant gérer leur patientèle avec un archivage local autonome de leurs consultations.
                  </p>

                  {/* Liste des fonctionnalités : Incluses vs Barrées */}
                  <ul className="space-y-3 text-xs text-slate-700">
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-slate-700 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>
                        <strong>Historique des 30 derniers jours</strong> disponible en direct
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-slate-700 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>
                        <strong>Export Excel / CSV illimité</strong> pour sauvegarder vos archives localement
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-slate-700 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>Salle d'attente connectée & gestion de file en direct</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-slate-700 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>Cockpit consultation & suivi des constantes vitales</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-slate-700 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>Ordonnances médicales & impression PDF</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-slate-700 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>Interphone & messagerie interne médecin-assistante</span>
                    </li>

                    {/* FONCTIONS NON INCLUSES DANS LE PLAN STANDARD (BARRÉES PROPREMENT) */}
                    <li className="flex items-start gap-2.5 pt-2 border-t border-slate-100 text-slate-400">
                      <span className="material-symbols-outlined text-slate-300 text-[18px] shrink-0 mt-0.5">
                        close
                      </span>
                      <div className="line-through">
                        <span>Historique patient permanent à vie</span>
                        <span className="text-[10px] block font-normal no-underline text-slate-400">
                          (Limité aux 30 derniers jours dans le plan standard)
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-400">
                      <span className="material-symbols-outlined text-slate-300 text-[18px] shrink-0 mt-0.5">
                        close
                      </span>
                      <div className="line-through">
                        <span>Support prioritaire direct WhatsApp 7j/7</span>
                        <span className="text-[10px] block font-normal no-underline text-slate-400">
                          (Support standard par email uniquement)
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-400">
                      <span className="material-symbols-outlined text-slate-300 text-[18px] shrink-0 mt-0.5">
                        close
                      </span>
                      <div className="line-through">
                        <span>Tableaux de bord d'activité & statistiques financières</span>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSelectPlanAndContinue("standard")}
                    className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-300 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Choisir la formule Standard</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* CARTE 2 : PLAN PRO (L'OFFRE COMPLÈTE & RECOMMANDÉE) */}
              <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 sm:p-8 flex flex-col justify-between shadow-xl relative">
                
                {/* Badge Recommandé Flottant */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Recommandé pour les praticiens</span>
                </div>

                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 pt-1">
                    <div>
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                        Formule Complète Sans Limite
                      </span>
                      <h2 className="text-xl font-bold text-slate-900 mt-0.5">Plan Pro</h2>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                      Zéro Contrainte
                    </span>
                  </div>

                  {/* Prix */}
                  <div className="my-5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums">
                        {PRICING.pro[selectedCycle]}
                      </span>
                      <span className="text-sm font-bold text-slate-500">DH</span>
                      <span className="text-xs text-slate-500 font-medium ml-1">
                        {selectedCycle === "yearly"
                          ? "/ an"
                          : selectedCycle === "quarterly"
                          ? "/ 3 mois"
                          : "/ mois"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      {selectedCycle === "yearly"
                        ? "Soit ~208 DH/mois. Seulement 50 DH de plus pour conserver tout à vie !"
                        : selectedCycle === "quarterly"
                        ? "Soit ~233 DH/mois avec l'archivage permanent."
                        : "Seulement 50 DH de différence pour la sérénité totale."}
                    </p>
                  </div>

                  <p className="text-xs text-slate-800 mb-5 leading-relaxed bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 font-medium">
                    Suivi médical continu et sérénité absolue : l'ensemble des dossiers, antécédents et consultations restent accessibles à vie.
                  </p>

                  {/* Liste complète des fonctionnalités */}
                  <ul className="space-y-3 text-xs text-slate-800">
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>
                        <strong className="text-slate-900 font-bold">Historique patient permanent à vie</strong> (archivage illimité, aucun risque de perte)
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>
                        <strong className="text-slate-900 font-bold">Support prioritaire direct WhatsApp 7j/7</strong> (assistance réactive immédiate)
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>
                        <strong className="text-slate-900 font-bold">Statistiques cliniques & financières</strong> (chiffre d'affaires, consultations et suivi)
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>
                        <strong>Export Excel / CSV complet</strong> à tout moment en 1 clic
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>Salle d'attente connectée & gestion de file d'attente active</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>Dossier médical complet & constantes vitales personnalisables</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>Ordonnances personnalisées (en-tête officiel, logo et templates sur mesure)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5 font-bold">
                        check
                      </span>
                      <span>Interphone instantané & messagerie interne praticien - assistante</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSelectPlanAndContinue("pro")}
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Choisir la formule Pro</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Garanties et réassurance sous les cartes */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-xl shrink-0 mt-0.5">
                  verified
                </span>
                <div>
                  <h4 className="font-bold text-slate-900">1 semaine de test offerte</h4>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">
                    Testez l'application en conditions réelles pendant 7 jours complets avant d'effectuer votre premier règlement.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200/80 flex items-start gap-3">
                <span className="material-symbols-outlined text-sky-700 text-xl shrink-0 mt-0.5">
                  support_agent
                </span>
                <div>
                  <h4 className="font-bold text-slate-900">Paiement avec l'équipe support</h4>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">
                    Aucun paiement en ligne ni carte bancaire. Le règlement se fait directement avec notre équipe support (virement, chèque ou espèces).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200/80 flex items-start gap-3">
                <span className="material-symbols-outlined text-slate-700 text-xl shrink-0 mt-0.5">
                  rocket_launch
                </span>
                <div>
                  <h4 className="font-bold text-slate-900">Mise en service sous 24h</h4>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">
                    Notre équipe prépare votre espace médical, configure votre cabinet et vous accompagne pour démarrer immédiatement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            VUE 2 : FORMULAIRE D'INSCRIPTION SUR SA PROPRE PAGE DÉDIÉE
           ============================================================ */}
        {step === "form" && (
          <div className="space-y-6">
            
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
                      <span className="text-slate-500 block">Formule d'abonnement :</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                          selectedPlan === 'standard'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {selectedPlan === "standard"
                            ? "Formule Standard (Historique 30 jours + Export Excel)"
                            : "Formule Pro (Historique Permanent à Vie)"}
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
                  <span className="material-symbols-outlined text-xl text-sky-600 shrink-0">verified</span>
                  <p className="leading-relaxed">
                    <strong>7 jours d'essai gratuit offerts :</strong> Dès validation sous 24h ouvrées, vous recevez vos accès sécurisés et profitez d'une semaine complète de test avant tout règlement avec notre équipe support.
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
              /* LE FORMULAIRE DE CRÉATION SUR SA PAGE DÉDIÉE */
              <div className="bg-white rounded-2xl border border-slate-200/90 p-7 sm:p-9 shadow-[0_1px_3px_rgba(16,24,40,0.06)] space-y-6">
                
                {/* Bandeau récapitulatif de la formule choisie */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      selectedPlan === "standard" ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {selectedPlan === "standard" ? "history" : "verified"}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {selectedPlan === "standard" ? "Formule Standard (30 jours)" : "Formule Pro (Permanent à vie)"}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          • {selectedCycle === "yearly" ? "Facturation Annuelle" : selectedCycle === "quarterly" ? "Facturation Trimestrielle" : "Facturation Mensuelle"}
                        </span>
                      </div>
                      <span className="text-xs font-black text-slate-900 tabular-nums">
                        {currentPrice} DH {selectedCycle === "yearly" ? "/ an" : selectedCycle === "quarterly" ? "/ 3 mois" : "/ mois"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBackToPricing}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 self-start sm:self-auto underline transition cursor-pointer"
                  >
                    Changer de formule
                  </button>
                </div>

                {/* En-tête du formulaire */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Étape 2 sur 2
                  </span>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                    Coordonnées de votre cabinet médical
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Ces informations permettront d'initialiser votre espace sécurisé et vos ordonnances officielles.
                  </p>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-base shrink-0">error</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                  
                  {/* SECTION 1: CABINET */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                      <span className="material-symbols-outlined text-sky-600 text-base">domain</span>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        1. Établissement Médical
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
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-slate-900 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Ville d'exercice *
                        </label>
                        <MoroccanCitySelect
                          value={formData.clinicCity}
                          onChange={(city) => setFormData((prev) => ({ ...prev, clinicCity: city }))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Adresse du cabinet (optionnel)
                        </label>
                        <input
                          type="text"
                          name="clinicAddress"
                          placeholder="Ex: 45 Bd Zerktouni, 2ème étage"
                          value={formData.clinicAddress}
                          onChange={handleChange}
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-slate-900 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: MÉDECIN */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                      <span className="material-symbols-outlined text-teal-600 text-base">stethoscope</span>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        2. Médecin Titulaire (Praticien)
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
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-slate-900 transition"
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
                          placeholder="Ex: Cardiologie, Pédiatrie, Généraliste..."
                          value={formData.specialty}
                          onChange={handleChange}
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-slate-900 transition"
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
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-slate-900 transition"
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
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-slate-900 transition"
                        />
                      </div>

                      <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-700">
                        <span className="material-symbols-outlined text-lg text-slate-600 shrink-0 mt-0.5">lock</span>
                        <div>
                          <p className="font-semibold text-slate-900">Accès sécurisés & Mot de passe</p>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">
                            Votre mot de passe provisoire vous sera communiqué par notre administrateur lors de l'activation. Vous pourrez le personnaliser librement dès votre première connexion.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: ASSISTANTE (OBLIGATOIRE) */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                      <span className="material-symbols-outlined text-slate-700 text-base">support_agent</span>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        3. Assistante Médicale / Secrétariat *
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
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-slate-900 bg-white transition"
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
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-slate-900 bg-white transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bouton de validation */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Transmission de votre demande...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">send</span>
                          <span>Confirmer et envoyer ma demande d'inscription</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-[11px] text-slate-400 mt-3">
                      En validant, vous recevrez vos accès sous 24h ouvrées avec 7 jours d'essai gratuit offert. Le premier règlement s'effectue directement avec l'équipe support à la fin de votre test.
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8F9FB]">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterFlow />
    </Suspense>
  );
}
