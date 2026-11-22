"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { adminCreateClinicAndUsers, AdminCreateClinicInput } from "@/actions/admin";
import MoroccanCitySelect from "@/components/MoroccanCitySelect";

interface AdminCreateClinicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  showFeedback: (type: "success" | "error", message: string) => void;
  initialData?: Partial<AdminCreateClinicInput> | null;
}

function generateRandomPassword(length = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export default function AdminCreateClinicModal({
  isOpen,
  onClose,
  onSuccess,
  showFeedback,
  initialData,
}: AdminCreateClinicModalProps) {
  const [formData, setFormData] = useState<AdminCreateClinicInput>({
    requestId: initialData?.requestId,
    clinicName: initialData?.clinicName || "",
    slug: initialData?.slug || (initialData?.clinicName ? slugify(initialData.clinicName) : ""),
    clinicCity: initialData?.clinicCity || "Casablanca",
    clinicAddress: initialData?.clinicAddress || "",
    doctorName: initialData?.doctorName || "",
    doctorEmail: initialData?.doctorEmail || "",
    doctorPassword: "", // Laisser vide pour saisie admin
    doctorPhone: initialData?.doctorPhone || "",
    specialty: initialData?.specialty || "Médecine Générale",
    assistantName: initialData?.assistantName || "",
    assistantEmail: initialData?.assistantEmail || "",
    assistantPassword: "", // Laisser vide pour saisie admin
  });

  const [hasAssistant, setHasAssistant] = useState(
    Boolean(initialData?.assistantEmail || initialData?.assistantName)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronisation dynamique dès que la modale s'ouvre ou que initialData change
  useEffect(() => {
    if (isOpen) {
      const hasAssis = Boolean(initialData?.assistantEmail || initialData?.assistantName);
      setFormData({
        requestId: initialData?.requestId,
        clinicName: initialData?.clinicName || "",
        slug: initialData?.slug || (initialData?.clinicName ? slugify(initialData.clinicName) : ""),
        clinicCity: initialData?.clinicCity || "Casablanca",
        clinicAddress: initialData?.clinicAddress || "",
        doctorName: initialData?.doctorName || "",
        doctorEmail: initialData?.doctorEmail || "",
        doctorPassword: "", // Vide pour saisie par l'admin
        doctorPhone: initialData?.doctorPhone || "",
        specialty: initialData?.specialty || "Médecine Générale",
        assistantName: initialData?.assistantName || "",
        assistantEmail: initialData?.assistantEmail || "",
        assistantPassword: "", // Vide pour saisie par l'admin
      });
      setHasAssistant(hasAssis);
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleClinicNameChange = (val: string) => {
    setFormData((prev) => {
      const updated = { ...prev, clinicName: val };
      // Auto-remplir le slug si l'utilisateur ne l'a pas encore touché manuellement
      if (!prev.slug || prev.slug === slugify(prev.clinicName)) {
        updated.slug = slugify(val);
      }
      return updated;
    });
  };

  const handleGenerateDoctorPassword = () => {
    setFormData((prev) => ({ ...prev, doctorPassword: generateRandomPassword() }));
  };

  const handleGenerateAssistantPassword = () => {
    setFormData((prev) => ({ ...prev, assistantPassword: generateRandomPassword() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.clinicName.trim()) {
      setError("Le nom du cabinet est obligatoire.");
      return;
    }
    if (!formData.doctorName.trim() || !formData.doctorEmail.trim() || !formData.doctorPassword.trim()) {
      setError("Le nom, email et mot de passe du médecin sont obligatoires.");
      return;
    }
    if (formData.doctorPassword.trim().length < 6) {
      setError("Le mot de passe du médecin doit comporter au moins 6 caractères.");
      return;
    }

    if (hasAssistant) {
      if (!formData.assistantName?.trim() || !formData.assistantEmail?.trim() || !formData.assistantPassword?.trim()) {
        setError("Veuillez renseigner le nom, l'email et le mot de passe de l'assistante.");
        return;
      }
      if (formData.assistantEmail.trim().toLowerCase() === formData.doctorEmail.trim().toLowerCase()) {
        setError("L'email de l'assistante doit être différent de celui du médecin.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: AdminCreateClinicInput = {
        requestId: formData.requestId,
        clinicName: formData.clinicName.trim(),
        slug: slugify(formData.slug || formData.clinicName),
        clinicCity: formData.clinicCity.trim(),
        clinicAddress: formData.clinicAddress?.trim() || null,
        doctorName: formData.doctorName.trim(),
        doctorEmail: formData.doctorEmail.trim().toLowerCase(),
        doctorPassword: formData.doctorPassword.trim(),
        doctorPhone: formData.doctorPhone?.trim() || null,
        specialty: formData.specialty.trim(),
        assistantName: hasAssistant ? formData.assistantName?.trim() || null : null,
        assistantEmail: hasAssistant ? formData.assistantEmail?.trim().toLowerCase() || null : null,
        assistantPassword: hasAssistant ? formData.assistantPassword?.trim() || null : null,
      };

      const res = await adminCreateClinicAndUsers(payload);
      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
      } else {
        showFeedback("success", res.message || "Cabinet créé avec succès !");
        await onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la création du cabinet.");
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">add_business</span>
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">Nouveau Cabinet Médical</h3>
                <p className="text-xs text-slate-300">
                  Création directe du cabinet et des accès praticien / secrétariat
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* SECTION 1: CABINET */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                <span className="material-symbols-outlined text-sky-600 text-base">domain</span>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Informations du Cabinet
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nom du cabinet *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cabinet Médical Al Hikma"
                    value={formData.clinicName}
                    onChange={(e) => handleClinicNameChange(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sous-domaine dédié (slug) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="alhikma"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, slug: slugify(e.target.value) }))
                      }
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500 font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Accès : <span className="font-mono text-sky-600 font-medium">https://{formData.slug || "cabinet"}.toncabinet.me</span>
                  </p>
                </div>

                <div>
                  <MoroccanCitySelect
                    value={formData.clinicCity}
                    onChange={(city) => setFormData((prev) => ({ ...prev, clinicCity: city }))}
                    label="Ville d'exercice"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Adresse complète (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 45 Bd Zerktouni, 3ème étage"
                    value={formData.clinicAddress || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, clinicAddress: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: MÉDECIN */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                <span className="material-symbols-outlined text-teal-600 text-base">stethoscope</span>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Médecin Titulaire (Administrateur du cabinet)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nom et Prénom du Médecin *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dr. Ahmed Benali"
                    value={formData.doctorName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, doctorName: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Spécialité médicale *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cardiologie, Pédiatrie..."
                    value={formData.specialty}
                    onChange={(e) => setFormData((prev) => ({ ...prev, specialty: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email de connexion Médecin *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="dr.benali@gmail.com"
                    value={formData.doctorEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, doctorEmail: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Téléphone du médecin
                  </label>
                  <input
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={formData.doctorPhone || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, doctorPhone: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Mot de passe Médecin *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateDoctorPassword}
                      className="text-[11px] text-sky-600 hover:text-sky-800 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">autorenew</span>
                      Générer un mot de passe
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.doctorPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, doctorPassword: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Le praticien configurera sa photo de profil et son modèle d'ordonnance lors de son premier accès.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 3: ASSISTANTE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-base">support_agent</span>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    3. Secrétariat & Accueil
                  </h4>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasAssistant}
                    onChange={(e) => {
                      setHasAssistant(e.target.checked);
                      if (e.target.checked && !formData.assistantPassword) {
                        setFormData((prev) => ({ ...prev, assistantPassword: generateRandomPassword() }));
                      }
                    }}
                    className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-700">Ajouter une assistante</span>
                </label>
              </div>

              {hasAssistant && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nom de l'assistante *
                    </label>
                    <input
                      type="text"
                      required={hasAssistant}
                      placeholder="Ex: Fatima Zahra"
                      value={formData.assistantName || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, assistantName: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email de connexion assistante *
                    </label>
                    <input
                      type="email"
                      required={hasAssistant}
                      placeholder="secretariat@gmail.com"
                      value={formData.assistantEmail || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, assistantEmail: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-700">
                        Mot de passe assistante *
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateAssistantPassword}
                        className="text-[11px] text-sky-600 hover:text-sky-800 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">autorenew</span>
                        Générer un mot de passe
                      </button>
                    </div>
                    <input
                      type="text"
                      required={hasAssistant}
                      value={formData.assistantPassword || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, assistantPassword: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500 bg-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Création du cabinet en cours...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>Créer et Activer le Cabinet</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
