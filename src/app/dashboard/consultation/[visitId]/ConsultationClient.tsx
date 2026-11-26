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
  const [isSavingDossier, setIsSavingDossier] = useState(false);
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

  // Calcul d'IMC dynamique
  const weightVal = fieldValues.weight || "";
  const heightVal = fieldValues.height || "";
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

  async function handleSaveDossier(e?: React.FormEvent<HTMLFormElement>) {
    if (e) e.preventDefault();
    setIsSavingDossier(true);
    try {
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
    } finally {
      setIsSavingDossier(false);
    }
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

  async function handleFinish(e?: React.FormEvent<HTMLFormElement>) {
    if (e) e.preventDefault();
    setIsFinishing(true);
    try {
      const parsedAmount =
        amount.trim() !== "" && !isNaN(Number(amount)) && Number(amount) >= 0
          ? Number(amount)
          : null;

      const formEl = document.getElementById("consultation-finish-form") as HTMLFormElement | null;
      if (formEl) {
        const formData = new FormData(formEl);
        const nextDate = formData.get("nextAppointment") as string;
        const nextTime = ((formData.get("nextAppointmentTime") as string) || "09:30").trim();
        if (nextDate) {
          await createAppointment(patient.id, nextDate, nextTime, "Consultation de contrôle");
        }
      }

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
    id: "dossier" | "ordonnance" | "cloture" | "history";
    step: string;
    label: string;
    icon: string;
    badge?: number;
  }[] = [
    { id: "dossier", step: "1", label: "Examen clinique", icon: "stethoscope" },
    {
      id: "ordonnance",
      step: "2",
      label: "Prescription / Ordonnance",
      icon: "prescriptions",
      badge: medicines.filter((m) => m.name.trim()).length || undefined,
    },
    { id: "cloture", step: "3", label: "Honoraires & Clôture", icon: "payments" },
    ...(hasHistory
      ? [{ id: "history" as const, step: "Dossier", label: "Historique patient", icon: "history_edu", badge: pastVisits.length }]
      : []),
  ];

  const vitalsFields = consultationFields.filter((f) => f.section === "vitals");

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden relative">
      {/* Toast discret de confirmation */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-slate-900 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold">
              <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          1. COCKPIT SUPÉRIEUR UNIFIÉ : PATIENT + ALERTES + ACTIONS CLÉS
          (Aucun besoin de défiler en bas : le bouton d'action principal
           est TOUJOURS visible et cliquable immédiatement ici !)
         ============================================================ */}
      <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Identité Patient & Repères Cliniques */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            {patient.firstName[0]}
            {patient.lastName[0]}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {patient.lastName} {patient.firstName}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold tabular-nums">
                Visite #{visitId}
              </span>

              {hasHistory ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "history" ? "dossier" : "history")}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                    activeTab === "history"
                      ? "bg-slate-900 text-white"
                      : "bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200"
                  }`}
                  title="Voir les consultations précédentes de ce patient"
                >
                  <span className="material-symbols-outlined text-[14px]">history_edu</span>
                  <span>Historique ({pastVisits.length})</span>
                </button>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  1ère visite
                </span>
              )}

              {/* Alertes médicales critiques visibles dès l'en-tête */}
              {patient.allergies && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold"
                  title={`Allergies : ${patient.allergies}`}
                >
                  <span className="material-symbols-outlined text-[13px] text-rose-600">warning</span>
                  <span className="truncate max-w-[160px]">Allergie : {patient.allergies}</span>
                </span>
              )}

              {patient.antecedents && !patient.allergies && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold"
                  title={`Antécédents : ${patient.antecedents}`}
                >
                  <span className="material-symbols-outlined text-[13px] text-amber-600">info</span>
                  <span className="truncate max-w-[160px]">Antécédent : {patient.antecedents}</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500 mt-0.5">
              <span className="font-medium text-slate-700">{patient.age} ans</span>
              {patient.gender && (
                <span>• {patient.gender === "F" ? "Femme" : "Homme"}</span>
              )}
              <span>•</span>
              <span className="whitespace-nowrap tabular-nums font-medium text-slate-700">
                Tél. {patient.phone}
              </span>
              {patient.bloodGroup && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-rose-700">Groupe {patient.bloodGroup}</span>
                </>
              )}
              {patient.mutuelle && (
                <>
                  <span>•</span>
                  <span className="font-medium text-slate-700">{patient.mutuelle}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls & LE BOUTON D'ACTION PRINCIPAL (Visible sans scroller !) */}
        <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
          {activeTab === "dossier" && (
            <button
              type="button"
              disabled={isSavingDossier}
              onClick={() => handleSaveDossier()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 whitespace-nowrap disabled:opacity-50"
            >
              <span>{isSavingDossier ? "Enregistrement..." : "Enregistrer & Ordonnance"}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          )}

          {activeTab === "ordonnance" && (
            <button
              type="button"
              onClick={() => handleSavePrescription("none")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <span>Passer à la clôture</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          )}

          {activeTab === "cloture" && (
            <button
              type="button"
              disabled={isFinishing}
              onClick={() => handleFinish()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 whitespace-nowrap disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{isFinishing ? "Clôture en cours..." : "Clôturer la visite"}</span>
            </button>
          )}

          {activeTab === "history" && (
            <button
              type="button"
              onClick={() => setActiveTab("dossier")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>Reprendre l'examen</span>
            </button>
          )}

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            title="Sortir de la consultation (reste active jusqu'à clôture)"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span className="hidden sm:inline">Quitter</span>
          </Link>
        </div>
      </div>

      {/* ============================================================
          2. STEPPER DE NAVIGATION UNIFIÉ (ÉTAPES 1 -> 2 -> 3)
         ============================================================ */}
      <div className="px-4 sm:px-6 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1 -mb-px">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "border-slate-900 text-slate-900 bg-white shadow-2xs rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-lg"
                }`}
              >
                <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  isActive ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  {tab.step}
                </span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 pr-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Fiche active enregistrée en direct</span>
        </div>
      </div>

      {/* ============================================================
          ONGLET 1 : EXAMEN DU JOUR (LAYOUT ZERO-SCROLL EN 2 COLONNES)
         ============================================================ */}
      {activeTab === "dossier" && (
        <form
          id="consultation-dossier-form"
          onSubmit={handleSaveDossier}
          className="p-4 sm:p-5 space-y-3.5"
        >
          {/* Bandeau Constantes vitales ultra-compact (1 seule ligne horizontale propre) */}
          {vitalsFields.length > 0 && (
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-2.5 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-slate-500">
                    monitor_heart
                  </span>
                  <span>Constantes & Mesures</span>
                </span>

                <div className="flex items-center gap-3">
                  {bmi && (
                    <span className="text-xs font-bold text-sky-700 tabular-nums bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                      IMC : {bmi} kg/m²
                    </span>
                  )}
                  <Link
                    href="/dashboard/settings"
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-0.5"
                    title="Gérer les constantes médicales du cabinet"
                  >
                    <span className="material-symbols-outlined text-[13px]">tune</span>
                    <span>Gérer</span>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {vitalsFields.map((field) => (
                  <div key={field.id} className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {field.label} {field.unit ? `(${field.unit})` : ""}
                    </span>
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={
                        fieldValues[field.id] ??
                        (field.systemKey ? fieldValues[field.systemKey] : "") ??
                        ""
                      }
                      onChange={(e) => setFieldValue(field.id, e.target.value)}
                      placeholder={field.placeholder || ""}
                      className="w-full pt-5 pb-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 transition shadow-2xs tabular-nums"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Espace Clinique Ergonomique en 2 Colonnes (tout tient sur l'écran sans scroller !) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* Colonne Gauche : Motif & Diagnostic */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-slate-500">
                    stethoscope
                  </span>
                  <span>Motif de consultation & Symptômes</span>
                </label>
                <input
                  type="text"
                  value={fieldValues.disease || ""}
                  onChange={(e) => setFieldValue("disease", e.target.value)}
                  placeholder="Ex: Céphalées aiguës, fièvre depuis 48h, bilan de contrôle..."
                  className="w-full px-3 py-2 text-xs font-medium bg-white rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-slate-500">
                    clinical_notes
                  </span>
                  <span>Diagnostic & Examen Clinique</span>
                </label>
                <textarea
                  rows={4}
                  value={fieldValues.diagnosis || ""}
                  onChange={(e) => setFieldValue("diagnosis", e.target.value)}
                  placeholder="Observations cliniques, auscultation, palpation, conclusions..."
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 shadow-2xs resize-y leading-relaxed"
                />
              </div>
            </div>

            {/* Colonne Droite : Notes confidentielles + Repères Terrain */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-slate-500">
                    lock
                  </span>
                  <span>Notes Personnelles & Recommandations (Confidentiel)</span>
                </label>
                <textarea
                  rows={4}
                  value={fieldValues.notes || ""}
                  onChange={(e) => setFieldValue("notes", e.target.value)}
                  placeholder="Notes de suivi interne, bilans prescrits, consignes..."
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 shadow-2xs resize-y leading-relaxed"
                />
              </div>

              {/* Repères Terrain sous les yeux du médecin */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Repères terrain patient
                </span>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-600">
                  <span>
                    Groupe : <strong>{patient.bloodGroup || "Non renseigné"}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Allergies :{" "}
                    <strong className={patient.allergies ? "text-rose-700" : "text-slate-700"}>
                      {patient.allergies || "Aucune"}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Antécédents :{" "}
                    <strong className={patient.antecedents ? "text-amber-800" : "text-slate-700"}>
                      {patient.antecedents || "Aucun"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pied de formulaire Examen */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Remplissez les champs nécessaires puis passez à l'étape suivante.
            </span>
            <button
              type="submit"
              disabled={isSavingDossier}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ml-auto disabled:opacity-50"
            >
              <span>{isSavingDossier ? "Enregistrement..." : "Enregistrer et passer à l'ordonnance"}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================
          ONGLET 2 : ORDONNANCE MÉDICALE
         ============================================================ */}
      {activeTab === "ordonnance" && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Barre d'outils Ordonnance (Ajout + Impression + PDF) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addMedicine}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Ajouter un médicament</span>
              </button>

              {settings?.prescriptionTemplateUrl && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Template personnalisé
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleSavePrescription("none")}
                className="px-3 py-1.5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Enregistrer
              </button>

              <button
                type="button"
                onClick={() => handleSavePrescription("pdf")}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                <span>Télécharger PDF</span>
              </button>

              <button
                type="button"
                onClick={() => handleSavePrescription("print")}
                className="inline-flex items-center gap-1.5 bg-sky-700 hover:bg-sky-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">print</span>
                <span>Imprimer</span>
              </button>

              <button
                type="button"
                onClick={() => handleSavePrescription("none")}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <span>Passer à la clôture</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Liste des médicaments */}
          {medicines.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <span className="material-symbols-outlined text-2xl">prescriptions</span>
              </div>
              <p className="text-xs font-bold text-slate-700">Aucun médicament prescrit</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={addMedicine}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Ajouter le premier médicament</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("cloture")}
                  className="px-4 py-2 text-slate-600 font-semibold text-xs hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Sans ordonnance →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {medicines.map((med, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <MedicalAutocomplete
                      value={med.name}
                      onChange={(val) => updateMedicine(i, "name", val)}
                      onSelectInstruction={(inst) => updateMedicine(i, "instructions", inst)}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={med.instructions}
                      onChange={(e) => updateMedicine(i, "instructions", e.target.value)}
                      placeholder="Posologie & durée (ex: 1 cp matin et soir pendant 7 jours)"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setMedicines(medicines.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0 self-end sm:self-center"
                    title="Supprimer ce médicament"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          ONGLET 3 : HONORAIRES & CLÔTURE DE CONSULTATION
         ============================================================ */}
      {activeTab === "cloture" && (
        <form
          id="consultation-finish-form"
          onSubmit={handleFinish}
          className="p-4 sm:p-6 max-w-xl mx-auto space-y-5"
        >
          <div className="pb-3 border-b border-slate-200/80">
            <h2 className="text-sm font-bold text-slate-900">Honoraires & Clôture de la visite</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Le montant sera transmis automatiquement à l'accueil pour encaissement par l'assistante.
            </p>
          </div>

          <div className="space-y-4">
            {/* Montant des honoraires avec raccourcis rapides en 1 clic */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
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
                  className="w-full pr-14 pl-4 py-2.5 text-xl font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none tabular-nums shadow-2xs"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  DH
                </span>
              </div>

              {/* Raccourcis montants en 1 clic */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 mr-1">Tarifs usuels :</span>
                {["150", "200", "250", "300", "400"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      amount === preset
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {preset} DH
                  </button>
                ))}
              </div>
            </div>

            {/* Mode de règlement prévu */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Mode de règlement prévu
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "cash", label: "Espèces", icon: "payments" },
                  { id: "card", label: "Carte bancaire", icon: "credit_card" },
                  { id: "check", label: "Chèque", icon: "fact_check" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      paymentMethod === m.id
                        ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prochain RDV de contrôle */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Prochain rendez-vous de contrôle <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  name="nextAppointment"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
                />
                <input
                  type="time"
                  name="nextAppointmentTime"
                  defaultValue="10:00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => triggerPrint("receipt")}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>Imprimer reçu</span>
            </button>

            <button
              type="submit"
              disabled={isFinishing}
              className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{isFinishing ? "Clôture en cours..." : "Clôturer et envoyer à l'assistante"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================
          ONGLET 0 : HISTORIQUE PATIENT & VISITES ANTÉRIEURES
         ============================================================ */}
      {activeTab === "history" && hasHistory && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Historique des visites antérieures ({filteredPastVisits.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultez les ordonnances, diagnostics et constantes des visites passées.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined text-[16px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="space-y-3">
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
                <div key={pv.id} className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleVisitExpand(pv.id)}
                    className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between gap-2 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {pastVisits.length - idx}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900">
                          {formatVisitDateTime(pv.date)}
                        </span>
                        {pv.disease && (
                          <span className="text-xs text-slate-500 ml-2 font-medium">
                            — {pv.disease}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {pv.medicines.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold">
                          {pv.medicines.length} médicament{pv.medicines.length > 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="material-symbols-outlined text-[18px] text-slate-400">
                        {isOpen ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-4 space-y-3 border-t border-slate-100 text-xs">
                      {vitalsList.length > 0 && (
                        <div className="flex flex-wrap gap-4 p-2.5 rounded-lg bg-slate-50">
                          {vitalsList.map((vt) => (
                            <div key={vt.label}>
                              <span className="text-[10px] text-slate-400 block">{vt.label}</span>
                              <span className="font-bold text-slate-900">{vt.val}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {pv.diagnosis && (
                        <div>
                          <span className="font-bold text-slate-700 block mb-0.5">Diagnostic :</span>
                          <p className="text-slate-800 leading-relaxed whitespace-pre-line">{pv.diagnosis}</p>
                        </div>
                      )}

                      {pv.medicines.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-slate-700">Prescription :</span>
                            <button
                              type="button"
                              onClick={() => handleRenewPrescription(pv.medicines)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[13px]">content_copy</span>
                              <span>Reconduire dans l'ordonnance</span>
                            </button>
                          </div>
                          <ul className="space-y-1">
                            {pv.medicines.map((m, mIdx) => (
                              <li key={mIdx} className="flex items-baseline gap-1.5">
                                <span className="text-slate-400">•</span>
                                <strong className="text-slate-900">{m.name}</strong>
                                {m.instructions && <span className="text-slate-500">— {m.instructions}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Impression Invisible Ordonnance */}
      {printDoc === "prescription" && (
        <PrescriptionPDF
          patient={patient}
          medicines={medicines.filter((m) => m.name.trim().length > 0)}
          date={new Date()}
          settings={settings}
        />
      )}

      {/* Impression Invisible Reçu */}
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
