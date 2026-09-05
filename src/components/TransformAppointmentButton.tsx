"use client";

import { useState } from "react";
import { transformAppointmentToVisit } from "@/actions/appointments";
import { motion } from "framer-motion";

export default function TransformAppointmentButton({ appointmentId, patientId }: { appointmentId: number, patientId: number }) {
  const [loading, setLoading] = useState(false);

  async function handleTransform() {
    setLoading(true);
    await transformAppointmentToVisit(appointmentId, patientId);
    setLoading(false);
  }

  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleTransform}
      disabled={loading}
      className="bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-600 hover:text-white text-indigo-700 px-4 py-2 rounded-xl font-bold text-xs tracking-wide uppercase transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
      title="Transférer vers la salle d'attente d'aujourd'hui"
    >
      <span className="material-symbols-outlined text-base">login</span>
      {loading ? "Transfert..." : "Admettre aujourd'hui"}
    </motion.button>
  );
}
