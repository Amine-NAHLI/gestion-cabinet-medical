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

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Espèces",
  card: "Carte",
  check: "Chèque",
  insurance: "Mutuelle",
  free: "Gratuit",
};

export default function ConsultationClient({
  visitId,
  initialData,
  patient,
  initialMedicines = [],
  pastVisits = [],
  pastAppointments = [],
  settings,
}: ConsultationClientProps) {
  const router = useRouter();
  const hasHistory = pastVisits.length > 0;

  const [activeTab, setActiveTab] = useState<"history" | "dossier" | "ordonnance" | "cloture">("dossier");
  const [historySearch, setHistorySearch] = useState("");
  const [expandedVisits, setExpandedVisits] = useState<Record<number, boolean>>(() => {
    // Ouvrir automatiquement les 3 visites les plus récentes pour lecture immédiate
    const initial: Record<number, boolean> = {};
    pastVisits.slice(0, 3).forEach((v) => {
      initial[v.id] = true;
    });
    return initial;
  });

  const [medicines, setMedicines] = useState<{ name: string; instructions: string }[]>(initialMedicines);

  const consultationFields: ConsultationFieldConfig[] = normalizeConsultationFields(
    settings?.consultationFields
  );

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
        if (item?.id) map[item.id] = item.value ?? "";
      }
    }
    return map;
  });

  const [amount, setAmount] = useState<string>(
    initialData.amountToPay
      ? String(initialData.amountToPay)
      : settings?.defaultFee
      ? String(parseFloat(String(settings.defaultFee)))
      : "250"
  );
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [printDoc, setPrintDoc] = useState<"prescription" | "receipt" | null>(null);

  function triggerPrint(docType: "prescription" | "receipt", afterCallback?: () => void) {
    setPrintDoc(docType);
    const cleanup = () => {
      setPrintDoc(null);
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
      if (afterCallback) afterCallback();
    }, 180);
  }

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }

  function setFieldValue(fieldId: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function toggleVisitExpand(id: number) {
    setExpandedVisits((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // IMC dynamique
  const weightField = consultationFields.find((f) => f.systemKey === "weight" || f.id === "weight");
  const heightField = consultationFields.find((f) => f.systemKey === "height" || f.id === "height");
  const weightVal = weightField ? fieldValues[weightField.id] || fieldValues.weight || "" : "";
  const heightVal = heightField ? fieldValues[heightField.id] || fieldValues.height || "" : "";

  const bmi = (() => {
    const w = parseFloat(weightVal.replace(",", "."));
    const h = parseFloat(heightVal.replace(",", ".")) / 100;
    if (w > 0 && h > 0) return (w / (h * h)).toFixed(1);
    return null;
  })();

  const formatVisitDateTime = (iso: string) => {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart.charAt(0).toUpperCase() + datePart.slice(1)} · ${timePart}`;
  };

  const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const computePastBmi = (w?: string | null, h?: string | null) => {
    const wn = w ? parseFloat(w) : 0;
    const hn = h ? parseFloat(h) / 100 : 0;
    if (wn > 0 && hn > 0) return (wn / (hn * hn)).toFixed(1);
    return null;
  };

  async function handleSaveDossier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    const customSnapshot: CustomFieldValue[] = [];

    for (const field of consultationFields) {
      const val = (
        fieldValues[field.id] ??
        (field.systemKey ? fieldValues[field.systemKey] : "") ??
        ""
      ).trim();
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
    showToast("Examen clinique enregistré");
    setActiveTab("ordonnance");
  }

  function addMedicine() {
    setMedicines([...medicines, { name: "", instructions: "" }]);
  }

  function updateMedicine(index: number, field: "name" | "instructions", value: string) {
    const copy = [...medicines];
    copy[index][field] = value;
    setMedicines(copy);
  }

  function handleRenewPrescription(pastMeds: { name: string; instructions: string }[]) {
    if (pastMeds.length === 0) return;
    setMedicines(pastMeds.map((m) => ({ name: m.name, instructions: m.instructions })));
    setActiveTab("ordonnance");
    showToast(`${pastMeds.length} médicament${pastMeds.length > 1 ? "s" : ""} repris dans l'ordonnance`);
  }

  async function handleSavePrescription(mode: "none" | "print" | "pdf" = "none") {
    const validMeds = medicines.filter((m) => m.name.trim().length > 0);
    if (validMeds.length > 0) {
      await savePrescription(visitId, validMeds);
      if (mode === "print") {
        showToast("Préparation de l'impression...");
        triggerPrint("prescription", () => setActiveTab("cloture"));
      } else if (mode === "pdf") {
        downloadFilledPrescriptionPdf({
          patient,
          medicines: validMeds,
          date: new Date(),
          settings,
        });
        showToast("Ordonnance PDF téléchargée");
        setActiveTab("cloture");
      } else {
        showToast("Ordonnance enregistrée");
        setActiveTab("cloture");
      }
    } else {
      setActiveTab("cloture");
    }
  }

  async function handleFinish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsFinishing(true);
    try {
      const formData = new FormData(e.currentTarget);
      const nextDate = formData.get("nextAppointment") as string;
      const nextTime = ((formData.get("nextAppointmentTime") as string) || "09:30").trim();
      if (nextDate) {
        await createAppointment(patient.id, nextDate, nextTime, "Consultation de contrôle");
      }

      const parsedAmount =
        amount.trim() !== "" && !isNaN(Number(amount)) && Number(amount) >= 0
          ? Number(amount)
          : null;

      await finishConsultation(visitId, parsedAmount, paymentMethod);
      router.push("/dashboard/history");
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert("Erreur lors de la clôture : " + errorMsg);
      setIsFinishing(false);
    }
  }

  const filteredPastVisits = pastVisits.filter((v) => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return true;
    const dateStr = formatVisitDateTime(v.date).toLowerCase();
    const medsStr = v.medicines.map((m) => `${m.name} ${m.instructions}`).join(" ").toLowerCase();
    const customStr = (v.customData || []).map((c) => `${c.label} ${c.value}`).join(" ").toLowerCase();
    return (
      dateStr.includes(q) ||
      (v.disease && v.disease.toLowerCase().includes(q)) ||
      (v.diagnosis && v.diagnosis.toLowerCase().includes(q)) ||
      (v.notes && v.notes.toLowerCase().includes(q)) ||
      medsStr.includes(q) ||
      customStr.includes(q)
    );
  });

  const tabs: {
    id: "history" | "dossier" | "ordonnance" | "cloture";
    label: string;
    icon: string;
    badge?: number;
  }[] = [
    ...(hasHistory
      ? [{ id: "history" as const, label: "Historique patient", icon: "history_edu", badge: pastVisits.length }]
      : []),
    { id: "dossier", label: "1. Examen", icon: "stethoscope" },
    { id: "ordonnance", label: "2. Ordonnance", icon: "prescriptions", badge: medicines.length > 0 ? medicines.length : undefined },
    { id: "cloture", label: "3. Clôture", icon: "payments" },
  ];

  const vitalsFields = consultationFields.filter((f) => f.section === "vitals");
  const clinicalFields = consultationFields.filter((f) => f.section === "clinical");

  const renderDynamicInput = (field: ConsultationFieldConfig, compact = false) => {
    const val =
      fieldValues[field.id] ?? (field.systemKey ? fieldValues[field.systemKey] : "") ?? "";
    const baseCls = compact
      ? "w-full px-3 py-2 text-sm font-medium bg-white rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition"
      : "w-full px-3.5 py-2.5 text-sm bg-white rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition";

    if (field.type === "select") {
      return (
        <select
          value={val}
          required={Boolean(field.required)}
          onChange={(e) => setFieldValue(field.id, e.target.value)}
          className={baseCls}
        >
          <option value="">Sélectionner...</option>
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
          className={`${baseCls} resize-y leading-relaxed`}
        />
      );
    }

    if (field.type === "checkbox") {
      const checked = val === "Oui";
      return (
        <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-slate-300 transition">
          <input
            type="checkbox"
            checked={checked}
            required={Boolean(field.required)}
            onChange={(e) => setFieldValue(field.id, e.target.checked ? "Oui" : "")}
            className="w-4 h-4 rounded text-slate-900"
          />
          <span className="text-sm font-medium text-slate-700">{checked ? "Oui" : "Non"}</span>
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
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden relative">
      {/* Toast discret */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-xs font-medium">
              <span className="material-symbols-outlined text-emerald-400 text-[16px]">check_circle</span>
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bandeau rapide patient suivi (uniquement si historique présent et pas déjà sur l'onglet historique) */}
      {hasHistory && activeTab !== "history" && (
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs text-slate-600 truncate">
            <span className="font-semibold text-slate-900">
              {pastVisits.length} consultation{pastVisits.length > 1 ? "s" : ""} précédente{pastVisits.length > 1 ? "s" : ""}
            </span>
            <span className="mx-1.5 text-slate-300">|</span>
            Dernière le {formatShortDate(pastVisits[0].date)}
            {pastVisits[0].disease ? ` — ${pastVisits[0].disease}` : ""}
          </p>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className="text-xs font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer self-start sm:self-center shrink-0"
          >
            <span>Ouvrir l'historique</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* Onglets sobres à soulignement */}
      <div className="flex overflow-x-auto border-b border-slate-200/80 px-3 sm:px-6 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-[13px] whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
                isActive
                  ? "border-slate-900 text-slate-900 font-semibold"
                  : "border-transparent text-slate-500 font-medium hover:text-slate-800"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold tabular-nums">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================
          ONGLET 0 : HISTORIQUE MÉDICAL COMPLET (LECTURE RAPIDE & CLAIRE)
         ============================================================ */}
      {activeTab === "history" && hasHistory && (
        <div className="divide-y divide-slate-200/80">
          {/* ZONE 1 : FICHE SYNTHÈSE PATIENT (SANS BOÎTES IMBRIQUÉES) */}
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Fiche médicale de {patient.lastName} {patient.firstName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {patient.createdAt ? `Patient suivi depuis le ${formatShortDate(patient.createdAt)} • ` : ""}
                  {pastVisits.length} visite{pastVisits.length > 1 ? "s" : ""} archivée{pastVisits.length > 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("dossier")}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer self-start sm:self-center"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                <span>Retour à la consultation du jour</span>
              </button>
            </div>

            {/* Tableau synthèse 1 ligne propre */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200/80 border border-slate-200/90 rounded-lg overflow-hidden">
              <div className="bg-white px-3.5 py-2.5">
                <p className="text-[11px] text-slate-500">Âge & Sexe</p>
                <p className="text-xs font-semibold text-slate-900 mt-0.5">
                  {patient.age} ans{patient.gender ? ` • ${patient.gender === "F" ? "Femme" : "Homme"}` : ""}
                </p>
              </div>
              <div className="bg-white px-3.5 py-2.5">
                <p className="text-[11px] text-slate-500">Téléphone / CIN</p>
                <p className="text-xs font-semibold text-slate-900 tabular-nums mt-0.5 truncate">
                  {patient.phone}
                  {patient.cin ? ` • ${patient.cin}` : ""}
                </p>
              </div>
              <div className="bg-white px-3.5 py-2.5">
                <p className="text-[11px] text-slate-500">Mutuelle</p>
                <p className="text-xs font-semibold text-slate-900 mt-0.5 truncate">
                  {patient.mutuelle || "—"}
                </p>
              </div>
              <div className="bg-white px-3.5 py-2.5">
                <p className="text-[11px] text-slate-500">Groupe sanguin</p>
                <p className={`text-xs font-semibold mt-0.5 ${patient.bloodGroup ? "text-rose-700" : "text-slate-400"}`}>
                  {patient.bloodGroup || "Non renseigné"}
                </p>
              </div>
            </div>

            {/* Allergies & Antécédents : sobres si vides, accentués UNIQUEMENT si renseignés */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div
                className={`px-3.5 py-2.5 rounded-lg border-l-[3px] border ${
                  patient.allergies
                    ? "border-red-200 border-l-red-600 bg-red-50/40"
                    : "border-slate-200/80 border-l-slate-300 bg-slate-50/50"
                }`}
              >
                <span className={`font-semibold block ${patient.allergies ? "text-red-800" : "text-slate-500"}`}>
                  Allergies
                </span>
                <p className={`mt-0.5 ${patient.allergies ? "text-red-950 font-medium" : "text-slate-500"}`}>
                  {patient.allergies || "Aucune allergie signalée"}
                </p>
              </div>

              <div
                className={`px-3.5 py-2.5 rounded-lg border-l-[3px] border ${
                  patient.antecedents
                    ? "border-amber-200 border-l-amber-500 bg-amber-50/40"
                    : "border-slate-200/80 border-l-slate-300 bg-slate-50/50"
                }`}
              >
                <span className={`font-semibold block ${patient.antecedents ? "text-amber-900" : "text-slate-500"}`}>
                  Antécédents médicaux
                </span>
                <p className={`mt-0.5 ${patient.antecedents ? "text-amber-950 font-medium" : "text-slate-500"}`}>
                  {patient.antecedents || "Aucun antécédent enregistré"}
                </p>
              </div>
            </div>
          </div>

          {/* ZONE 2 : CHRONOLOGIE DES CONSULTATIONS (CLAIRE, STRUCTURÉE, SCANNABLE EN 2 SECONDES) */}
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Consultations précédentes ({filteredPastVisits.length})
              </h3>
              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined text-[17px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                  search
                </span>
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Filtrer par date, diagnostic, médicament..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            {filteredPastVisits.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                Aucune consultation ne correspond à « {historySearch} ».
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPastVisits.map((pv, idx) => {
                  const isOpen = expandedVisits[pv.id] ?? false;
                  const pastBmi = computePastBmi(pv.weight, pv.height);
                  const vitalsList = [
                    pv.bloodPressure ? { label: "Tension", val: `${pv.bloodPressure} mmHg` } : null,
                    pv.heartRate ? { label: "Pouls", val: `${pv.heartRate} bpm` } : null,
                    pv.temperature ? { label: "Temp.", val: `${pv.temperature} °C` } : null,
                    pv.weight ? { label: "Poids", val: `${pv.weight} kg` } : null,
                    pv.height ? { label: "Taille", val: `${pv.height} cm` } : null,
                    pastBmi ? { label: "IMC", val: pastBmi } : null,
                  ].filter(Boolean) as { label: string; val: string }[];

                  return (
                    <div
                      key={pv.id}
                      className="rounded-xl border border-slate-200/90 bg-white overflow-hidden"
                    >
                      {/* Barre de date cliquable (ouvrir/fermer) */}
                      <button
                        type="button"
                        onClick={() => toggleVisitExpand(pv.id)}
                        className="w-full px-4 py-3 bg-slate-50/90 hover:bg-slate-100/70 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center tabular-nums shrink-0">
                            {pastVisits.length - idx}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {formatVisitDateTime(pv.date)}
                            </p>
                            {!isOpen && pv.disease && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {pv.disease}
                                {pv.medicines.length > 0 ? ` • ${pv.medicines.length} méd.` : ""}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-9 sm:pl-0">
                          <div className="flex items-center gap-2 text-xs">
                            {pv.amountToPay && (
                              <span className="font-semibold text-slate-800 tabular-nums">
                                {parseFloat(pv.amountToPay).toFixed(0)} DH
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 font-medium ${
                                pv.paymentStatus === "paid" ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  pv.paymentStatus === "paid" ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                              />
                              {pv.paymentStatus === "paid"
                                ? `Payé${pv.paymentMethod ? ` (${PAYMENT_LABELS[pv.paymentMethod] || pv.paymentMethod})` : ""}`
                                : "À encaisser"}
                            </span>
                          </div>
                          <span className="material-symbols-outlined text-[18px] text-slate-400">
                            {isOpen ? "expand_less" : "expand_more"}
                          </span>
                        </div>
                      </button>

                      {/* Détails structurés par séparateurs fins (zéro boîtes dans des boîtes) */}
                      {isOpen && (
                        <div className="divide-y divide-slate-100">
                          {/* 1. Bandeau Constantes vitales (tableau horizontal propre) */}
                          {vitalsList.length > 0 && (
                            <div className="px-4 py-3 flex flex-wrap gap-x-6 gap-y-2 bg-white">
                              {vitalsList.map((vt) => (
                                <div key={vt.label}>
                                  <span className="block text-[11px] text-slate-400">{vt.label}</span>
                                  <span className="text-xs font-semibold text-slate-900 tabular-nums">
                                    {vt.val}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 2. Examen clinique : Motif, Diagnostic, Notes */}
                          {(pv.disease || pv.diagnosis || pv.notes) && (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="space-y-3">
                                {pv.disease && (
                                  <div>
                                    <p className="text-[11px] font-medium text-slate-400 mb-0.5">
                                      Motif / Pathologie
                                    </p>
                                    <p className="text-sm font-medium text-slate-900">{pv.disease}</p>
                                  </div>
                                )}
                                {pv.diagnosis && (
                                  <div>
                                    <p className="text-[11px] font-medium text-slate-400 mb-0.5">
                                      Diagnostic clinique
                                    </p>
                                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                      {pv.diagnosis}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {pv.notes && (
                                <div>
                                  <p className="text-[11px] font-medium text-slate-400 mb-0.5">
                                    Notes & observations
                                  </p>
                                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                    {pv.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 3. Champs personnalisés (si présents) */}
                          {pv.customData && pv.customData.length > 0 && (
                            <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5 text-xs">
                              {pv.customData.map((cf, cIdx) => (
                                <div key={`${cf.id}-${cIdx}`}>
                                  <span className="block text-[11px] text-slate-400">{cf.label}</span>
                                  <span className="font-medium text-slate-900 whitespace-pre-line">
                                    {cf.value}
                                    {cf.unit ? ` ${cf.unit}` : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 4. Ordonnance prescrite ce jour */}
                          <div className="px-4 py-3.5 bg-slate-50/40">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                              <p className="text-xs font-semibold text-slate-800">
                                Ordonnance ({pv.medicines.length})
                              </p>
                              {pv.medicines.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleRenewPrescription(pv.medicines)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-medium transition cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                  <span>Reconduire</span>
                                </button>
                              )}
                            </div>

                            {pv.medicines.length === 0 ? (
                              <p className="text-xs text-slate-400">
                                Aucun médicament prescrit lors de cette visite.
                              </p>
                            ) : (
                              <ol className="space-y-1.5">
                                {pv.medicines.map((med, mIdx) => (
                                  <li key={mIdx} className="text-xs flex items-baseline gap-2">
                                    <span className="text-slate-400 font-mono text-[11px] tabular-nums shrink-0">
                                      {String(mIdx + 1).padStart(2, "0")}.
                                    </span>
                                    <span className="text-slate-900 font-semibold">{med.name}</span>
                                    {med.instructions && (
                                      <span className="text-slate-500">— {med.instructions}</span>
                                    )}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ZONE 3 : RENDEZ-VOUS DU PATIENT (SI PRÉSENTS) */}
          {pastAppointments.length > 0 && (
            <div className="p-4 sm:p-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Rendez-vous ({pastAppointments.length})
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-lg overflow-hidden">
                {pastAppointments.map((a) => (
                  <div
                    key={a.id}
                    className="px-4 py-2.5 bg-white flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatShortDate(a.date)} à {a.time}
                      </span>
                      <span className="text-slate-500 ml-2">{a.reason}</span>
                    </div>
                    <span
                      className={`text-[11px] font-medium shrink-0 ${
                        a.status === "admitted"
                          ? "text-emerald-700"
                          : a.status === "cancelled"
                          ? "text-red-600"
                          : "text-sky-700"
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

      {/* ============================================================
          ONGLET 1 : EXAMEN & CONSTANTES DU JOUR
         ============================================================ */}
      {activeTab === "dossier" && (
        <form onSubmit={handleSaveDossier} className="p-4 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Examen du jour</h2>
              <p className="text-xs text-slate-500">
                Tous les champs restent libres, remplissez uniquement ceux utiles.
              </p>
            </div>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition"
            >
              <span className="material-symbols-outlined text-[15px]">tune</span>
              <span>Modifier mes cases</span>
            </Link>
          </div>

          {/* Bloc Constantes / Mesures */}
          {vitalsFields.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-700">Constantes & mesures</h3>
                {bmi && (
                  <span className="text-xs font-semibold text-sky-700 tabular-nums">
                    IMC calculé : {bmi}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                {vitalsFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {field.label}
                      {field.unit ? <span className="text-slate-400"> ({field.unit})</span> : ""}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {renderDynamicInput(field, true)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bloc Examen Clinique */}
          {clinicalFields.length > 0 && (
            <div className="space-y-4">
              {clinicalFields.map((field) => (
                <div key={field.id}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {field.label}
                    {field.unit ? <span className="text-slate-400 font-normal"> ({field.unit})</span> : ""}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {renderDynamicInput(field, false)}
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-200/80 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition cursor-pointer"
            >
              <span>Enregistrer et passer à l'ordonnance</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================
          ONGLET 2 : ORDONNANCE MÉDICALE
         ============================================================ */}
      {activeTab === "ordonnance" && (
        <div className="p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200/80">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Prescription médicale</h2>
              <p className="text-xs text-slate-500">
                Saisissez les premières lettres d'un médicament pour l'autocomplétion.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {settings?.prescriptionTemplateUrl ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Template perso actif
                </span>
              ) : (
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md transition"
                >
                  <span className="material-symbols-outlined text-[14px]">upload_file</span>
                  Ajouter mon template
                </Link>
              )}
            </div>
          </div>

          {medicines.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
              <p className="text-sm font-medium text-slate-700">Aucun médicament ajouté</p>
              <button
                type="button"
                onClick={addMedicine}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Ajouter le premier médicament</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {medicines.map((med, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/40 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <MedicalAutocomplete
                      value={med.name}
                      onChange={(val) => updateMedicine(i, "name", val)}
                      onSelectInstruction={(inst) => updateMedicine(i, "instructions", inst)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Posologie & durée
                    </label>
                    <input
                      type="text"
                      value={med.instructions}
                      onChange={(e) => updateMedicine(i, "instructions", e.target.value)}
                      placeholder="Ex: 1 cp matin et soir pendant 7 jours"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setMedicines(medicines.filter((_, idx) => idx !== i))}
                    className="self-end p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0"
                    title="Retirer ce médicament"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addMedicine}
                className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg font-medium text-xs transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Ajouter un médicament</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-end items-center gap-2.5 border-t border-slate-200/80 pt-5">
            <button
              type="button"
              onClick={() => setActiveTab("cloture")}
              className="px-3.5 py-2.5 text-slate-600 font-medium text-xs hover:bg-slate-100 rounded-lg border border-slate-200 sm:border-transparent transition cursor-pointer text-center"
            >
              Sans ordonnance
            </button>
            <button
              type="button"
              onClick={() => handleSavePrescription("none")}
              className="px-3.5 py-2.5 text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-xs transition cursor-pointer text-center"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => handleSavePrescription("pdf")}
              className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium text-xs transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              <span>Télécharger PDF</span>
            </button>
            <button
              type="button"
              onClick={() => handleSavePrescription("print")}
              className="inline-flex items-center justify-center gap-1.5 bg-sky-700 hover:bg-sky-600 text-white px-4 py-2.5 rounded-lg font-medium text-xs transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Imprimer</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          ONGLET 3 : HONORAIRES & CLÔTURE
         ============================================================ */}
      {activeTab === "cloture" && (
        <form onSubmit={handleFinish} className="p-4 sm:p-6 max-w-lg mx-auto space-y-6">
          <div className="pb-4 border-b border-slate-200/80">
            <h2 className="text-base font-semibold text-slate-900">Honoraires et clôture</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Le tarif sera transmis automatiquement à l'assistante pour encaissement.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Montant des honoraires (DH)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoComplete="off"
                  placeholder="250"
                  step="10"
                  className="w-full pr-14 pl-4 py-3 text-xl font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  DH
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mode de règlement prévu
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "cash", label: "Espèces", icon: "payments" },
                  { id: "card", label: "Carte", icon: "credit_card" },
                  { id: "check", label: "Chèque", icon: "fact_check" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      paymentMethod === m.id
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Prochain rendez-vous de contrôle <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="date"
                  name="nextAppointment"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
                />
                <input
                  type="time"
                  name="nextAppointmentTime"
                  defaultValue="10:00"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => triggerPrint("receipt")}
              className="sm:w-auto px-4 py-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>Imprimer reçu</span>
            </button>
            <button
              type="submit"
              disabled={isFinishing}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{isFinishing ? "Clôture en cours..." : "Clôturer et archiver la consultation"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Impression Invisible Ordonnance (isolée pour ne jamais entrer en collision avec le reçu) */}
      {printDoc === "prescription" && (
        <PrescriptionPDF
          patient={patient}
          medicines={medicines.filter((m) => m.name.trim().length > 0)}
          date={new Date()}
          settings={settings}
        />
      )}

      {/* Impression Invisible Reçu / Quittance */}
      {printDoc === "receipt" && (
        <ReceiptPDF
          patient={patient}
          amount={amount}
          paymentMethod={paymentMethod}
          date={new Date()}
          visitId={visitId}
          settings={settings}
        />
      )}
    </div>
  );
}
