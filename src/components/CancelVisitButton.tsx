"use client";

import { useState } from "react";
import { cancelVisit } from "@/actions/patients";

export default function CancelVisitButton({ visitId }: { visitId: number }) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("Voulez-vous retirer ce patient de la file d'attente ?")) return;
    setLoading(true);
    await cancelVisit(visitId);
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={loading}
      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer disabled:opacity-50"
      title="Retirer de la file (patient parti ou annulé)"
    >
      <span className="material-symbols-outlined text-base">close</span>
    </button>
  );
}
