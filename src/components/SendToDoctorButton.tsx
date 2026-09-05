"use client";

import { sendPatientToDoctor } from "@/actions/patients";
import { useState } from "react";
import { motion } from "framer-motion";

export default function SendToDoctorButton({ visitId }: { visitId: number }) {
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    await sendPatientToDoctor(visitId);
    setLoading(false);
  }

  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleSend}
      disabled={loading}
      className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide uppercase transition-all shadow-xs hover:shadow-md hover:shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
    >
      <span className="material-symbols-outlined text-base">login</span>
      {loading ? "Envoi..." : "Faire entrer"}
    </motion.button>
  );
}
