"use client";

import { useState } from "react";
import { processPayment } from "@/actions/payment";
import { createAppointment } from "@/actions/appointments";
import ReceiptPDF from "@/components/ReceiptPDF";
import PrescriptionPDF from "@/components/PrescriptionPDF";

interface PaymentButtonProps {
  visitId: number;
  patientId: number;
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
  prescriptionMedicines?: { name: string; instructions: string }[];
  upcomingAppointment?: { date: string; time: string; reason: string } | null;
}

export default function PaymentButton({
  visitId,
  patientId,
  initialAmount,
  patient,
  settings,
  prescriptionMedicines = [],
  upcomingAppointment = null,
}: PaymentButtonProps) {
  const defaultClinicFee = settings?.defaultFee
    ? String(parseFloat(String(settings.defaultFee)))
    : "250";

  // États Paiement
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState<string>(
    initialAmount ? String(initialAmount) : defaultClinicFee
  );
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [isSuccess, setIsSuccess] = useState(false);

  // États Impression
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [isPrintingPrescription, setIsPrintingPrescription] = useState(false);

  // États Rendez-vous
  const [currentRdv, setCurrentRdv] = useState<{
    date: string;
    time: string;
    reason: string;
  } | null>(upcomingAppointment);
  const [isRdvModalOpen, setIsRdvModalOpen] = useState(false);
  const [rdvDate, setRdvDate] = useState("");
  const [rdvTime, setRdvTime] = useState("10:00");
  const [rdvReason, setRdvReason] = useState("Consultation de contrôle");
  const [isSubmittingRdv, setIsSubmittingRdv] = useState(false);

  // Exécution du paiement
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

  // Impression de la quittance / Reçu mutuelle
  function handlePrintReceipt() {
    setIsPrintingReceipt(true);
    const cleanup = () => {
      setIsPrintingReceipt(false);
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
    }, 120);
  }

  // Impression de l'ordonnance rédigée par le médecin
  function handlePrintPrescription() {
    setIsPrintingPrescription(true);
    const cleanup = () => {
      setIsPrintingPrescription(false);
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
    }, 120);
  }

  // Raccourcis de date pour le rendez-vous
  function setRdvShortcutDays(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    // Format YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setRdvDate(`${yyyy}-${mm}-${dd}`);
  }

  // Enregistrer le rendez-vous
  async function handleSaveRdv(e: React.FormEvent) {
    e.preventDefault();
    if (!rdvDate) {
      alert("Veuillez sélectionner une date de rendez-vous.");
      return;
    }

    setIsSubmittingRdv(true);
    try {
      const res = await createAppointment(patientId, rdvDate, rdvTime, rdvReason);
      setIsSubmittingRdv(false);
      if (res.success) {
        setCurrentRdv({
          date: rdvDate,
          time: rdvTime,
          reason: rdvReason,
        });
        setIsRdvModalOpen(false);
      } else {
        alert(res.error || "Erreur lors de la prise de rendez-vous.");
      }
    } catch {
      setIsSubmittingRdv(false);
      alert("Erreur lors de la prise de rendez-vous.");
    }
  }

  const hasPrescription = prescriptionMedicines.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 1. BOUTON / STATUT RENDEZ-VOUS */}
      {currentRdv ? (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-2xs"
          title={`Rendez-vous : ${currentRdv.reason}`}
        >
          <span className="material-symbols-outlined text-[15px] text-emerald-600">
            event_available
          </span>
          <span>
            RDV :{" "}
            {new Date(currentRdv.date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}{" "}
            à {currentRdv.time}
          </span>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (!rdvDate) setRdvShortcutDays(7);
            setIsRdvModalOpen(true);
          }}
          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          title="Donner un rendez-vous de suivi ou de contrôle à ce patient"
        >
          <span className="material-symbols-outlined text-[16px] text-amber-700">
            calendar_add_on
          </span>
          <span>Donner un RDV</span>
        </button>
      )}

      {/* 2. BOUTON IMPRIMER L'ORDONNANCE */}
      {hasPrescription ? (
        <button
          type="button"
          onClick={handlePrintPrescription}
          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          title={`Imprimer l'ordonnance (${prescriptionMedicines.length} médicaments)`}
        >
          <span className="material-symbols-outlined text-[16px] text-sky-700">print</span>
          <span>Imprimer Ordonnance ({prescriptionMedicines.length})</span>
        </button>
      ) : (
        <span className="text-[11px] text-slate-400 font-medium px-2 py-1">
          Sans ordonnance
        </span>
      )}

      {/* 3. ENCAISSEMENT & RÈGLEMENT */}
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

      {/* 4. MODALE DONNER UN RENDEZ-VOUS */}
      {isRdvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-amber-600">
                    calendar_add_on
                  </span>
                  <span>Fixer le prochain rendez-vous</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Patient(e) : <strong>{patient.lastName} {patient.firstName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRdvModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveRdv} className="space-y-4">
              {/* Raccourcis rapides */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Délais fréquents
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRdvShortcutDays(7)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer text-center"
                  >
                    Dans 7 jours
                  </button>
                  <button
                    type="button"
                    onClick={() => setRdvShortcutDays(15)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer text-center"
                  >
                    Dans 15 jours
                  </button>
                  <button
                    type="button"
                    onClick={() => setRdvShortcutDays(30)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer text-center"
                  >
                    Dans 1 mois
                  </button>
                </div>
              </div>

              {/* Sélection Date & Heure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date du RDV *
                  </label>
                  <input
                    type="date"
                    required
                    value={rdvDate}
                    onChange={(e) => setRdvDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Heure *
                  </label>
                  <select
                    value={rdvTime}
                    onChange={(e) => setRdvTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 bg-white"
                  >
                    {[
                      "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
                      "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Motif */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motif du rendez-vous
                </label>
                <input
                  type="text"
                  value={rdvReason}
                  onChange={(e) => setRdvReason(e.target.value)}
                  placeholder="Ex: Contrôle post-traitement, Bilan sanguin..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                />
              </div>

              {/* Actions modale */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRdvModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRdv || !rdvDate}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  <span>{isSubmittingRdv ? "Enregistrement..." : "Confirmer le RDV"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Impression Invisible Reçu Mutuelle */}
      {isPrintingReceipt && (
        <ReceiptPDF
          patient={patient}
          amount={initialAmount || amount}
          paymentMethod={paymentMethod}
          date={new Date()}
          visitId={visitId}
          settings={settings}
        />
      )}

      {/* Impression Invisible Ordonnance Médecin */}
      {isPrintingPrescription && (
        <PrescriptionPDF
          patient={{
            firstName: patient.firstName,
            lastName: patient.lastName,
            age: patient.age || 0,
            phone: patient.phone,
            mutuelle: patient.mutuelle,
            cin: patient.cin,
          }}
          medicines={prescriptionMedicines}
          date={new Date()}
          settings={settings}
        />
      )}
    </div>
  );
}
