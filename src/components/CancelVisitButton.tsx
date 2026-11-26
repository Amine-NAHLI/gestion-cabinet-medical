"use client";

import { useState } from "react";
import { cancelVisit } from "@/actions/patients";
import { useRouter } from "next/navigation";

interface CancelVisitButtonProps {
  visitId: number;
  patientName?: string;
  variant?: "icon" | "button";
  className?: string;
}

export default function CancelVisitButton({
  visitId,
  patientName,
  variant = "icon",
  className = "",
}: CancelVisitButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCancel() {
    const nameStr = patientName ? ` (${patientName})` : "";
    if (
      !confirm(
        `Voulez-vous retirer ce patient${nameStr} de la file d'attente ?\nLa visite sera annulée sans être facturée.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await cancelVisit(visitId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleCancel}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 hover:border-rose-300 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 ${className}`}
        title="Retirer le patient de la file (patient parti ou admission annulée)"
      >
        <span
          className={`material-symbols-outlined text-[16px] text-rose-500 shrink-0 ${
            loading ? "animate-spin" : ""
          }`}
        >
          {loading ? "progress_activity" : "person_remove"}
        </span>
        <span className="whitespace-nowrap">{loading ? "Retrait..." : "Retirer de la file"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={loading}
      className={`p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center shrink-0 ${className}`}
      title="Retirer de la file d'attente (patient parti ou annulé)"
    >
      <span
        className={`material-symbols-outlined text-[18px] shrink-0 ${
          loading ? "animate-spin text-rose-500" : ""
        }`}
      >
        {loading ? "progress_activity" : "close"}
      </span>
    </button>
  );
}
