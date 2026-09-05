"use client";

import { useState } from "react";
import { updateMedicalNotes, savePrescription, finishConsultation } from "@/actions/consultation";
import { createAppointment } from "@/actions/appointments";
import MedicalAutocomplete from "@/components/MedicalAutocomplete";
import PrescriptionPDF from "@/components/PrescriptionPDF";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface ConsultationClientProps {
  visitId: number;
  initialData: {
    id: number;
    patientId: number;
    disease?: string | null;
    diagnosis?: string | null;
    notes?: string | null;
    amountToPay?: string | null;
    [key: string]: unknown;
  };
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    age: number;
    phone: string;
    mutuelle?: string | null;
    [key: string]: unknown;
  };
  hasPrescription: boolean;
  initialMedicines?: { name: string; instructions: string }[];
}

export default function ConsultationClient({ visitId, initialData, patient, hasPrescription, initialMedicines = [] }: ConsultationClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dossier' | 'ordonnance' | 'cloture'>('dossier');
  const [medicines, setMedicines] = useState<{ name: string; instructions: string }[]>(initialMedicines);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Handlers pour le dossier
  async function handleSaveDossier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateMedicalNotes(visitId, formData);
    showToast("Dossier médical enregistré avec succès");
    setActiveTab('ordonnance');
  }

  // Handlers pour l'ordonnance
  function addMedicine() {
    setMedicines([...medicines, { name: "", instructions: "" }]);
  }

  function updateMedicine(index: number, field: 'name' | 'instructions', value: string) {
    const newMeds = [...medicines];
    newMeds[index][field] = value;
    setMedicines(newMeds);
  }

  async function handleSavePrescription() {
    if (medicines.length > 0) {
      await savePrescription(visitId, medicines);
      showToast("Ordonnance prête. Impression du document...");
      
      setTimeout(() => {
        window.print();
        setActiveTab('cloture');
      }, 500);
    } else {
      setActiveTab('cloture');
    }
  }

  // Handlers pour la clôture
  async function handleFinish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      
      const nextDate = formData.get("nextAppointment") as string;
      if (nextDate) {
        await createAppointment(initialData.patientId, nextDate);
      }

      const amountRaw = (formData.get("amount") as string || "").trim();
      const amount = amountRaw !== "" && !isNaN(Number(amountRaw)) && Number(amountRaw) > 0 ? Number(amountRaw) : null;
      
      await finishConsultation(visitId, amount);
      router.push("/dashboard/history");
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Erreur lors de la clôture:", err);
      alert("Une erreur est survenue lors de la clôture : " + errorMsg);
    }
  }

  const tabs = [
    { id: 'dossier', label: '1. Examen & Diagnostic', icon: 'stethoscope' },
    { id: 'ordonnance', label: '2. Prescription Médicale', icon: 'prescriptions' },
    { id: 'cloture', label: '3. Honoraires & Clôture', icon: 'payments' },
  ] as const;

  return (
    <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-slate-900/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2.5 border border-slate-700/60">
              <span className="material-symbols-outlined text-teal-400 text-base">check_circle</span>
              <span className="font-semibold text-xs tracking-wide">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Tabs Bar */}
      <div className="flex border-b border-slate-100 bg-slate-50/40 p-2 gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                isActive 
                  ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-6 sm:p-8">
        
        {/* TAB 1 : DOSSIER */}
        {activeTab === 'dossier' && (
          <form onSubmit={handleSaveDossier} className="space-y-6 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Motif de consultation / Symptômes
              </label>
              <input 
                type="text" 
                name="disease" 
                defaultValue={initialData.disease || ""} 
                placeholder="Ex: Céphalées aiguës, Contrôle annuel, Bilan..." 
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Diagnostic & Examen Clinique
              </label>
              <textarea 
                name="diagnosis" 
                rows={3} 
                defaultValue={initialData.diagnosis || ""} 
                placeholder="Observations cliniques, auscultation, conclusions du praticien..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all resize-y" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Constantes & Notes Personnelles (Confidentiel)
              </label>
              <textarea 
                name="notes" 
                rows={2} 
                defaultValue={initialData.notes || ""} 
                placeholder="Tension artérielle, saturation, poids, antécédents pertinents..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all resize-y" 
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit" 
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-7 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md hover:shadow-sky-600/25 transition-all cursor-pointer"
              >
                <span>Enregistrer & Prescription</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </motion.button>
            </div>
          </form>
        )}

        {/* TAB 2 : ORDONNANCE */}
        {activeTab === 'ordonnance' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {hasPrescription && medicines.length === 0 ? (
              <div className="p-4 bg-sky-50/80 border border-sky-200/80 text-sky-800 text-xs font-medium rounded-2xl flex items-center gap-2">
                <span className="material-symbols-outlined text-base">info</span>
                Une prescription médicale a déjà été enregistrée pour cette visite.
              </div>
            ) : null}

            <div className="space-y-3.5">
              {medicines.map((med, i) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1 w-full">
                    <MedicalAutocomplete 
                      value={med.name} 
                      onChange={(val) => updateMedicine(i, 'name', val)} 
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Posologie & Instructions
                    </label>
                    <input 
                      type="text" 
                      value={med.instructions} 
                      onChange={e => updateMedicine(i, 'instructions', e.target.value)} 
                      placeholder="Ex: 1 comprimé 3x/jour après les repas pendant 7 jours" 
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all" 
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setMedicines(medicines.filter((_, idx) => idx !== i))} 
                    className="self-end sm:self-center p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" 
                    title="Supprimer cette ligne"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              ))}
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={addMedicine} 
              className="inline-flex items-center gap-2 text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/60 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Ajouter un médicament
            </motion.button>

            <div className="flex flex-col sm:flex-row justify-end items-center gap-3 border-t border-slate-100 pt-6">
              <button 
                type="button"
                onClick={() => setActiveTab('cloture')} 
                className="px-5 py-2.5 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Passer sans ordonnance
              </button>
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={handleSavePrescription} 
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-7 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md hover:shadow-sky-600/25 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">print</span>
                Valider & Imprimer l&apos;Ordonnance
              </motion.button>
            </div>
          </div>
        )}

        {/* TAB 3 : CLOTURE */}
        {activeTab === 'cloture' && (
          <form onSubmit={handleFinish} className="max-w-lg mx-auto space-y-8 animate-in fade-in duration-200">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-2xl">payments</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Tarification & Honoraires</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Indiquez le tarif de la consultation qui sera automatiquement transmis à l&apos;assistante pour encaissement.
              </p>
            </div>
            
            <div className="relative max-w-xs mx-auto">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-lg font-mono">
                DH
              </span>
              <input 
                type="number" 
                name="amount" 
                autoComplete="off" 
                placeholder="Montant" 
                step="10" 
                className="w-full pl-14 pr-4 py-4 text-3xl font-extrabold text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none text-center transition-all" 
              />
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Programmer un prochain rendez-vous (Optionnel)
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  name="nextAppointment" 
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all" 
                />
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit" 
              className="w-full bg-teal-600 hover:bg-teal-500 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md hover:shadow-teal-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>Confirmer & Clôturer la Consultation</span>
            </motion.button>
          </form>
        )}
      </div>

      {/* Composant d'impression invisible à l'écran */}
      <PrescriptionPDF patient={patient} medicines={medicines} date={new Date()} />
    </div>
  );
}
