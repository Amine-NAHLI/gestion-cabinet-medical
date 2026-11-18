"use client";

import "@/app/globals.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerClinic } from "@/actions/onboarding";
import MoroccanCitySelect from "@/components/MoroccanCitySelect";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    doctorName: "",
    doctorEmail: "",
    doctorPassword: "",
    doctorPhone: "",
    specialty: "Médecine Générale",
    clinicName: "",
    clinicCity: "Casablanca",
    clinicAddress: "",
    assistantName: "",
    assistantEmail: "",
    assistantPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.assistantName.trim() || !formData.assistantEmail.trim() || !formData.assistantPassword.trim()) {
      setError("Veuillez renseigner toutes les informations du compte Assistante (obligatoire).");
      return;
    }

    if (formData.doctorEmail.trim().toLowerCase() === formData.assistantEmail.trim().toLowerCase()) {
      setError("L'email de l'assistante doit être différent de celui du médecin.");
      return;
    }

    if (formData.doctorPassword.trim().length < 6 || formData.assistantPassword.trim().length < 6) {
      setError("Les mots de passe du médecin et de l'assistante doivent contenir au moins 6 caractères.");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        doctorName: formData.doctorName,
        doctorEmail: formData.doctorEmail,
        doctorPassword: formData.doctorPassword,
        doctorPhone: formData.doctorPhone,
        specialty: formData.specialty,
        clinicName: formData.clinicName,
        clinicCity: formData.clinicCity,
        clinicAddress: formData.clinicAddress,
        assistantName: formData.assistantName,
        assistantEmail: formData.assistantEmail,
        assistantPassword: formData.assistantPassword,
      };

      const res: any = await registerClinic(payload);

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else if (res?.success && res.requestId) {
        router.push(`/onboarding/verify?id=${res.requestId}`);
      }
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue lors de l'enregistrement.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800 font-sans selection:bg-slate-900 selection:text-white py-10 px-4 sm:px-6 relative">
      
      {/* Ambient background soft aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-72 bg-gradient-to-b from-sky-100/50 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        
        {/* Navigation retour */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Retour à la connexion</span>
          </Link>

          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Activation Médicale Sécurisée
          </span>
        </div>

        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-sky-700 text-xs font-bold mb-3">
            <span className="material-symbols-outlined text-sm">local_hospital</span>
            MonCabinet • Inscription Praticien
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Créer votre Cabinet Médical
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Renseignez les informations de votre pratique. Vous recevrez un code OTP à 6 chiffres pour activer votre cabinet en direct.
          </p>
        </div>

        {/* Message d'erreur */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-base text-red-500 shrink-0">error</span>
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulaire Principal Multi-Section */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1 : Praticien Titulaire */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xl shadow-slate-900/[0.03]">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">stethoscope</span>
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900">Médecin Praticien Titulaire</h2>
                <p className="text-[11px] text-slate-500">Compte administrateur de votre cabinet médical</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="doctorName">
                  Nom & Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  id="doctorName"
                  type="text"
                  name="doctorName"
                  required
                  placeholder="Dr. Youssef Alami"
                  value={formData.doctorName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="doctorPhone">
                  Téléphone portable <span className="text-red-500">*</span>
                </label>
                <input
                  id="doctorPhone"
                  type="tel"
                  name="doctorPhone"
                  required
                  placeholder="06 61 00 00 00"
                  value={formData.doctorPhone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="specialty">
                  Spécialité médicale <span className="text-red-500">*</span>
                </label>
                <select
                  id="specialty"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs cursor-pointer"
                >
                  <option value="Médecine Générale">Médecine Générale</option>
                  <option value="Cardiologie">Cardiologie</option>
                  <option value="Pédiatrie">Pédiatrie</option>
                  <option value="Dermatologie">Dermatologie</option>
                  <option value="Gynécologie Obstétrique">Gynécologie Obstétrique</option>
                  <option value="Ophtalmologie">Ophtalmologie</option>
                  <option value="Orthopédie & Traumatologie">Orthopédie & Traumatologie</option>
                  <option value="ORL">ORL</option>
                  <option value="Neurologie">Neurologie</option>
                  <option value="Gastro-Entérologie">Gastro-Entérologie</option>
                  <option value="Endocrinologie">Endocrinologie</option>
                  <option value="Autre spécialité">Autre spécialité</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="doctorEmail">
                  Email de connexion <span className="text-red-500">*</span>
                </label>
                <input
                  id="doctorEmail"
                  type="email"
                  name="doctorEmail"
                  required
                  placeholder="dr.alami@cabinet.ma"
                  value={formData.doctorEmail}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="doctorPassword">
                  Mot de passe praticien <span className="text-red-500">*</span>
                </label>
                <input
                  id="doctorPassword"
                  type="password"
                  name="doctorPassword"
                  required
                  placeholder="Au moins 6 caractères"
                  value={formData.doctorPassword}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Le Cabinet & Ville avec Recherche Rapide */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xl shadow-slate-900/[0.03]">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">domain</span>
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900">Le Cabinet Médical</h2>
                <p className="text-[11px] text-slate-500">Coordonnées et localisation au Maroc</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="clinicName">
                  Nom du Cabinet / Clinique <span className="text-red-500">*</span>
                </label>
                <input
                  id="clinicName"
                  type="text"
                  name="clinicName"
                  required
                  placeholder="Cabinet Médical Alami"
                  value={formData.clinicName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
                />
              </div>

              {/* SÉLECTEUR DE VILLES DU MAROC AVEC RECHERCHE RAPIDE */}
              <div>
                <MoroccanCitySelect
                  value={formData.clinicCity}
                  onChange={(cityName) => setFormData((prev) => ({ ...prev, clinicCity: cityName }))}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="clinicAddress">
                  Adresse complète du cabinet
                </label>
                <input
                  id="clinicAddress"
                  type="text"
                  name="clinicAddress"
                  placeholder="120 Boulevard d'Anfa, 4ème étage"
                  value={formData.clinicAddress}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3 : Assistante Médicale (Obligatoire) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xl shadow-slate-900/[0.03]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">assignment_ind</span>
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900">Compte Assistante Médicale</h2>
                  <p className="text-[11px] text-slate-500">Gestion de l'accueil, de la file d'attente et des règlements</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Obligatoire
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="assistantName">
                  Nom de l'assistante <span className="text-red-500">*</span>
                </label>
                <input
                  id="assistantName"
                  type="text"
                  name="assistantName"
                  required
                  placeholder="Salma Kabbaj"
                  value={formData.assistantName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="assistantEmail">
                  Email de connexion <span className="text-red-500">*</span>
                </label>
                <input
                  id="assistantEmail"
                  type="email"
                  name="assistantEmail"
                  required
                  placeholder="assistante@cabinet.ma"
                  value={formData.assistantEmail}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="assistantPassword">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  id="assistantPassword"
                  type="password"
                  name="assistantPassword"
                  required
                  minLength={6}
                  placeholder="•••••••• (min. 6 car.)"
                  value={formData.assistantPassword}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Bouton de Soumission */}
          <div className="pt-2 text-center space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto min-w-[320px] inline-flex items-center justify-center gap-2.5 py-3.5 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-lg shadow-slate-900/10 transition cursor-pointer disabled:opacity-60 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  <span>Envoi de votre demande...</span>
                </>
              ) : (
                <>
                  <span>Créer mon Cabinet & Obtenir le Code d'Accès</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400 font-medium">
              Code à 6 chiffres valable 5 minutes généré et transmis au Super Administrateur.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
