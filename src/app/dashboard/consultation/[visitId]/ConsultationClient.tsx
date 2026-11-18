"use client";

import { useState } from "react";
import Link from "next/link";
import { updateMedicalNotes, savePrescription, finishConsultation } from "@/actions/consultation";
import { createAppointment } from "@/actions/appointments";
import MedicalAutocomplete from "@/components/MedicalAutocomplete";
import PrescriptionPDF from "@/components/PrescriptionPDF";
import ReceiptPDF from "@/components/ReceiptPDF";
import {
  ConsultationFieldConfig,
  CustomFieldValue,
  normalizeConsultationFields,
} from "@/lib/consultationConfig";
import { downloadFilledPrescriptionPdf } from "@/lib/prescriptionTemplateUtils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface PastVisit {
  id: number;
  date: string;
  status: string;
  disease: string | null;
  diagnosis: string | null;
  notes: string | null;
  bloodPressure: string | null;
  heartRate: number | null;
  temperature: string | null;
  weight: string | null;
  height: string | null;
  amountToPay: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  paidAt: string | null;
  customData?: CustomFieldValue[];
  medicines: { name: string; instructions: string }[];
}

interface PastAppointment {
  id: number;
  date: string;
  time: string;
  reason: string;
  status: string;
}

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
    customData?: CustomFieldValue[];
    [key: string]: unknown;
  };
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    age: number;
    phone: string;
    gender?: string | null;
    address?: string | null;
    createdAt?: string | null;
    mutuelle?: string | null;
    cin?: string | null;
    bloodGroup?: string | null;
    allergies?: string | null;
    antecedents?: string | null;
    [key: string]: unknown;
  };
  hasPrescription: boolean;
  initialMedicines?: { name: string; instructions: string }[];
  pastVisits?: PastVisit[];
  pastAppointments?: PastAppointment[];
  settings?: any;
}

export default function ConsultationClient({
  visitId,
  initialData,
  patient,
  hasPrescription,
  initialMedicines = [],
  pastVisits = [],
  pastAppointments = [],
  settings,
}: ConsultationClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'history' | 'dossier' | 'ordonnance' | 'cloture'>('dossier');
  const [historySearch, setHistorySearch] = useState("");
  const [medicines, setMedicines] = useState<{ name: string; instructions: string }[]>(initialMedicines);

  const consultationFields: ConsultationFieldConfig[] = normalizeConsultationFields(
    settings?.consultationFields
  );

  // Valeurs initiales des cases (système + personnalisées)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (initialData.bloodPressure) map.bloodPressure = String(initialData.bloodPressure);
    if (initialData.heartRate) map.heartRate = String(initialData.heartRate);
    if (initialData.temperature) map.temperature = String(initialData.temperature);
    if (initialData.weight) map.weight = String(initialData.weight);
    if (initialData.height) map.height = String(initialData.height);
    if (initialData.disease) map.disease = String(initialData.disease);
    if (initialData.diagnosis) map.diagnosis = String(initialData.diagnosis);
    if (initialData.notes) map.notes = String(initialData.notes);

    if (Array.isArray(initialData.customData)) {
      for (const item of initialData.customData) {
        if (item && item.id) {
          map[item.id] = item.value ?? "";
        }
      }
    }
    return map;
  });

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

  function setFieldValue(fieldId: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  // Calcul dynamique de l'IMC à partir des cases weight & height si présentes
  const weightField = consultationFields.find((f) => f.systemKey === "weight" || f.id === "weight");
  const heightField = consultationFields.find((f) => f.systemKey === "height" || f.id === "height");
  const weightVal = weightField ? fieldValues[weightField.id] || fieldValues.weight || "" : "";
  const heightVal = heightField ? fieldValues[heightField.id] || fieldValues.height || "" : "";

  const bmi = (() => {
    const w = parseFloat(weightVal.replace(",", "."));
    const h = parseFloat(heightVal.replace(",", ".")) / 100;
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return null;
  })();

  // Handlers pour le dossier dynamique (cases système + personnalisées)
  async function handleSaveDossier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    const customSnapshot: CustomFieldValue[] = [];

    for (const field of consultationFields) {
      const val = (fieldValues[field.id] ?? (field.systemKey ? fieldValues[field.systemKey] : "") ?? "").trim();
      if (field.systemKey) {
        formData.set(field.systemKey, val);
      } else if (val !== "") {
        customSnapshot.push({
          id: field.id,
          label: field.label,
          value: val,
          unit: field.unit,
          type: field.type,
          section: field.section,
        });
      }
    }

    formData.set("customData", JSON.stringify(customSnapshot));
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

  async function handleSavePrescription(mode: "none" | "print" | "pdf" = "none") {
    const validMeds = medicines.filter((m) => m.name.trim().length > 0);
    if (validMeds.length > 0) {
      await savePrescription(visitId, validMeds);
      if (mode === "print") {
        showToast("Impression de l'ordonnance en cours...");
        setTimeout(() => {
          window.print();
          setActiveTab('cloture');
        }, 300);
      } else if (mode === "pdf") {
        downloadFilledPrescriptionPdf({
          patient,
          medicines: validMeds,
          date: new Date(),
          settings,
        });
        showToast("Ordonnance PDF téléchargée dans votre modèle !");
        setActiveTab('cloture');
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

  const hasHistory = pastVisits.length > 0;

  const formatVisitDateTime = (iso: string) => {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart.charAt(0).toUpperCase() + datePart.slice(1)} à ${timePart}`;
  };

  const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const paymentMethodLabels: Record<string, string> = {
    cash: "Espèces",
    card: "Carte",
    check: "Chèque",
    insurance: "Mutuelle",
    free: "Gratuit",
  };

  const computePastBmi = (w?: string | null, h?: string | null) => {
    const wn = w ? parseFloat(w) : 0;
    const hn = h ? parseFloat(h) / 100 : 0;
    if (wn > 0 && hn > 0) return (wn / (hn * hn)).toFixed(1);
    return null;
  };

  const handleRenewPrescription = (pastMeds: { name: string; instructions: string }[]) => {
    if (pastMeds.length === 0) return;
    setMedicines(pastMeds.map((m) => ({ name: m.name, instructions: m.instructions })));
    setActiveTab("ordonnance");
    showToast(`${pastMeds.length} médicament${pastMeds.length > 1 ? "s" : ""} reconduit${pastMeds.length > 1 ? "s" : ""} dans l'ordonnance du jour`);
  };

  const filteredPastVisits = pastVisits.filter((v) => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return true;
    const dateStr = formatVisitDateTime(v.date).toLowerCase();
    const medsStr = v.medicines.map((m) => `${m.name} ${m.instructions}`).join(" ").toLowerCase();
    return (
      dateStr.includes(q) ||
      (v.disease && v.disease.toLowerCase().includes(q)) ||
      (v.diagnosis && v.diagnosis.toLowerCase().includes(q)) ||
      (v.notes && v.notes.toLowerCase().includes(q)) ||
      medsStr.includes(q)
    );
  });

  const tabs: { id: 'history' | 'dossier' | 'ordonnance' | 'cloture'; label: string; icon: string; badge?: number }[] = [
    ...(hasHistory
      ? [{ id: 'history' as const, label: 'Dossier & Historique', icon: 'history_edu', badge: pastVisits.length }]
      : []),
    { id: 'dossier', label: '1. Examen & Constantes', icon: 'stethoscope' },
    { id: 'ordonnance', label: '2. Prescription Médicale', icon: 'prescriptions' },
    { id: 'cloture', label: '3. Honoraires & Clôture', icon: 'payments' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] border border-slate-200/90 overflow-hidden relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-slate-900 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2 text-xs font-medium">
              <span className="material-symbols-outlined text-emerald-400 text-[16px]">check_circle</span>
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bandeau discret d'accès rapide au dossier existant */}
      {hasHistory && activeTab !== 'history' && (
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined text-[19px] text-slate-500 shrink-0">history_edu</span>
            <p className="text-xs text-slate-600 truncate">
              <strong className="font-semibold text-slate-900">
                {pastVisits.length} consultation{pastVisits.length > 1 ? "s" : ""} antérieure{pastVisits.length > 1 ? "s" : ""}
              </strong>{" "}
              • Dernière le {formatShortDate(pastVisits[0].date)}
              {pastVisits[0].disease ? ` (${pastVisits[0].disease})` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-medium transition cursor-pointer shrink-0"
          >
            <span>Consulter l'historique</span>
          </button>
        </div>
      )}

      {/* Onglets sobres à soulignement (style Doctolib / Linear) */}
      <div className="flex overflow-x-auto border-b border-slate-200/80 px-4 sm:px-6 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 py-3.5 px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap border-b-2 -mb-px ${
                isActive
                  ? "border-slate-900 text-slate-900 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold tabular-nums">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-6 sm:p-8">

        {/* TAB 0 : DOSSIER MÉDICAL COMPLET & HISTORIQUE DATÉ DU PATIENT */}
        {activeTab === 'history' && hasHistory && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Résumé Profil Médical Permanent */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600">folder_shared</span>
                    Dossier Médical Permanent — {patient.lastName} {patient.firstName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {patient.createdAt ? `Suivi au cabinet depuis le ${formatShortDate(patient.createdAt)} • ` : ""}
                    {pastVisits.length} consultation{pastVisits.length > 1 ? "s" : ""} archivée{pastVisits.length > 1 ? "s" : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('dossier')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">edit_note</span>
                  <span>Revenir à la consultation du jour</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Identité</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {patient.age} ans {patient.gender ? `• ${patient.gender === "F" ? "Femme" : "Homme"}` : ""}
                  </span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Téléphone / CIN</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {patient.phone} {patient.cin ? `• ${patient.cin}` : ""}
                  </span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Groupe Sanguin</span>
                  <span className="font-extrabold text-rose-700 mt-0.5 block">
                    {patient.bloodGroup || "Non renseigné"}
                  </span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Mutuelle / Adresse</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">
                    {patient.mutuelle || "Sans mutuelle"}
                    {patient.address ? ` • ${patient.address}` : ""}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-red-50/70 rounded-xl border border-red-200/70 p-3.5">
                  <span className="block text-[10px] font-extrabold uppercase text-red-700 mb-1">
                    Allergies connues
                  </span>
                  <p className="font-semibold text-red-900">
                    {patient.allergies || "Aucune allergie signalée"}
                  </p>
                </div>
                <div className="bg-amber-50/70 rounded-xl border border-amber-200/70 p-3.5">
                  <span className="block text-[10px] font-extrabold uppercase text-amber-800 mb-1">
                    Antécédents médicaux & chirurgicaux
                  </span>
                  <p className="font-semibold text-amber-950">
                    {patient.antecedents || "Aucun antécédent enregistré"}
                  </p>
                </div>
              </div>
            </div>

            {/* Barre de recherche dans l'historique de ce patient */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-indigo-600">timeline</span>
                Chronologie détaillée par date ({filteredPastVisits.length})
              </h3>
              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined text-base text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                  search
                </span>
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Rechercher date, maladie, médicament..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Timeline séparée par date exacte */}
            <div className="space-y-5">
              {filteredPastVisits.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-500">
                  Aucune consultation précédente ne correspond à votre recherche.
                </div>
              ) : (
                filteredPastVisits.map((pv, idx) => {
                  const pastBmi = computePastBmi(pv.weight, pv.height);
                  const hasVitals =
                    pv.bloodPressure || pv.heartRate || pv.temperature || pv.weight || pv.height;

                  return (
                    <div
                      key={pv.id}
                      className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden"
                    >
                      {/* En-tête daté bien séparé */}
                      <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0">
                            {pastVisits.length - idx}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                              <span className="material-symbols-outlined text-base text-indigo-600">
                                calendar_today
                              </span>
                              <span>{formatVisitDateTime(pv.date)}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Consultation #{pv.id}
                              {pv.paidAt ? ` • Encaissée le ${formatShortDate(pv.paidAt)}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {pv.amountToPay && (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-[11px] font-extrabold">
                              {parseFloat(pv.amountToPay).toFixed(0)} DH
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                              pv.paymentStatus === "paid"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {pv.paymentStatus === "paid"
                              ? `Payé${pv.paymentMethod ? ` (${paymentMethodLabels[pv.paymentMethod] || pv.paymentMethod})` : ""}`
                              : "Paiement en attente"}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 space-y-5">
                        {/* Constantes vitales de cette date */}
                        {hasVitals && (
                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-xs text-sky-600">vital_signs</span>
                              Constantes enregistrées le {formatShortDate(pv.date)}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {pv.bloodPressure && (
                                <span className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-100 text-xs font-bold text-sky-900">
                                  Tension : {pv.bloodPressure} mmHg
                                </span>
                              )}
                              {pv.heartRate && (
                                <span className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-900">
                                  Pouls : {pv.heartRate} bpm
                                </span>
                              )}
                              {pv.temperature && (
                                <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-xs font-bold text-amber-900">
                                  Température : {pv.temperature} °C
                                </span>
                              )}
                              {pv.weight && (
                                <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                                  Poids : {pv.weight} kg
                                </span>
                              )}
                              {pv.height && (
                                <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                                  Taille : {pv.height} cm
                                </span>
                              )}
                              {pastBmi && (
                                <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-extrabold text-indigo-800">
                                  IMC : {pastBmi}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Motif / Maladie + Diagnostic + Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-2xl bg-slate-50/80 border border-slate-200/70 p-4">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                              Motif / Pathologie
                            </p>
                            <p className="text-sm font-bold text-slate-900">
                              {pv.disease || "Non renseigné"}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-50/80 border border-slate-200/70 p-4">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                              Diagnostic Clinique
                            </p>
                            <p className="text-sm font-semibold text-slate-800 whitespace-pre-line">
                              {pv.diagnosis || "Non renseigné"}
                            </p>
                          </div>
                        </div>

                        {pv.notes && (
                          <div className="rounded-2xl bg-sky-50/40 border border-sky-100 p-4">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 mb-1">
                              Notes & Observations du Médecin
                            </p>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                              {pv.notes}
                            </p>
                          </div>
                        )}

                        {/* Champs personnalisés enregistrés à cette date */}
                        {pv.customData && pv.customData.length > 0 && (
                          <div className="rounded-2xl bg-indigo-50/40 border border-indigo-100 p-4 space-y-2">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-xs">dynamic_form</span>
                              Informations personnalisées enregistrées le {formatShortDate(pv.date)}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {pv.customData.map((cf, cIdx) => (
                                <div
                                  key={`${cf.id}-${cIdx}`}
                                  className="bg-white rounded-xl border border-indigo-100 px-3 py-2 text-xs"
                                >
                                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                                    {cf.label}
                                  </span>
                                  <span className="font-bold text-slate-900 whitespace-pre-line">
                                    {cf.value}
                                    {cf.unit ? ` ${cf.unit}` : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Ordonnance prescrite à cette date */}
                        <div className="rounded-2xl border border-teal-200/70 bg-teal-50/30 p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm">medication</span>
                              Ordonnance prescrite le {formatShortDate(pv.date)} ({pv.medicines.length})
                            </p>

                            {pv.medicines.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleRenewPrescription(pv.medicines)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition shadow-xs cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                <span>Reconduire cette ordonnance</span>
                              </button>
                            )}
                          </div>

                          {pv.medicines.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">
                              Aucun médicament prescrit lors de cette consultation.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {pv.medicines.map((med, mIdx) => (
                                <div
                                  key={mIdx}
                                  className="bg-white rounded-xl border border-teal-100 px-3.5 py-2.5 flex items-start gap-3"
                                >
                                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                    {mIdx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-extrabold text-slate-900">{med.name}</p>
                                    {med.instructions && (
                                      <p className="text-[11px] text-slate-600 mt-0.5">
                                        {med.instructions}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Historique des Rendez-vous du patient */}
            {pastAppointments.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-indigo-600">event</span>
                  Rendez-vous enregistrés ({pastAppointments.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {pastAppointments.map((a) => (
                    <div
                      key={a.id}
                      className="bg-white rounded-xl border border-slate-200/80 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          {formatShortDate(a.date)} à {a.time}
                        </p>
                        <p className="text-[11px] text-slate-500">{a.reason}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          a.status === "admitted"
                            ? "bg-emerald-50 text-emerald-700"
                            : a.status === "cancelled"
                            ? "bg-red-50 text-red-700"
                            : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {a.status === "admitted"
                          ? "Honoré"
                          : a.status === "cancelled"
                          ? "Annulé"
                          : "Planifié"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* TAB 1 : DOSSIER & CONSTANTES (100% PERSONNALISABLE PAR LE MÉDECIN) */}
        {activeTab === 'dossier' && (() => {
          const vitalsFields = consultationFields.filter((f) => f.section === "vitals");
          const clinicalFields = consultationFields.filter((f) => f.section === "clinical");

          const renderDynamicInput = (field: ConsultationFieldConfig, compact = false) => {
            const val = fieldValues[field.id] ?? (field.systemKey ? fieldValues[field.systemKey] : "") ?? "";
            const baseCls = compact
              ? "w-full px-3 py-2 text-xs font-bold bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
              : "w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all";

            if (field.type === "select") {
              return (
                <select
                  value={val}
                  required={Boolean(field.required)}
                  onChange={(e) => setFieldValue(field.id, e.target.value)}
                  className={baseCls}
                >
                  <option value="">-- Sélectionner --</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              );
            }

            if (field.type === "textarea") {
              return (
                <textarea
                  rows={3}
                  value={val}
                  required={Boolean(field.required)}
                  onChange={(e) => setFieldValue(field.id, e.target.value)}
                  placeholder={field.placeholder || ""}
                  className={`${baseCls} resize-y`}
                />
              );
            }

            if (field.type === "checkbox") {
              const checked = val === "Oui";
              return (
                <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-sky-300 transition">
                  <input
                    type="checkbox"
                    checked={checked}
                    required={Boolean(field.required)}
                    onChange={(e) => setFieldValue(field.id, e.target.checked ? "Oui" : "")}
                    className="w-4 h-4 rounded text-sky-600"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    {checked ? "Oui" : "Non"}
                  </span>
                </label>
              );
            }

            return (
              <input
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                step={field.type === "number" ? "any" : undefined}
                value={val}
                required={Boolean(field.required)}
                onChange={(e) => setFieldValue(field.id, e.target.value)}
                placeholder={field.placeholder || ""}
                className={baseCls}
              />
            );
          };

          return (
            <form onSubmit={handleSaveDossier} className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Remplissez uniquement les cases utiles à cette consultation.
                </p>
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-xl border border-sky-200/70 transition"
                >
                  <span className="material-symbols-outlined text-sm">tune</span>
                  <span>Personnaliser les cases</span>
                </Link>
              </div>

              {/* Bloc Constantes / Mesures */}
              {vitalsFields.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-sky-600">vital_signs</span>
                    Constantes & Mesures
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                    {vitalsFields.map((field) => (
                      <div key={field.id}>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {field.label}
                          {field.unit ? ` (${field.unit})` : ""}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                          {(field.systemKey === "height" || field.id === "height") && bmi && (
                            <span className="text-sky-600 font-extrabold ml-1">(IMC: {bmi})</span>
                          )}
                        </span>
                        {renderDynamicInput(field, true)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bloc Examen Clinique */}
              {clinicalFields.length > 0 && (
                <div className="space-y-5">
                  {clinicalFields.map((field) => (
                    <div key={field.id}>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        {field.label}
                        {field.unit ? ` (${field.unit})` : ""}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderDynamicInput(field, false)}
                    </div>
                  ))}
                </div>
              )}

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
          );
        })()}

        {/* TAB 2 : ORDONNANCE MÉDICALE */}
        {activeTab === 'ordonnance' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <p className="text-xs text-slate-500">
                Ajoutez les médicaments prescrits. Tapez les premières lettres pour rechercher dans la nomenclature marocaine.
              </p>
              <div className="flex items-center gap-2">
                {settings?.prescriptionTemplateUrl ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Template perso actif
                  </span>
                ) : (
                  <Link
                    href="/dashboard/settings"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1 rounded-full transition"
                  >
                    <span className="material-symbols-outlined text-xs">upload_file</span>
                    Ajouter mon template
                  </Link>
                )}
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200/60">
                  {medicines.length} médicament{medicines.length > 1 ? "s" : ""}
                </span>
              </div>
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

            <div className="flex flex-wrap justify-end items-center gap-2.5 border-t border-slate-100 pt-6">
              <button 
                type="button"
                onClick={() => setActiveTab('cloture')} 
                className="px-4 py-2.5 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Passer sans ordonnance
              </button>
              <button 
                type="button"
                onClick={() => handleSavePrescription("none")} 
                className="px-4 py-2.5 text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Enregistrer
              </button>
              <button 
                type="button"
                onClick={() => handleSavePrescription("pdf")} 
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                Télécharger PDF
              </button>
              <button 
                type="button"
                onClick={() => handleSavePrescription("print")} 
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md hover:shadow-sky-600/25 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">print</span>
                Imprimer
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
