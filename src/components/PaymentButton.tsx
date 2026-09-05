"use client";

import { useState } from "react";
import { processPayment } from "@/actions/payment";
import { motion } from "framer-motion";

export default function PaymentButton({ visitId, initialAmount }: { visitId: number, initialAmount: string | null }) {
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState<string>("");

  async function handlePayment() {
    if (!initialAmount && !amount) {
      alert("Veuillez saisir le montant payé.");
      return;
    }
    setIsLoading(true);
    await processPayment(visitId, initialAmount ? undefined : parseInt(amount));
  }

  return (
    <div className="flex items-center gap-3">
      {!initialAmount && (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
            DH
          </span>
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant"
            className="w-28 pl-9 pr-3 py-2 text-xs font-bold text-slate-800 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition-all"
          />
        </div>
      )}
      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handlePayment} 
        disabled={isLoading}
        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all shadow-xs hover:shadow-md hover:shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          "En cours..."
        ) : (
          <>
            <span className="material-symbols-outlined text-base">payments</span>
            Encaisser
          </>
        )}
      </motion.button>
    </div>
  );
}
