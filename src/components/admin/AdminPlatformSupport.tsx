"use client";

import { useState } from "react";
import { updatePlatformSettings, PlatformSettingsData } from "@/actions/platform";

interface AdminPlatformSupportProps {
  initialSettings?: PlatformSettingsData;
  onSaved?: () => void;
  showFeedback: (type: "success" | "error", message: string) => void;
}

export default function AdminPlatformSupport({
  initialSettings,
  onSaved,
  showFeedback,
}: AdminPlatformSupportProps) {
  const [formData, setFormData] = useState<PlatformSettingsData>({
    supportWhatsapp: initialSettings?.supportWhatsapp || "+212600000000",
    supportWhatsappMessage:
      initialSettings?.supportWhatsappMessage ||
      "Bonjour, je vous contacte concernant l'abonnement de mon cabinet MonCabinet.",
    supportEmail: initialSettings?.supportEmail || "contact@toncabinet.me",
    supportPhone: initialSettings?.supportPhone || "+212600000000",
  });
  const [isSaving, setIsSaving] = useState(false);

  const cleanWhatsappNumber = formData.supportWhatsapp.replace(/[^0-9]/g, "");
  const testWhatsappUrl = `https://wa.me/${cleanWhatsappNumber}?text=${encodeURIComponent(
    formData.supportWhatsappMessage
  )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await updatePlatformSettings(formData);
      if (res?.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback("success", res?.message || "Configuration du support enregistrée avec succès !");
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      showFeedback("error", err?.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* En-tête */}
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Support & Configuration Plateforme</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
            Temps Réel
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Gérez le canal WhatsApp officiel et les coordonnées d'assistance affichés aux médecins et assistantes sur leurs tableaux de bord.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* CARTE 1 : LIGNE WHATSAPP OFFICIELLE */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">chat</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ligne Support Direct WhatsApp</h3>
                <p className="text-xs text-slate-500">
                  Numéro officiel sur lequel les praticiens basculent pour le support prioritaire et les règlements.
                </p>
              </div>
            </div>

            <a
              href={testWhatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition"
              title="Ouvrir un onglet test WhatsApp"
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              <span>Tester le lien</span>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Numéro WhatsApp (Format international) *
              </label>
              <input
                type="text"
                value={formData.supportWhatsapp}
                onChange={(e) => setFormData((prev) => ({ ...prev, supportWhatsapp: e.target.value }))}
                placeholder="+212600000000"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">Exemple : +212612345678 (sans espaces)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Message d'amorce pré-rempli
              </label>
              <input
                type="text"
                value={formData.supportWhatsappMessage}
                onChange={(e) => setFormData((prev) => ({ ...prev, supportWhatsappMessage: e.target.value }))}
                placeholder="Message qui apparaîtra chez le médecin"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">Sera pré-rempli dans la discussion WhatsApp</p>
            </div>
          </div>
        </div>

        {/* CARTE 2 : COORDONNÉES COMPLÉMENTAIRES */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">contact_support</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Coordonnées Générales de la Plateforme</h3>
              <p className="text-xs text-slate-500">
                Email officiel et ligne téléphonique de secours visibles sur l'application.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Officiel Support *
              </label>
              <input
                type="email"
                value={formData.supportEmail}
                onChange={(e) => setFormData((prev) => ({ ...prev, supportEmail: e.target.value }))}
                placeholder="support@toncabinet.me"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Téléphone d'assistance directe
              </label>
              <input
                type="text"
                value={formData.supportPhone}
                onChange={(e) => setFormData((prev) => ({ ...prev, supportPhone: e.target.value }))}
                placeholder="+212522000000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 transition"
              />
            </div>
          </div>
        </div>

        {/* Action de sauvegarde */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Enregistrement en cours...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[17px]">save</span>
                <span>Enregistrer la Configuration Plateforme</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
