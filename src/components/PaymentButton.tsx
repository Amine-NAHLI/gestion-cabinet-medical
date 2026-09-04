"use client";

import { useState } from "react";
import { processPayment } from "@/actions/payment";

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
    // L'action revalidatePath mettra à jour l'UI automatiquement
  }

  return (
    <div className="flex items-center gap-3">
      {!initialAmount && (
        <input 
          type="number" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Montant (DH)"
          className="w-32 px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
      )}
      <button 
        onClick={handlePayment} 
        disabled={isLoading}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
      >
        {isLoading ? "En cours..." : (
          <>
            <span className="material-symbols-outlined text-sm">payments</span>
            Encaisser
          </>
        )}
      </button>
    </div>
  );
}
