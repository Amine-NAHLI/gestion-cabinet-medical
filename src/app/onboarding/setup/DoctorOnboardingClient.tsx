"use client";

import { useState, useTransition, useEffect } from "react";
import { checkSlugAvailability, completeDoctorOnboarding } from "@/actions/onboarding-wizard";
import { motion, AnimatePresence } from "framer-motion";

interface InitialData {
  clinic: {
    id: number;
    name: string;
    slug: string | null;
    city: string;
    logoUrl: string | null;
    primaryColor: string | null;
    isCommunityMember: boolean;
  };
  doctor: {
    id: number;
    name: string;
    email: string;
    phone: string;
    avatarUrl: string | null;
    bio: string;
    isOnboarded: boolean;
  };
}

export default function DoctorOnboardingClient({ initialData }: { initialData: InitialData }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSaving, startSaving] = useTransition();
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Étape 1 : Choix Mot de passe
  const [passwordChoice, setPasswordChoice] = useState<"keep" | "change">("keep");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Étape 2 : Identifiant web et Logo du Cabinet
  const [slug, setSlug] = useState<string>(() => {
    if (initialData.clinic.slug) return initialData.clinic.slug;
    const cleanDoc = initialData.doctor.name
      .toLowerCase()
      .replace(/^dr\.\s*|^dr\s*/, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return cleanDoc ? `dr-${cleanDoc}` : "mon-cabinet";
  });

  const [slugStatus, setSlugStatus] = useState<{
    loading: boolean;
    available?: boolean;
    cleanSlug?: string;
    error?: string;
    suggestions?: string[];
  }>({ loading: false });

  const [logoUrl, setLogoUrl] = useState<string | null>(initialData.clinic.logoUrl);

  // Étape 3 : Profil Médecin & Présentation
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData.doctor.avatarUrl);
  const [bio, setBio] = useState<string>(initialData.doctor.bio || "");

  // Étape 4 : Réseau Médical Confraternel
  const [isCommunityMember, setIsCommunityMember] = useState<boolean>(true);

  // Vérification de la disponibilité du slug avec debounce
  useEffect(() => {
    if (!slug || slug.trim().length < 3) {
      setSlugStatus({
        loading: false,
        available: false,
        error: "L'identifiant doit contenir au moins 3 caractères",
      });
      return;
    }

    setSlugStatus((prev) => ({ ...prev, loading: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await checkSlugAvailability(slug);
        if (res.available && res.slug) {
          setSlugStatus({ loading: false, available: true, cleanSlug: res.slug });
        } else {
          setSlugStatus({
            loading: false,
            available: false,
            cleanSlug: res.slug,
            error: res.error,
            suggestions: res.suggestions,
          });
        }
      } catch {
        setSlugStatus({
          loading: false,
          available: false,
          error: "Impossible de vérifier la disponibilité",
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  // Upload d'image compressée (WebP)
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (url: string) => void,
    maxDim = 400
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          callback(canvas.toDataURL("image/webp", 0.88));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleNextFromStep1 = () => {
    setGeneralError(null);
    if (passwordChoice === "change") {
      if (!newPassword.trim() || newPassword.trim().length < 6) {
        setGeneralError("Le mot de passe doit comporter au moins 6 caractères.");
        return;
      }
      if (newPassword.trim() !== confirmPassword.trim()) {
        setGeneralError("Les deux mots de passe ne correspondent pas.");
        return;
      }
    }
    setStep(2);
  };

  const handleFinish = () => {
    setGeneralError(null);
    if (!slugStatus.available && slugStatus.error) {
      setGeneralError(slugStatus.error);
      setStep(2);
      return;
    }

    startSaving(async () => {
      const res = await completeDoctorOnboarding({
        slug: slugStatus.cleanSlug || slug,
        logoUrl,
        avatarUrl,
        primaryColor: "#0f172a",
        isCommunityMember,
        bio,
        newPassword: passwordChoice === "change" ? newPassword.trim() : null,
      });

      if (res.success) {
        window.location.href = "/dashboard?first_time=1";
      } else {
        setGeneralError(res.error || "Une erreur est survenue lors de l'enregistrement.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* En-tête sobre & rassurant */}
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Bienvenue • Configuration initiale
          </span>
          <h1 className="text-xl font-bold text-slate-900">
            Activation de votre Cabinet Médical
          </h1>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-slate-400">Étape {step} sur 4</span>
          <div className="w-28 h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-slate-900 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Corps du formulaire étape par étape */}
      <main className="max-w-2xl w-full mx-auto my-6 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
        {generalError && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{generalError}</span>
          </div>
        )}

        {/* ============================================================
            ÉTAPE 1 : MOT DE PASSE (CONSERVER OU MODIFIER)
           ============================================================ */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
                <span className="material-symbols-outlined text-2xl">lock</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Sécurité de votre compte praticien
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Bienvenue Dr. <strong>{initialData.doctor.name}</strong> ! Votre compte a été initialisé par l&apos;administrateur.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs text-slate-700 leading-relaxed">
              Pour ce premier accès, souhaitez-vous <strong>conserver le mot de passe actuel</strong> communiqué par l&apos;administrateur ou <strong>en choisir un nouveau</strong> ?
            </div>

            <div className="space-y-3">
              {/* Option A : Conserver */}
              <button
                type="button"
                onClick={() => {
                  setPasswordChoice("keep");
                  setGeneralError(null);
                }}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3.5 cursor-pointer ${
                  passwordChoice === "keep"
                    ? "border-sky-600 bg-sky-50/50 ring-1 ring-sky-600 shadow-2xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    passwordChoice === "keep"
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {passwordChoice === "keep" && (
                    <span className="material-symbols-outlined text-xs">check</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">
                    Conserver mon mot de passe actuel
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Je continue avec le mot de passe transmis par l&apos;administrateur.
                  </p>
                </div>
              </button>

              {/* Option B : Modifier */}
              <button
                type="button"
                onClick={() => {
                  setPasswordChoice("change");
                  setGeneralError(null);
                }}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3.5 cursor-pointer ${
                  passwordChoice === "change"
                    ? "border-sky-600 bg-sky-50/50 ring-1 ring-sky-600 shadow-2xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    passwordChoice === "change"
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {passwordChoice === "change" && (
                    <span className="material-symbols-outlined text-xs">check</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">
                    Modifier mon mot de passe
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Définir dès maintenant mon mot de passe personnel sécurisé.
                  </p>
                </div>
              </button>
            </div>

            {/* Champs si modification choisie */}
            {passwordChoice === "change" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nouveau mot de passe personnel *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
                      className="w-full text-xs px-3 py-2 pr-9 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500 bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">
                        {showNewPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Confirmer le nouveau mot de passe *
                  </label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retapez votre mot de passe"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500 bg-white font-mono"
                  />
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ============================================================
            ÉTAPE 2 : IDENTITÉ & SOUS-DOMAINE DU CABINET
           ============================================================ */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                2. Logo & Adresse Web de votre Cabinet
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Vérifiez votre adresse web et téléversez le logo de votre cabinet.
              </p>
            </div>

            {/* Upload Logo */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-slate-300">image</span>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold text-slate-800">Logo du cabinet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Apparaîtra sur votre tableau de bord, ordonnances et quittances.
                </p>
                <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 cursor-pointer transition">
                    <span className="material-symbols-outlined text-sm">upload</span>
                    <span>{logoUrl ? "Changer le logo" : "Téléverser un logo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, setLogoUrl, 500)}
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sous-domaine */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-800">
                Sous-domaine personnalisé de votre Cabinet
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-900">
                <span className="text-xs font-mono text-slate-400 select-none">https://</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="dr-nom"
                  className="bg-transparent border-0 text-xs font-mono font-semibold text-slate-900 focus:outline-none flex-1 px-1"
                />
                <span className="text-xs font-mono text-slate-500 font-medium select-none">
                  .toncabinet.me
                </span>
              </div>

              {slugStatus.loading && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Vérification de la disponibilité...
                </p>
              )}
              {!slugStatus.loading && slugStatus.available && (
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Adresse disponible et réservée pour votre cabinet !
                </p>
              )}
              {!slugStatus.loading && slugStatus.error && (
                <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  {slugStatus.error}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            ÉTAPE 3 : PROFIL PRATICIEN
           ============================================================ */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                3. Profil & Photo du Médecin
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Cette photo apparaîtra sur vos échanges avec l&apos;assistante et sur le réseau médical.
              </p>
            </div>

            {/* Avatar Praticien */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-20 h-20 rounded-full border-2 border-white shadow-md bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-slate-400">person</span>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold text-slate-800">Photo de profil praticien</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Une photo professionnelle inspire confiance à votre patientèle et vos confrères.
                </p>
                <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 cursor-pointer transition">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    <span>{avatarUrl ? "Changer la photo" : "Ajouter ma photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, setAvatarUrl, 400)}
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(null)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bio / Présentation */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Courte présentation / Bio professionnelle (optionnel)
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ex: Ancien interne des hôpitaux, spécialisé en cardiologie interventionnelle..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* ============================================================
            ÉTAPE 4 : RÉSEAU MÉDICAL CONFRATERNEL
           ============================================================ */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                4. Réseau Médical Confraternel
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Rejoignez gratuitement la communauté fermée de médecins certifiés.
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1 : Oui */}
              <button
                type="button"
                onClick={() => setIsCommunityMember(true)}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3.5 cursor-pointer ${
                  isCommunityMember
                    ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600 shadow-2xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    isCommunityMember
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isCommunityMember && (
                    <span className="material-symbols-outlined text-sm">check</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      Oui, je rejoins la communauté confraternelle
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      Recommandé
                    </span>
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-slate-600">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5">forum</span>
                      <span className="text-[11px] leading-snug">Partagez des cas cliniques et demandez des avis confraternels en toute sécurité.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5">chat</span>
                      <span className="text-[11px] leading-snug">Messagerie directe privée entre médecins membres.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5">lock</span>
                      <span className="text-[11px] leading-snug">100% réservé aux médecins certifiés, secret médical préservé.</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Option 2 : Non */}
              <button
                type="button"
                onClick={() => setIsCommunityMember(false)}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3.5 cursor-pointer ${
                  !isCommunityMember
                    ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900 shadow-2xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    !isCommunityMember
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {!isCommunityMember && (
                    <span className="material-symbols-outlined text-sm">check</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">
                    Garder mon cabinet en mode privé pour l&apos;instant
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Votre profil n&apos;apparaîtra pas dans l&apos;annuaire médical et vous pourrez activer cette option à tout moment dans vos Paramètres.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Boutons Suivant / Précédent */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setGeneralError(null);
                setStep((s) => (s - 1) as any);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Retour
            </button>
          ) : (
            <div />
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleNextFromStep1}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Continuer</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          ) : step < 4 ? (
            <button
              type="button"
              disabled={step === 2 && !slugStatus.available}
              onClick={() => {
                setGeneralError(null);
                setStep((s) => (s + 1) as any);
              }}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>Continuer</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleFinish}
              className="px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{isSaving ? "Finalisation en cours..." : "Accéder à mon Cabinet"}</span>
            </button>
          )}
        </div>
      </main>

      {/* Footer sobre */}
      <footer className="text-center text-[11px] text-slate-400 py-2">
        MonCabinet • Plateforme médicale sécurisée
      </footer>
    </div>
  );
}
