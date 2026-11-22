"use client";

import { useState, useEffect, useTransition } from "react";
import { checkSlugAvailability, completeDoctorOnboarding } from "@/actions/onboarding-wizard";

interface InitialData {
  clinic: {
    id: number;
    name: string;
    city: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string;
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSaving, startSaving] = useTransition();
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Étape 1 : Identifiant web et Logo du Cabinet
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

  // Étape 2 : Profil Médecin & Présentation
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData.doctor.avatarUrl);
  const [bio, setBio] = useState<string>(initialData.doctor.bio || "");

  // Étape 3 : Réseau Médical Confraternel
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

  const handleFinish = () => {
    setGeneralError(null);
    if (!slugStatus.available && slugStatus.error) {
      setGeneralError(slugStatus.error);
      setStep(1);
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
            Configuration initiale
          </span>
          <h1 className="text-xl font-bold text-slate-900">
            Personnalisation de votre Cabinet
          </h1>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-slate-400">Étape {step} sur 3</span>
          <div className="w-28 h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-slate-900 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
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
            ÉTAPE 1 : IDENTITÉ & SOUS-DOMAINE DU CABINET
           ============================================================ */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                1. Logo & Adresse Web de votre Cabinet
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Définissez l&apos;adresse de connexion de votre cabinet et téléversez votre logo officiel.
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
                  Apparaîtra sur votre tableau de bord, ordonnances et quittances (PNG, WEBP ou JPG).
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

            {/* Sous-domaine personnalisé */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Adresse Web personnalisée du cabinet <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition">
                <span className="text-xs font-medium text-slate-400 select-none">https://</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="nom-cabinet"
                  className="flex-1 px-1 text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
                />
                <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 select-none">
                  .toncabinet.me
                </span>
              </div>

              {/* Statut disponibilité du slug */}
              <div className="text-[11px] pt-1">
                {slugStatus.loading ? (
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-400 border-t-transparent animate-spin" />
                    Vérification de la disponibilité...
                  </span>
                ) : slugStatus.available ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Adresse disponible : <strong>{slugStatus.cleanSlug}.toncabinet.me</strong>
                  </span>
                ) : (
                  slugStatus.error && (
                    <span className="text-red-600 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">cancel</span>
                      {slugStatus.error || "Adresse non disponible"}
                    </span>
                  )
                )}

                {/* Suggestions si non dispo */}
                {slugStatus.suggestions && slugStatus.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-400 text-[11px]">Suggestions :</span>
                    {slugStatus.suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setSlug(sug)}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            ÉTAPE 2 : PROFIL DU MÉDECIN
           ============================================================ */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                2. Profil du Médecin Praticien
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ces informations apparaîtront dans votre espace et sur l&apos;annuaire médical confraternel.
              </p>
            </div>

            {/* Photo de profil Praticien */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-20 h-20 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-slate-300">account_circle</span>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold text-slate-800">Photo de profil praticien</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Une photo professionnelle pour rassurer vos confrères et patients.
                </p>
                <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 cursor-pointer transition">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    <span>{avatarUrl ? "Changer la photo" : "Ajouter une photo"}</span>
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

            {/* Bio confraternelle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Présentation / Titre confraternel <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ex: Spécialiste en cardiologie, ancien interne des hôpitaux. Consultation sur rendez-vous..."
                className="w-full px-3.5 py-2.5 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-400">
                Apparaîtra sur votre fiche de confrère dans l&apos;annuaire médical sécurisé.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================
            ÉTAPE 3 : RÉSEAU & COMMUNAUTÉ MÉDICALE CONFRATERNELLE
           ============================================================ */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-600 text-2xl">verified_user</span>
                <h2 className="text-lg font-bold text-slate-900">
                  3. Réseau Médical Confraternel Sécurisé
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Espace professionnel inter-praticiens strictement fermé et réservé aux médecins certifiés.
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1 : Oui (Recommandé) */}
              <button
                type="button"
                onClick={() => setIsCommunityMember(true)}
                className={`w-full p-5 rounded-2xl border text-left transition flex items-start gap-4 cursor-pointer ${
                  isCommunityMember
                    ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    isCommunityMember
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-2xs"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isCommunityMember && (
                    <span className="material-symbols-outlined text-base">check</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Oui, je rejoins le réseau confraternel certifié</span>
                    </p>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Recommandé
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Accédez aux outils d&apos;entraide médicale et collaborez directement avec vos confrères praticiens :
                  </p>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-emerald-100/80">
                      <span className="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5">stethoscope</span>
                      <div className="text-[11px] leading-snug">
                        <strong className="text-slate-900 block font-semibold">Cas Cliniques & Deuxième Avis</strong>
                        <span className="text-slate-500">Partagez des cas complexes et sollicitez des confrères spécialistes en toute confidentialité.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-emerald-100/80">
                      <span className="material-symbols-outlined text-sky-600 text-base shrink-0 mt-0.5">chat</span>
                      <div className="text-[11px] leading-snug">
                        <strong className="text-slate-900 block font-semibold">Messagerie Directe 1-à-1 Chiffrée</strong>
                        <span className="text-slate-500">Discutez en direct de praticien à praticien grâce à l&apos;annuaire des médecins par spécialité.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-emerald-100/80">
                      <span className="material-symbols-outlined text-purple-600 text-base shrink-0 mt-0.5">shield</span>
                      <div className="text-[11px] leading-snug">
                        <strong className="text-slate-900 block font-semibold">Secret Médical Préservé</strong>
                        <span className="text-slate-500">Réseau 100% clos et étanche, isolé de la patientèle et des dossiers non anonymisés.</span>
                      </div>
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
                    ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
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
                    Votre profil n&apos;apparaîtra pas dans l&apos;annuaire médical et vous n&apos;aurez pas accès à la messagerie confraternelle. Vous pourrez activer cette option à tout moment dans vos Paramètres.
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
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Retour
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              disabled={step === 1 && !slugStatus.available}
              onClick={() => setStep((s) => (s + 1) as any)}
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
