"use client";

import { useState } from "react";
import { updateMedicalNotes, savePrescription, finishConsultation } from "@/actions/consultation";
import { createAppointment } from "@/actions/appointments";
import { useRouter } from "next/navigation";
import MedicalAutocomplete from "@/components/MedicalAutocomplete";
import PrescriptionPDF from "@/components/PrescriptionPDF";

export default function ConsultationClient({ visitId, initialData, patient, hasPrescription, initialMedicines = [] }: { visitId: number, initialData: any, patient: any, hasPrescription: boolean, initialMedicines?: { name: string; instructions: string }[] }) {
  const [activeTab, setActiveTab] = useState<'dossier' | 'ordonnance' | 'cloture'>('dossier');
  const [medicines, setMedicines] = useState<{ name: string; instructions: string }[]>(initialMedicines);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const router = useRouter();

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Handlers pour le dossier
  async function handleSaveDossier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateMedicalNotes(visitId, formData);
    showToast("Dossier sauvegardé avec succès !");
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
      showToast("Ordonnance prête ! Impression en cours...");
      
      // Laisser le temps au Toast de s'afficher et au composant de se mettre à jour
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
      
      // Traiter le prochain rendez-vous si renseigné
      const nextDate = formData.get("nextAppointment") as string;
      if (nextDate) {
        await createAppointment(initialData.patientId, nextDate);
      }

      const amountRaw = formData.get("amount") as string;
      const amount = amountRaw ? parseInt(amountRaw) : null;
      
      await finishConsultation(visitId, amount);
      window.location.href = "/dashboard/history";
    } catch (err: any) {
      console.error("Erreur lors de la clôture:", err);
      alert("Une erreur est survenue lors de la clôture: " + err.message);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
      
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
            <span className="material-symbols-outlined text-teal-400">check_circle</span>
            <span className="font-medium text-sm">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex border-b border-slate-100">
        <button onClick={() => setActiveTab('dossier')} className={`flex-1 py-4 font-semibold text-sm transition-colors ${activeTab === 'dossier' ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
          1. Dossier Médical
        </button>
        <button onClick={() => setActiveTab('ordonnance')} className={`flex-1 py-4 font-semibold text-sm transition-colors ${activeTab === 'ordonnance' ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
          2. Ordonnance
        </button>
        <button onClick={() => setActiveTab('cloture')} className={`flex-1 py-4 font-semibold text-sm transition-colors ${activeTab === 'cloture' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/30' : 'text-slate-500 hover:bg-slate-50'}`}>
          3. Tarification & Clôture
        </button>
      </div>

      <div className="p-8">
        
        {/* TAB 1 : DOSSIER */}
        {activeTab === 'dossier' && (
          <form onSubmit={handleSaveDossier} className="space-y-6 animate-in fade-in duration-300">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">Motif de la consultation / Maladie</label>
              <input type="text" name="disease" defaultValue={initialData.disease || ""} placeholder="Ex: Angine, Contrôle de routine..." className="w-full p-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">Diagnostic / Examen clinique</label>
              <textarea name="diagnosis" rows={3} defaultValue={initialData.diagnosis || ""} className="w-full p-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"></textarea>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">Notes personnelles (Tension, Poids, etc.)</label>
              <textarea name="notes" rows={2} defaultValue={initialData.notes || ""} className="w-full p-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"></textarea>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-colors">
                Enregistrer & Suivant
              </button>
            </div>
          </form>
        )}

        {/* TAB 2 : ORDONNANCE */}
        {activeTab === 'ordonnance' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {hasPrescription && medicines.length === 0 ? (
              <div className="p-4 bg-sky-50 text-sky-800 rounded-xl">Une ordonnance a déjà été créée pour cette visite.</div>
            ) : null}

            <div className="space-y-4">
              {medicines.map((med, i) => (
                <div key={i} className="flex gap-4 items-start p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex-1">
                    <MedicalAutocomplete 
                      value={med.name} 
                      onChange={(val) => updateMedicine(i, 'name', val)} 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Posologie / Instructions</label>
                    <input type="text" value={med.instructions} onChange={e => updateMedicine(i, 'instructions', e.target.value)} placeholder="Ex: 1 comprimé le soir" className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 bg-white text-sm" />
                  </div>
                  <button type="button" onClick={() => setMedicines(medicines.filter((_, idx) => idx !== i))} className="mt-6 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer ce médicament">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
            
            <button onClick={addMedicine} className="flex items-center gap-2 text-sky-600 font-bold px-4 py-2 hover:bg-sky-50 rounded-xl transition-colors">
              <span className="material-symbols-outlined">add_circle</span> Ajouter un médicament
            </button>

            <div className="flex justify-end gap-4 border-t border-slate-100 pt-6">
              <button onClick={() => setActiveTab('cloture')} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">
                Passer sans ordonnance
              </button>
              <button onClick={handleSavePrescription} className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined">print</span> Valider et Imprimer
              </button>
            </div>
          </div>
        )}

        {/* TAB 3 : CLOTURE */}
        {activeTab === 'cloture' && (
          <form onSubmit={handleFinish} className="max-w-md mx-auto text-center space-y-8 animate-in fade-in duration-300">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Tarification de la visite</h3>
              <p className="text-slate-500">Saisissez le montant qui sera communiqué à l'assistante pour l'encaissement.</p>
            </div>
            
            <div className="relative max-w-xs mx-auto">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">DH</span>
              <input type="number" name="amount" placeholder="Optionnel" step="10" className="w-full pl-14 pr-4 py-4 text-3xl font-bold text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-500 focus:ring-0 text-center" />
            </div>

            <div className="pt-6 border-t border-slate-100 max-w-sm mx-auto text-left">
              <label className="block text-sm font-semibold text-slate-800 mb-2">Programmer un prochain rendez-vous (Optionnel)</label>
              <input type="date" name="nextAppointment" className="w-full p-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
            </div>

            <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-sm transition-all hover:shadow-md flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              Confirmer et Clôturer la visite
            </button>
          </form>
        )}
      </div>

      {/* COMPOSANT D'IMPRESSION (caché à l'écran, visible à l'impression) */}
      <PrescriptionPDF patient={patient} medicines={medicines} date={new Date()} />
    </div>
  );
}
