"use client";

import { useState } from "react";
import { processPayment } from "@/actions/payment";
import ReceiptPDF from "@/components/ReceiptPDF";

interface PaymentButtonProps {
  visitId: number;
  initialAmount: string | null;
  patient: {
    firstName: string;
    lastName: string;
    age?: number;
    phone?: string;
    mutuelle?: string | null;
    cin?: string | null;
  };
  settings?: any;
}

export default function PaymentButton({ visitId, initialAmount, patient, settings }: PaymentButtonProps) {
  const defaultClinicFee = settings?.defaultFee
    ? String(parseFloat(String(settings.defaultFee)))
    : "250";
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState<string>(initialAmount ? String(initialAmount) : defaultClinicFee);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  async function handlePayment() {
    const finalAmount = initialAmount ? parseFloat(initialAmount) : parseFloat(amount);
    if (isNaN(finalAmount)) {
      alert("Veuillez saisir un montant valide.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await processPayment(visitId, finalAmount, paymentMethod);
      setIsLoading(false);
      if (res?.success) {
        setIsSuccess(true);
      }
    } catch {
      setIsLoading(false);
    }
  }

  function handlePrintReceipt() {
    setIsPrinting(true);
    const cleanup = () => {
      setIsPrinting(false);
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
    }, 120);
  }

  return (
    <div className="flex items-center gap-2">
      {!initialAmount && !isSuccess && (
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-mono">
            DH
          </span>
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant"
            className="w-24 pl-8 pr-2 py-1.5 text-xs font-bold text-slate-800 rounded-xl border border-slate-200 bg-white focus:outline-none"
          />
        </div>
      )}

      {!isSuccess && (
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="text-[11px] font-semibold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700"
        >
          <option value="cash">Espèces</option>
          <option value="card">Carte (TPE)</option>
          <option value="check">Chèque</option>
          <option value="insurance">Tiers-payant</option>
          <option value="free">Gratuit</option>
        </select>
      )}

      {isSuccess ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
            Encaissé
          </span>
          <button
            type="button"
            onClick={handlePrintReceipt}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Imprimer la quittance pour la mutuelle"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Reçu Mutuelle
          </button>
        </div>
      ) : (
        <button 
          onClick={handlePayment} 
          disabled={isLoading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">payments</span>
          {isLoading ? "Enregistrement..." : "Encaisser"}
        </button>
      )}

      {/* Impression Invisible Reçu (monté uniquement pour le patient sélectionné) */}
      {isPrinting && (
        <ReceiptPDF
          patient={patient}
          amount={initialAmount || amount}
          paymentMethod={paymentMethod}
          date={new Date()}
          visitId={visitId}
          settings={settings}
        />
      )}
    </div>
  );
}
