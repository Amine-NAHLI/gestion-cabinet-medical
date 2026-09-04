"use client";

import { sendPatientToDoctor } from "@/actions/patients";
import { useState } from "react";

export default function SendToDoctorButton({ visitId }: { visitId: number }) {
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    await sendPatientToDoctor(visitId);
    setLoading(false);
  }

  return (
    <button 
      onClick={handleSend}
      disabled={loading}
      className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-sm">send</span>
      {loading ? "Envoi..." : "Faire entrer"}
    </button>
  );
}
