"use client";

import { useState, useTransition } from "react";
import { completeAssistantOnboarding } from "@/actions/onboarding-wizard";

interface AssistantOnboardingModalProps {
  assistantName: string;
  clinicName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssistantOnboardingModal({
  assistantName,
  clinicName,
  isOpen,
  onClose,
}: AssistantOnboardingModalProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 400;
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
          setAvatarUrl(canvas.toDataURL("image/webp", 0.88));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await completeAssistantOnboarding({ avatarUrl });
      if (res.success) {
        onClose();
      } else {
        setError(res.error || "Erreur lors de la validation");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-2">
            <span className="material-symbols-outlined text-2xl">waving_hand</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Bienvenue, {assistantName} !
          </h2>
          <p className="text-xs text-slate-500">
            Espace d&apos;accueil et secrétariat de <strong>{clinicName}</strong>.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-xs text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {/* Upload Avatar */}
        <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
          <div className="w-20 h-20 rounded-full border-2 border-white shadow-sm bg-slate-200 overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-3xl text-slate-400">person</span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800">Votre photo de profil</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Visible par le médecin sur l&apos;interphone et dans votre espace.
            </p>
          </div>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 cursor-pointer transition shadow-2xs">
            <span className="material-symbols-outlined text-sm">photo_camera</span>
            <span>{avatarUrl ? "Changer la photo" : "Ajouter ma photo"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={handleConfirm}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>{isPending ? "Enregistrement..." : "Accéder à la salle d'attente"}</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
