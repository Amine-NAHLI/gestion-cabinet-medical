"use client";

import { useState } from "react";
import { transformAppointmentToVisit } from "@/actions/appointments";

export default function TransformAppointmentButton({ appointmentId, patientId }: { appointmentId: number, patientId: number }) {
  const [loading, setLoading] = useState(false);

  async function handleTransform() {
    setLoading(true);
    await transformAppointmentToVisit(appointmentId, patientId);
    setLoading(false);
  }

  return (
    <button 
      onClick={handleTransform}
      disabled={loading}
      className="bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-600 hover:text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
      title="Transférer vers la salle d'attente d'aujourd'hui"
    >
      <span className="material-symbols-outlined text-sm">login</span>
      {loading ? "Transfert..." : "Faire patienter (Aujourd'hui)"}
    </button>
  );
}
