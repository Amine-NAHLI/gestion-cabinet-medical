"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { adminUpdateClinic } from "@/actions/admin";

interface AdminClinicEditModalProps {
  clinic: {
    id: number;
    name: string;
    slug?: string | null;
    city: string;
    address?: string | null;
    phone?: string | null;
    primaryColor?: string | null;
    isCommunityMember?: boolean | null;
    status?: string | null;
  } | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  showFeedback: (type: "success" | "error", message: string) => void;
}

export default function AdminClinicEditModal({
  clinic,
  onClose,
  onSaved,
  showFeedback,
}: AdminClinicEditModalProps) {
  const [formData, setFormData] = useState({
    name: clinic?.name || "",
    slug: clinic?.slug || "",
    city: clinic?.city || "",
    address: clinic?.address || "",
    phone: clinic?.phone || "",
    primaryColor: clinic?.primaryColor || "#0f172a",
    isCommunityMember: clinic?.isCommunityMember ?? true,
    status: (clinic?.status as any) || "active",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!clinic) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res: any = await adminUpdateClinic(clinic.id, {
        name: formData.name,
        slug: formData.slug || undefined,
        city: formData.city,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        primaryColor: formData.primaryColor,
        isCommunityMember: formData.isCommunityMember,
        status: formData.status,
      });

      if (res?.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback("success", res.message || "Cabinet mis à jour.");
        await onSaved();
        onClose();
      }
    } catch {
      showFeedback("error", "Erreur lors de la mise à jour du cabinet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative z-10 w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                Modifier le Cabinet #{clinic.id}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{clinic.name}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nom du Cabinet *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Sous-domaine / Slug (ex: amine)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ville *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Adresse</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Couleur principale (HEX)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-slate-200 p-0.5 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="active">Actif</option>
                  <option value="suspended">Suspendu</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isCommunityMember}
                  onChange={(e) =>
                    setFormData({ ...formData, isCommunityMember: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                />
                <span className="text-xs font-medium text-slate-700">
                  Membre actif du réseau confraternel (Communauté Médicale)
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer le cabinet"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
