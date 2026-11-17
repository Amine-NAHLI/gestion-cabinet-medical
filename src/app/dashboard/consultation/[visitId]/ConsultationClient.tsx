"use client";

import { useState } from "react";
import { updateMedicalNotes, savePrescription, finishConsultation } from "@/actions/consultation";
import { createAppointment } from "@/actions/appointments";
import MedicalAutocomplete from "@/components/MedicalAutocomplete";
import PrescriptionPDF from "@/components/PrescriptionPDF";
import ReceiptPDF from "@/components/ReceiptPDF";
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
    bloodPressure?: string | null;
    heartRate?: number | null;
    temperature?: string | null;
    weight?: string | null;
    height?: string | null;
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
    cin?: string | null;
    bloodGroup?: string | null;
    allergies?: string | null;
    antecedents?: string | null;
    [key: string]: unknown;
  };
  hasPrescription: boolean;
  initialMedicines?: { name: string; instructions: string }[];
  settings?: any;
}

export default function ConsultationClient({
  visitId,
  initialData,
  patient,
  hasPrescription,
  initialMedicines = [],
  settings,
}: ConsultationClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dossier' | 'ordonnance' | 'cloture'>('dossier');
  const [medicines, setMedicines] = useState<{ name: string; instructions: string }[]>(initialMedicines);
  const [weight, setWeight] = useState<string>(initialData.weight ? String(initialData.weight) : "");
  const [height, setHeight] = useState<string>(initialData.height ? String(initialData.height) : "");
  const [amount, setAmount] = useState<string>(
    initialData.amountToPay ? String(initialData.amountToPay) : (settings?.defaultFee ? String(settings.defaultFee) : "250")
  );
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Calcul dynamique de l'IMC
  const bmi = (() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return null;
  })();

  // Handlers pour le dossier
  async function handleSaveDossier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateMedicalNotes(visitId, formData);
    showToast("Examen clinique enregistré avec succès");
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

  async function handleSavePrescription(shouldPrint: boolean = false) {
    if (medicines.length > 0) {
      await savePrescription(visitId, medicines);
      if (shouldPrint) {
        showToast("Impression de l'ordonnance en cours...");
        setTimeout(() => {
          window.print();
          setActiveTab('cloture');
        }, 300);
      } else {
        showToast("Ordonnance enregistrée");
        setActiveTab('cloture');
      }
    } else {
      setActiveTab('cloture');
    }
  }

  // Handlers pour la clôture
  async function handleFinish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsFinishing(true);
    try {
      const formData = new FormData(e.currentTarget);
      
      const nextDate = formData.get("nextAppointment") as string;
      const nextTime = (formData.get("nextAppointmentTime") as string || "09:30").trim();
      if (nextDate) {
        await createAppointment(patient.id, nextDate, nextTime, "Consultation de contrôle");
      }

      const parsedAmount = amount.trim() !== "" && !isNaN(Number(amount)) && Number(amount) >= 0 
        ? Number(amount) 
        : null;
      
      await finishConsultation(visitId, parsedAmount, paymentMethod);
      router.push("/dashboard/history");
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Erreur clôture:", err);
      alert("Erreur lors de la clôture : " + errorMsg);
      setIsFinishing(false);
    }
  }

  const tabs = [
    { id: 'dossier', label: '1. Examen & Constantes', icon: 'stethoscope' },
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

      {/* Alerte Allergies & Antécédents si renseignés */}
      {(patient.allergies || patient.antecedents) && (
        <div className="p-3.5 bg-amber-50 border-b border-amber-200/70 flex items-center justify-between px-6 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-lg">warning</span>
            <span className="font-bold">Alerte Clinique :</span>
            {patient.allergies && (
              <span className="font-medium">Allergies : <strong>{patient.allergies}</strong></span>
            )}
            {patient.allergies && patient.antecedents && <span>•</span>}
            {patient.antecedents && (
              <span className="font-medium">Antécédents : <strong>{patient.antecedents}</strong></span>
            )}
          </div>
          {patient.bloodGroup && (
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-black text-[10px]">
              Groupe {patient.bloodGroup}
            </span>
          )}
        </div>
      )}

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
        
        {/* TAB 1 : DOSSIER & CONSTANTES */}
        {activeTab === 'dossier' && (
          <form onSubmit={handleSaveDossier} className="space-y-6 animate-in fade-in duration-200">
            {/* Constantes vitales */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-sky-600">vital_signs</span>
                Constantes Vitales du Patient
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tension (mmHg)
                  </span>
                  <input
                    type="text"
                    name="bloodPressure"
                    defaultValue={initialData.bloodPressure || ""}
                    placeholder="Ex: 12/8"
                    className="w-full px-3 py-2 text-xs font-bold bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Pouls (bpm)
                  </span>
                  <input
                    type="number"
                    name="heartRate"
                    defaultValue={initialData.heartRate || ""}
                    placeholder="Ex: 72"
                    className="w-full px-3 py-2 text-xs font-bold bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Température (°C)
                  </span>
                  <input
                    type="text"
                    name="temperature"
                    defaultValue={initialData.temperature ? String(initialData.temperature) : ""}
                    placeholder="37.2"
                    className="w-full px-3 py-2 text-xs font-bold bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Poids (kg)
                  </span>
                  <input
                    type="text"
                    name="weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70"
                    className="w-full px-3 py-2 text-xs font-bold bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Taille (cm) {bmi && <span className="text-sky-600 font-extrabold">(IMC: {bmi})</span>}
                  </span>
                  <input
                    type="text"
                    name="height"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="175"
                    className="w-full px-3 py-2 text-xs font-bold bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Motif de consultation / Symptômes
              </label>
              <input 
                type="text" 
                name="disease" 
                defaultValue={initialData.disease || ""} 
                placeholder="Ex: Céphalées aiguës, Contrôle annuel, Bilan respiratoire..." 
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
                Notes Personnelles & Recommandations (Confidentiel)
              </label>
              <textarea 
                name="notes" 
                rows={2} 
                defaultValue={initialData.notes || ""} 
                placeholder="Notes de suivi, examens complémentaires demandés..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all resize-y" 
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button 
                type="submit" 
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-7 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md hover:shadow-sky-600/25 transition-all cursor-pointer"
              >
                <span>Enregistrer & Passer à l'Ordonnance</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2 : ORDONNANCE MÉDICALE */}
        {activeTab === 'ordonnance' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <p className="text-xs text-slate-500">
                Ajoutez les médicaments prescrits. Tapez les premières lettres pour rechercher dans la nomenclature marocaine.
              </p>
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200/60">
                {medicines.length} médicament{medicines.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3.5">
              {medicines.map((med, i) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1 w-full">
                    <MedicalAutocomplete 
                      value={med.name} 
                      onChange={(val) => updateMedicine(i, 'name', val)} 
                      onSelectInstruction={(inst) => updateMedicine(i, 'instructions', inst)}
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all font-medium" 
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
            
            <button 
              type="button"
              onClick={addMedicine} 
              className="inline-flex items-center gap-2 text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/60 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Ajouter une ligne
            </button>

            <div className="flex flex-col sm:flex-row justify-end items-center gap-3 border-t border-slate-100 pt-6">
              <button 
                type="button"
                onClick={() => setActiveTab('cloture')} 
                className="px-5 py-2.5 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Passer sans ordonnance
              </button>
              <button 
                type="button"
                onClick={() => handleSavePrescription(false)} 
                className="px-5 py-2.5 text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Enregistrer sans imprimer
              </button>
              <button 
                type="button"
                onClick={() => handleSavePrescription(true)} 
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-7 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md hover:shadow-sky-600/25 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">print</span>
                Valider & Imprimer l'Ordonnance
              </button>
            </div>
          </div>
        )}

        {/* TAB 3 : TARIFICATION & CLÔTURE */}
        {activeTab === 'cloture' && (
          <form onSubmit={handleFinish} className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-2xl">payments</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Honoraires & Clôture de l'Acte</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Fixez le tarif de la consultation qui sera transmis à l'accueil pour encaissement et édition de la quittance.
              </p>
            </div>
            
            {/* Montant des honoraires */}
            <div className="relative max-w-xs mx-auto">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg font-mono">
                DH
              </span>
              <input 
                type="number" 
                name="amount" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoComplete="off" 
                placeholder="Montant" 
                step="10" 
                className="w-full pl-14 pr-4 py-4 text-3xl font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none text-center transition-all" 
              />
            </div>

            {/* Mode de règlement souhaité */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                Mode de Paiement Prévu
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "cash", label: "Espèces", icon: "payments" },
                  { id: "card", label: "Carte (TPE)", icon: "credit_card" },
                  { id: "check", label: "Chèque", icon: "fact_check" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? "bg-teal-50 border-teal-500 text-teal-800 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prochain rendez-vous de contrôle */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Programmer un contrôle ou prochain rendez-vous (Optionnel)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="date" 
                  name="nextAppointment" 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none" 
                />
                <input 
                  type="time" 
                  name="nextAppointmentTime" 
                  defaultValue="10:00"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isFinishing}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md hover:shadow-teal-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>{isFinishing ? "Clôture en cours..." : "Confirmer & Clôturer la Consultation"}</span>
            </button>
          </form>
        )}
      </div>

      {/* Impression Invisible Ordonnance */}
      <PrescriptionPDF 
        patient={patient} 
        medicines={medicines} 
        date={new Date()} 
        settings={settings}
      />
    </div>
  );
}
