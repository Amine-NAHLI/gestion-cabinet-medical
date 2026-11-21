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

const PRESET_THEMES = [
  {
    id: "default",
    name: "Ardoise Minimaliste",
    subtitle: "Style Doctolib élégant et neutre",
    color: "#0f172a",
    badge: "Par défaut",
  },
  {
    id: "ocean",
    name: "Bleu Océan",
    subtitle: "Rigueur, clarté et confiance",
    color: "#0284c7",
    badge: "Recommandé",
  },
  {
    id: "emerald",
    name: "Vert Émeraude",
    subtitle: "Santé, sérénité et soin",
    color: "#059669",
    badge: "Clinique",
  },
  {
    id: "amethyst",
    name: "Améthyste Moderne",
    subtitle: "Pratique moderne et esthétique",
    color: "#7c3aed",
    badge: "Spécialités",
  },
];

export default function DoctorOnboardingClient({ initialData }: { initialData: InitialData }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Étape 1 : Logo & Sous-domaine
  const [logoUrl, setLogoUrl] = useState<string | null>(initialData.clinic.logoUrl);
  const [slug, setSlug] = useState<string>(() => {
    if (initialData.clinic.slug) return initialData.clinic.slug;
    // Préremplissage intelligent depuis le nom du médecin ou de la clinique
    const base = (initialData.doctor.name || initialData.clinic.name || "cabinet")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return base || "cabinet";
  });
  const [slugStatus, setSlugStatus] = useState<{
    loading: boolean;
    available?: boolean;
    cleanSlug?: string;
    error?: string;
    suggestions?: string[];
  }>({ loading: false });

  // Étape 2 : Profil Médecin
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData.doctor.avatarUrl);
  const [bio, setBio] = useState<string>(initialData.doctor.bio || "");

  // Étape 3 : Thème de couleur
  const [selectedColor, setSelectedColor] = useState<string>(initialData.clinic.primaryColor || "#0f172a");
  const [isCustomColor, setIsCustomColor] = useState<boolean>(false);

  // Étape 4 : Accord Communauté
  const [isCommunityMember, setIsCommunityMember] = useState<boolean>(initialData.clinic.isCommunityMember ?? true);

  const [isSaving, startSaving] = useTransition();
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Vérification de la disponibilité du slug avec debounce
  useEffect(() => {
    if (!slug || slug.trim().length < 3) {
      setSlugStatus({ loading: false, available: false, error: "Au moins 3 caractères requis." });
      return;
    }

    setSlugStatus({ loading: true });
    const timer = setTimeout(async () => {
      try {
        const res = await checkSlugAvailability(slug);
        if (res.available) {
          setSlugStatus({ loading: false, available: true, cleanSlug: res.slug });
        } else {
          setSlugStatus({
            loading: false,
            available: false,
            error: res.error,
            suggestions: res.suggestions,
          });
        }
      } catch {
        setSlugStatus({ loading: false, available: true });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  // Fonction pour compresser les images côté client (logo & avatar) via Canvas
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (dataUrl: string) => void,
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
        primaryColor: selectedColor,
        isCommunityMember,
        bio,
      });

      if (res.success) {
        window.location.href = "/dashboard";
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
            ÉTAPE 1 : IDENTITÉ & SOUS-DOMAINE DU CABINET
           ============================================================ */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                1. Logo & Identifiant de votre Cabinet
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Choisissez l&apos;adresse de votre cabinet et téléversez votre logo officiel.
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

            {/* Choix du Sous-domaine */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Sous-domaine / Adresse personnalisée
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-900 transition overflow-hidden">
                <span className="pl-3.5 text-xs text-slate-400 font-medium select-none">https://</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="ex: amine"
                  className="flex-1 px-1.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none"
                />
                <span className="pr-3.5 text-xs font-semibold text-slate-500 select-none bg-slate-50 border-l border-slate-200 py-2.5 pl-2.5">
                  .toncabinet.ma
                </span>
              </div>

              {/* Indicateur de disponibilité */}
              <div className="min-h-[22px] flex items-center justify-between text-xs px-1">
                {slugStatus.loading ? (
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    Vérification de la disponibilité...
                  </span>
                ) : slugStatus.available ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Adresse disponible : <strong>{slugStatus.cleanSlug}.toncabinet.ma</strong>
                  </span>
                ) : (
                  <span className="text-red-600 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">cancel</span>
                    {slugStatus.error || "Adresse non disponible"}
                  </span>
                )}
              </div>

              {slugStatus.suggestions && slugStatus.suggestions.length > 0 && (
                <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Suggestions :</span>
                  {slugStatus.suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setSlug(sug)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-medium text-slate-700 cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
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
                2. Profil du Médecin
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Votre photo et votre courte biographie pour humaniser vos échanges et vos ordonnances.
              </p>
            </div>

            {/* Photo de profil */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-20 h-20 rounded-full border-2 border-white shadow-sm bg-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-slate-400">person</span>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold text-slate-800">
                  Photo de profil du praticien
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Visible par votre assistante, sur vos ordonnances et auprès des confrères de la communauté.
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
                placeholder="Ex: Spécialiste en cardiologie, ancien chef de clinique. Consultation sur rendez-vous..."
                className="w-full px-3.5 py-2.5 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-400">
                Apparaîtra sur votre fiche de confrère dans l&apos;annuaire médical.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================
            ÉTAPE 3 : PERSONNALISATION DES COULEURS
           ============================================================ */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                3. Thème & Couleurs du Cabinet
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Choisissez l&apos;ambiance visuelle qui sera appliquée à votre espace cabinet.
              </p>
            </div>

            {/* Palettes Prédéfinies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_THEMES.map((theme) => {
                const isSelected = !isCustomColor && selectedColor === theme.color;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      setSelectedColor(theme.color);
                      setIsCustomColor(false);
                    }}
                    className={`p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "border-slate-900 bg-slate-50/80 shadow-2xs ring-1 ring-slate-900"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-lg shrink-0 shadow-2xs border border-black/10 mt-0.5"
                      style={{ backgroundColor: theme.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{theme.name}</p>
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {theme.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {theme.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sélecteur libre */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-800">Couleur personnalisée (Code HEX)</p>
                <p className="text-[11px] text-slate-500">
                  Si vous avez déjà votre propre charte graphique ou couleur de logo.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => {
                    setSelectedColor(e.target.value);
                    setIsCustomColor(true);
                  }}
                  className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => {
                    setSelectedColor(e.target.value);
                    setIsCustomColor(true);
                  }}
                  className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-mono uppercase font-semibold text-slate-800 bg-white text-center"
                />
              </div>
            </div>

            {/* Prévisualisation dynamique live */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Aperçu en direct
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  style={{ backgroundColor: selectedColor }}
                  className="px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-xs"
                >
                  Bouton d&apos;action
                </button>
                <span
                  style={{ borderColor: selectedColor, color: selectedColor }}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold bg-white"
                >
                  Badge du cabinet
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  Les menus, titres et accents de votre cabinet s&apos;accorderont automatiquement.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            ÉTAPE 4 : ACCORD COMMUNAUTÉ MÉDICALE
           ============================================================ */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                4. Réseau & Communauté Médicale
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Connectez-vous à la communauté fermée et sécurisée des médecins utilisateurs de la plateforme.
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1 : Oui */}
              <button
                type="button"
                onClick={() => setIsCommunityMember(true)}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3.5 cursor-pointer ${
                  isCommunityMember
                    ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
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
                    <p className="text-sm font-bold text-slate-900">
                      Oui, je rejoins la communauté confraternelle
                    </p>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Recommandé
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-600">forum</span>
                      <span>Fil confraternel : partagez des cas cliniques et demandes d&apos;avis.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-600">chat</span>
                      <span>Chat privé style WhatsApp direct entre médecins membres.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-600">lock</span>
                      <span>100 % réservé aux médecins certifiés, secret médical préservé.</span>
                    </li>
                  </ul>
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
                  <p className="text-sm font-bold text-slate-900">
                    Non, je préfère garder mon cabinet privé pour l&apos;instant
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Votre profil n&apos;apparaîtra pas dans l&apos;annuaire et vous n&apos;aurez pas accès au fil confraternel. Vous pourrez modifier ce choix à tout moment dans vos Paramètres.
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

          {step < 4 ? (
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
