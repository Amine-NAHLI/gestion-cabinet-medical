"use client";

import { useState, useRef } from "react";
import {
  updateClinicSettings,
  updateConsultationFields,
  updatePrescriptionTemplate,
  exportClinicPatientsData,
} from "@/actions/settings";
import {
  ConsultationFieldConfig,
  ConsultationFieldType,
  PrescriptionTemplateLayout,
  DEFAULT_CONSULTATION_FIELDS,
  DEFAULT_PRESCRIPTION_LAYOUT,
} from "@/lib/consultationConfig";
import {
  convertFileToTemplateImage,
  downloadFilledPrescriptionPdf,
} from "@/lib/prescriptionTemplateUtils";
import { motion, AnimatePresence } from "framer-motion";

interface SettingsClientProps {
  role: string;
  initialSettings: {
    clinicName: string;
    doctorName: string;
    specialty: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    avatarUrl?: string | null;
    bio?: string | null;
    orderNumber: string | null;
    taxId: string | null;
    defaultFee: string | null;
    consultationFields: ConsultationFieldConfig[];
    prescriptionTemplateUrl: string | null;
    prescriptionTemplateName: string | null;
    prescriptionTemplateLayout: PrescriptionTemplateLayout;
    subscription?: {
      plan: string;
      billingCycle: string;
      planPrice: number;
      subscriptionExpiresAt: string | null;
      subscriptionStatus: string;
      daysRemaining: number;
    };
  };
}

const FIELD_TYPE_LABELS: Record<ConsultationFieldType, string> = {
  text: "Texte court",
  textarea: "Texte long",
  number: "Nombre",
  select: "Liste de choix",
  checkbox: "Oui / Non",
  date: "Date",
};

export default function SettingsClient({
  role,
  initialSettings,
}: SettingsClientProps) {
  const isDoctor = role === "doctor";
  const [activeTab, setActiveTab] = useState<"general" | "fields" | "template" | "subscription">("general");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [fields, setFields] = useState<ConsultationFieldConfig[]>(
    initialSettings.consultationFields?.length > 0
      ? initialSettings.consultationFields
      : DEFAULT_CONSULTATION_FIELDS
  );
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newField, setNewField] = useState<{
    label: string;
    type: ConsultationFieldType;
    section: "vitals" | "clinical";
    unit: string;
    placeholder: string;
    optionsText: string;
    required: boolean;
  }>({
    label: "",
    type: "text",
    section: "clinical",
    unit: "",
    placeholder: "",
    optionsText: "",
    required: false,
  });

  const [templateUrl, setTemplateUrl] = useState<string | null>(
    initialSettings.prescriptionTemplateUrl || null
  );
  const [templateName, setTemplateName] = useState<string | null>(
    initialSettings.prescriptionTemplateName || null
  );
  const [layout, setLayout] = useState<PrescriptionTemplateLayout>(
    initialSettings.prescriptionTemplateLayout || DEFAULT_PRESCRIPTION_LAYOUT
  );
  const [isConvertingFile, setIsConvertingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Profil praticien (Avatar & Bio)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialSettings.avatarUrl || null);
  const [bio, setBio] = useState<string>(initialSettings.bio || "");
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Veuillez sélectionner un fichier image (PNG, JPG, WEBP).", "error");
      return;
    }
    setIsProcessingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 320;
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          const canvas = document.createElement("canvas");
          canvas.width = Math.min(minDim, maxDim);
          canvas.height = Math.min(minDim, maxDim);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/webp", 0.88);
            setAvatarUrl(dataUrl);
            showToast("Photo sélectionnée (cliquez sur Enregistrer pour valider)");
          }
          setIsProcessingAvatar(false);
        };
        img.onerror = () => {
          setIsProcessingAvatar(false);
          showToast("Erreur lors du traitement de l'image.", "error");
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsProcessingAvatar(false);
      showToast("Impossible de lire l'image.", "error");
    }
  }

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSaveGeneral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await updateClinicSettings(formData);
    setIsLoading(false);
    if (res.success) {
      showToast("Coordonnées du cabinet enregistrées");
    } else {
      showToast(res.error || "Erreur lors de la sauvegarde.", "error");
    }
  }

  function handleAddField(e: React.FormEvent) {
    e.preventDefault();
    if (!newField.label.trim()) {
      showToast("Veuillez saisir un nom pour cette case.", "error");
      return;
    }

    const parsedOptions =
      newField.type === "select"
        ? newField.optionsText
            .split(/[\n,]/)
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    if (newField.type === "select" && (!parsedOptions || parsedOptions.length < 2)) {
      showToast("Ajoutez au moins 2 choix séparés par des virgules.", "error");
      return;
    }

    const created: ConsultationFieldConfig = {
      id: `custom_${Date.now()}`,
      label: newField.label.trim(),
      type: newField.type,
      section: newField.section,
      unit: newField.unit.trim() || undefined,
      placeholder: newField.placeholder.trim() || undefined,
      options: parsedOptions,
      required: newField.required,
    };

    setFields((prev) => [...prev, created]);
    setNewField({
      label: "",
      type: "text",
      section: "clinical",
      unit: "",
      placeholder: "",
      optionsText: "",
      required: false,
    });
    setShowAddForm(false);
    showToast(`Case « ${created.label} » ajoutée — pensez à enregistrer.`);
  }

  function handleUpdateField(id: string, patch: Partial<ConsultationFieldConfig>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function handleDeleteField(id: string) {
    if (fields.length <= 1) {
      showToast("Conservez au moins une case dans la fiche.", "error");
      return;
    }
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (editingFieldId === id) setEditingFieldId(null);
  }

  function handleMoveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    setFields((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  }

  async function handleSaveFields() {
    setIsLoading(true);
    const res = await updateConsultationFields(fields);
    setIsLoading(false);
    if (res.success) {
      setEditingFieldId(null);
      showToast("Cases de consultation enregistrées");
    } else {
      showToast(res.error || "Erreur lors de l'enregistrement.", "error");
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsConvertingFile(true);
    try {
      const dataUrl = await convertFileToTemplateImage(file);
      setTemplateUrl(dataUrl);
      setTemplateName(file.name);
      showToast(`Modèle « ${file.name} » importé — ajustez puis enregistrez.`);
    } catch (err: any) {
      showToast(err?.message || "Impossible de traiter ce fichier.", "error");
    } finally {
      setIsConvertingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSaveTemplate() {
    setIsLoading(true);
    const res = await updatePrescriptionTemplate({
      templateUrl,
      templateName,
      layout,
    });
    setIsLoading(false);
    if (res.success) {
      showToast("Template d'ordonnance enregistré");
    } else {
      showToast(res.error || "Erreur lors de la sauvegarde.", "error");
    }
  }

  async function handleRemoveTemplate() {
    setTemplateUrl(null);
    setTemplateName(null);
    setLayout(DEFAULT_PRESCRIPTION_LAYOUT);
    setIsLoading(true);
    const res = await updatePrescriptionTemplate({
      templateUrl: null,
      templateName: null,
      layout: DEFAULT_PRESCRIPTION_LAYOUT,
    });
    setIsLoading(false);
    if (res.success) {
      showToast("Modèle standard MonCabinet rétabli");
    }
  }

  function handleTestDownloadPdf() {
    downloadFilledPrescriptionPdf({
      patient: {
        firstName: "Ahmed",
        lastName: "Benali",
        age: 42,
        cin: "BE123456",
        mutuelle: "CNSS",
      },
      medicines: [
        {
          name: "AMOXICILLINE 1G CP",
          instructions: "1 comprimé matin et soir pendant 7 jours après les repas",
        },
        {
          name: "DOLIPRANE 1000MG CP",
          instructions: "1 comprimé en cas de douleur ou fièvre (max 3/jour)",
        },
      ],
      date: new Date(),
      settings: {
        ...initialSettings,
        prescriptionTemplateUrl: templateUrl,
        prescriptionTemplateLayout: layout,
      },
    });
  }

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await exportClinicPatientsData();
      if (!res?.success || !res.csv) {
        showToast("Erreur lors de l'export des données.", "error");
        return;
      }
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Export de ${res.count} patients réussi !`);
    } catch (err: any) {
      showToast(err?.message || "Erreur lors de l'exportation.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const demoDateStr = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition";

  return (
    <div className="space-y-6">
      {/* Toast discret */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 ${
              toast.type === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {toast.type === "error" ? "error" : "check_circle"}
            </span>
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onglets sobres à soulignement */}
      <div className="border-b border-slate-200/90 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-[13px] border-b-2 -mb-px transition cursor-pointer whitespace-nowrap ${
            activeTab === "general"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 font-medium hover:text-slate-800"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">business</span>
          <span>Infos du cabinet</span>
        </button>

        {isDoctor && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("fields")}
              className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-[13px] border-b-2 -mb-px transition cursor-pointer whitespace-nowrap ${
                activeTab === "fields"
                  ? "border-slate-900 text-slate-900 font-semibold"
                  : "border-transparent text-slate-500 font-medium hover:text-slate-800"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">dynamic_form</span>
              <span>Cases fiche patient</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold tabular-nums">
                {fields.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("template")}
              className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-[13px] border-b-2 -mb-px transition cursor-pointer whitespace-nowrap ${
                activeTab === "template"
                  ? "border-slate-900 text-slate-900 font-semibold"
                  : "border-transparent text-slate-500 font-medium hover:text-slate-800"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">description</span>
              <span>Template d'ordonnance</span>
              {templateUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </button>
          </>
        )}

        {/* ONGLET 4 : ABONNEMENT (VISIBLE PAR LE PRATICIEN) */}
        {isDoctor && (
          <button
            type="button"
            onClick={() => setActiveTab("subscription")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-[13px] border-b-2 -mb-px transition cursor-pointer whitespace-nowrap ${
              activeTab === "subscription"
                ? "border-slate-900 text-slate-900 font-semibold"
                : "border-transparent text-slate-500 font-medium hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">verified</span>
            <span>Mon Abonnement</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              initialSettings.subscription?.plan === 'standard'
                ? 'bg-sky-100 text-sky-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {initialSettings.subscription?.plan === 'standard' ? 'Standard' : 'Pro ⭐'}
            </span>
          </button>
        )}
      </div>

      {/* ============================================================
          ONGLET 1 : COORDONNÉES DU CABINET & PROFIL
         ============================================================ */}
      {activeTab === "general" && (
        <form
          onSubmit={handleSaveGeneral}
          className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] divide-y divide-slate-200/80"
        >
          {/* Section Profil Praticien (Avatar & Bio) */}
          <div className="p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Photo de profil & Présentation</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Visible par vos confrères sur la communauté médicale et la messagerie privée.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-1">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center shadow-xs">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Photo du médecin"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-400 text-3xl font-bold uppercase">
                      {initialSettings.doctorName?.replace(/^Dr\.?\s*/i, "")?.[0] || "M"}
                    </span>
                  )}
                </div>
                {isProcessingAvatar && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white animate-spin text-xl">
                      progress_activity
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <input type="hidden" name="avatarUrl" value={avatarUrl || ""} />

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isProcessingAvatar}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-500">
                      photo_camera
                    </span>
                    <span>{avatarUrl ? "Changer la photo" : "Ajouter une photo"}</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl("")}
                      className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 text-xs font-semibold text-red-600 inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Formats acceptés : JPG, PNG, WEBP. Recadré automatiquement au format carré.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Présentation / Biographie confraternelle
              </label>
              <textarea
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Ex : Médecin spécialiste, disponible pour avis confraternels et prises en charge coordonnées..."
                className={`${inputCls} resize-none`}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Présentez succinctement vos diplômes, expertises ou sur-spécialités à vos confrères.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Identité du praticien</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Affichée sur les quittances et sur le modèle d'ordonnance standard.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nom du médecin *
                </label>
                <input
                  type="text"
                  name="doctorName"
                  defaultValue={initialSettings.doctorName}
                  required
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Spécialité médicale *
                </label>
                <input
                  type="text"
                  name="specialty"
                  defaultValue={initialSettings.specialty}
                  required
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nom du cabinet *
                </label>
                <input
                  type="text"
                  name="clinicName"
                  defaultValue={initialSettings.clinicName}
                  required
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Coordonnées & facturation</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Contacts, adresse, identifiants professionnels et tarif par défaut.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone *</label>
                <input
                  type="text"
                  name="phone"
                  defaultValue={initialSettings.phone}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={initialSettings.email}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Adresse *</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={initialSettings.address}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ville *</label>
                <input
                  type="text"
                  name="city"
                  defaultValue={initialSettings.city}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  INPE / N° Ordre
                </label>
                <input
                  type="text"
                  name="orderNumber"
                  defaultValue={initialSettings.orderNumber || ""}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Identifiants fiscaux (ICE / IF)
                </label>
                <input
                  type="text"
                  name="taxId"
                  defaultValue={initialSettings.taxId || ""}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tarif consultation par défaut (DH)
                </label>
                <input
                  type="number"
                  step="10"
                  name="defaultFee"
                  defaultValue={
                    initialSettings.defaultFee ? String(parseFloat(initialSettings.defaultFee)) : "250"
                  }
                  className={`${inputCls} tabular-nums font-semibold`}
                />
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-6 py-4 bg-slate-50/70 flex justify-end rounded-b-xl">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{isLoading ? "Enregistrement..." : "Enregistrer"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================
          ONGLET 2 : CONSTRUCTEUR DE CASES FICHE CONSULTATION
         ============================================================ */}
      {activeTab === "fields" && isDoctor && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Cases de la fiche consultation ({fields.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Modifiez l'ordre, supprimez ou ajoutez des champs adaptés à votre spécialité.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer self-start sm:self-center"
            >
              <span className="material-symbols-outlined text-[16px]">
                {showAddForm ? "close" : "add"}
              </span>
              <span>{showAddForm ? "Fermer" : "Ajouter une case"}</span>
            </button>
          </div>

          {/* Formulaire d'ajout */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleAddField}
                className="p-5 bg-slate-50 border-b border-slate-200/80 space-y-4"
              >
                <p className="text-xs font-semibold text-slate-900">Nouvelle case</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nom *</label>
                    <input
                      type="text"
                      required
                      value={newField.label}
                      onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))}
                      placeholder="Ex: Glycémie, Douleur..."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                    <select
                      value={newField.type}
                      onChange={(e) =>
                        setNewField((p) => ({
                          ...p,
                          type: e.target.value as ConsultationFieldType,
                        }))
                      }
                      className={inputCls}
                    >
                      <option value="text">Texte court</option>
                      <option value="textarea">Texte long</option>
                      <option value="number">Nombre / Mesure</option>
                      <option value="select">Liste de sélection</option>
                      <option value="checkbox">Case Oui / Non</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Section</label>
                    <select
                      value={newField.section}
                      onChange={(e) =>
                        setNewField((p) => ({
                          ...p,
                          section: e.target.value as "vitals" | "clinical",
                        }))
                      }
                      className={inputCls}
                    >
                      <option value="vitals">Constantes & mesures</option>
                      <option value="clinical">Examen clinique</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(newField.type === "number" || newField.type === "text") && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Unité (optionnel)
                      </label>
                      <input
                        type="text"
                        value={newField.unit}
                        onChange={(e) => setNewField((p) => ({ ...p, unit: e.target.value }))}
                        placeholder="Ex: g/L, %, mmHg"
                        className={inputCls}
                      />
                    </div>
                  )}

                  {newField.type === "select" && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Choix de la liste (séparés par des virgules) *
                      </label>
                      <input
                        type="text"
                        required
                        value={newField.optionsText}
                        onChange={(e) =>
                          setNewField((p) => ({ ...p, optionsText: e.target.value }))
                        }
                        placeholder="Ex: Léger, Modéré, Sévère"
                        className={inputCls}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newField.required}
                      onChange={(e) => setNewField((p) => ({ ...p, required: e.target.checked }))}
                      className="w-4 h-4 rounded text-slate-900"
                    />
                    <span>Champ obligatoire</span>
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
                  >
                    Ajouter à la liste
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Liste propre en lignes séparées */}
          <div className="divide-y divide-slate-100">
            {fields.map((field, index) => {
              const isEditing = editingFieldId === field.id;

              return (
                <div key={field.id} className={isEditing ? "bg-slate-50/70 p-4 sm:px-5" : "px-4 sm:px-5 py-3.5 hover:bg-slate-50/50 transition"}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveField(index, -1)}
                          disabled={index === 0}
                          className="w-6 h-6 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-800 flex items-center justify-center disabled:opacity-25 cursor-pointer"
                          title="Monter"
                        >
                          <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveField(index, 1)}
                          disabled={index === fields.length - 1}
                          className="w-6 h-6 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-800 flex items-center justify-center disabled:opacity-25 cursor-pointer"
                          title="Descendre"
                        >
                          <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                        </button>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {field.label}
                            {field.unit ? <span className="text-slate-400"> ({field.unit})</span> : ""}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {FIELD_TYPE_LABELS[field.type]}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            • {field.section === "vitals" ? "Constantes" : "Examen"}
                          </span>
                          {field.required && (
                            <span className="text-[11px] text-red-600 font-medium">• Obligatoire</span>
                          )}
                        </div>
                        {field.type === "select" && field.options && field.options.length > 0 && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            Choix : {field.options.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingFieldId(isEditing ? null : field.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
                      >
                        {isEditing ? "Terminer" : "Modifier"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteField(field.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Supprimer"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-medium text-slate-600 mb-1">Nom</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-600 mb-1">Type</label>
                        <select
                          value={field.type}
                          onChange={(e) =>
                            handleUpdateField(field.id, {
                              type: e.target.value as ConsultationFieldType,
                              options:
                                e.target.value === "select" && (!field.options || field.options.length === 0)
                                  ? ["Option 1", "Option 2"]
                                  : field.options,
                            })
                          }
                          className={inputCls}
                        >
                          <option value="text">Texte court</option>
                          <option value="textarea">Texte long</option>
                          <option value="number">Nombre</option>
                          <option value="select">Liste de choix</option>
                          <option value="checkbox">Oui / Non</option>
                          <option value="date">Date</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-slate-600 mb-1">Section</label>
                        <select
                          value={field.section}
                          onChange={(e) =>
                            handleUpdateField(field.id, {
                              section: e.target.value as "vitals" | "clinical",
                            })
                          }
                          className={inputCls}
                        >
                          <option value="vitals">Constantes & mesures</option>
                          <option value="clinical">Examen clinique</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-slate-600 mb-1">Unité</label>
                        <input
                          type="text"
                          value={field.unit || ""}
                          onChange={(e) => handleUpdateField(field.id, { unit: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-600 mb-1">Exemple (placeholder)</label>
                        <input
                          type="text"
                          value={field.placeholder || ""}
                          onChange={(e) =>
                            handleUpdateField(field.id, { placeholder: e.target.value })
                          }
                          className={inputCls}
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="inline-flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(field.required)}
                            onChange={(e) =>
                              handleUpdateField(field.id, { required: e.target.checked })
                            }
                            className="w-4 h-4 rounded text-slate-900"
                          />
                          <span>Obligatoire</span>
                        </label>
                      </div>
                      {field.type === "select" && (
                        <div className="sm:col-span-3">
                          <label className="block font-medium text-slate-600 mb-1">
                            Choix de la liste (séparés par des virgules)
                          </label>
                          <input
                            type="text"
                            value={(field.options || []).join(", ")}
                            onChange={(e) =>
                              handleUpdateField(field.id, {
                                options: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            className={inputCls}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-5 py-4 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setFields(DEFAULT_CONSULTATION_FIELDS);
                setEditingFieldId(null);
                showToast("Cases par défaut rétablies — cliquez sur Enregistrer.");
              }}
              className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition cursor-pointer"
            >
              Rétablir par défaut
            </button>

            <button
              type="button"
              onClick={handleSaveFields}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{isLoading ? "Enregistrement..." : "Enregistrer mes cases"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          ONGLET 3 : TEMPLATE D'ORDONNANCE (PHOTO OU PDF)
         ============================================================ */}
      {activeTab === "template" && isDoctor && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Votre modèle d'ordonnance</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Importez votre papier à en-tête (Photo PNG/JPG ou PDF). Les ordonnances s'y rempliront automatiquement.
              </p>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isConvertingFile}
                className="w-full p-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-100/70 transition flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-2xl text-slate-500">
                  {isConvertingFile ? "hourglass_top" : "upload_file"}
                </span>
                <p className="text-xs font-semibold text-slate-900">
                  {isConvertingFile
                    ? "Conversion en cours..."
                    : templateUrl
                    ? "Remplacer le fichier (Photo ou PDF)"
                    : "Choisir une photo ou un PDF"}
                </p>
                {templateName && (
                  <p className="text-[11px] text-slate-500 truncate max-w-full">{templateName}</p>
                )}
              </button>
            </div>

            {templateUrl && (
              <div className="space-y-4 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Format papier</span>
                  <div className="flex gap-1.5">
                    {(["A4", "A5"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setLayout((l) => ({ ...l, paperSize: fmt }))}
                        className={`px-3 py-1 rounded-md text-xs font-medium border cursor-pointer ${
                          layout.paperSize === fmt
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-700">Afficher patient & date</span>
                  <input
                    type="checkbox"
                    checked={layout.showPatientInfo}
                    onChange={(e) =>
                      setLayout((l) => ({ ...l, showPatientInfo: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-slate-900"
                  />
                </label>

                {layout.showPatientInfo && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                        <span>Patient (haut)</span>
                        <span className="tabular-nums">{layout.patientTop}%</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={60}
                        value={layout.patientTop}
                        onChange={(e) =>
                          setLayout((l) => ({ ...l, patientTop: Number(e.target.value) }))
                        }
                        className="w-full accent-slate-900"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                        <span>Patient (gauche)</span>
                        <span className="tabular-nums">{layout.patientLeft}%</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={50}
                        value={layout.patientLeft}
                        onChange={(e) =>
                          setLayout((l) => ({ ...l, patientLeft: Number(e.target.value) }))
                        }
                        className="w-full accent-slate-900"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                      <span>Zone médicaments (haut)</span>
                      <span className="tabular-nums">{layout.medsTop}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={75}
                      value={layout.medsTop}
                      onChange={(e) =>
                        setLayout((l) => ({ ...l, medsTop: Number(e.target.value) }))
                      }
                      className="w-full accent-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                        <span>Marge gauche</span>
                        <span className="tabular-nums">{layout.medsLeft}%</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={35}
                        value={layout.medsLeft}
                        onChange={(e) =>
                          setLayout((l) => ({ ...l, medsLeft: Number(e.target.value) }))
                        }
                        className="w-full accent-slate-900"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                        <span>Marge droite</span>
                        <span className="tabular-nums">{layout.medsRight}%</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={35}
                        value={layout.medsRight}
                        onChange={(e) =>
                          setLayout((l) => ({ ...l, medsRight: Number(e.target.value) }))
                        }
                        className="w-full accent-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                      <span>Taille du texte</span>
                      <span className="tabular-nums">{layout.fontSize} px</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={20}
                      value={layout.fontSize}
                      onChange={(e) =>
                        setLayout((l) => ({ ...l, fontSize: Number(e.target.value) }))
                      }
                      className="w-full accent-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer disabled:opacity-60"
              >
                {isLoading ? "Enregistrement..." : "Enregistrer ce template"}
              </button>

              {templateUrl && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleTestDownloadPdf}
                    className="py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition cursor-pointer"
                  >
                    Tester PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveTemplate}
                    disabled={isLoading}
                    className="py-2 px-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-medium transition cursor-pointer"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Aperçu en direct */}
          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Aperçu en direct</h3>
              <span className="text-xs text-slate-500">
                {templateUrl ? `Format ${layout.paperSize}` : "Modèle standard"}
              </span>
            </div>

            {templateUrl ? (
              <div className="w-full max-w-[460px] mx-auto relative rounded-lg border border-slate-300 shadow-sm overflow-hidden bg-white aspect-[210/297]">
                <img
                  src={templateUrl}
                  alt="Aperçu du modèle d'ordonnance"
                  className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
                />

                {layout.showPatientInfo && (
                  <div
                    className="absolute z-10 text-slate-900 pointer-events-none"
                    style={{
                      top: `${layout.patientTop}%`,
                      left: `${layout.patientLeft}%`,
                      right: `${layout.medsRight}%`,
                    }}
                  >
                    <p
                      className="font-bold uppercase leading-tight"
                      style={{ fontSize: `${Math.max(8, layout.fontSize * 0.68)}px` }}
                    >
                      Patient(e) : BENALI AHMED (42 ans)
                    </p>
                    <p
                      className="text-slate-700"
                      style={{ fontSize: `${Math.max(7, (layout.fontSize - 2) * 0.68)}px` }}
                    >
                      {initialSettings.city}, le {demoDateStr}
                    </p>
                  </div>
                )}

                <div
                  className="absolute z-10 space-y-2.5 text-slate-900 pointer-events-none"
                  style={{
                    top: `${layout.medsTop}%`,
                    left: `${layout.medsLeft}%`,
                    right: `${layout.medsRight}%`,
                  }}
                >
                  <div>
                    <p
                      className="font-bold uppercase leading-snug"
                      style={{ fontSize: `${Math.max(8, (layout.fontSize + 1) * 0.68)}px` }}
                    >
                      01. AMOXICILLINE 1G CP
                    </p>
                    <p
                      className="italic text-slate-700 pl-2 border-l border-slate-400"
                      style={{ fontSize: `${Math.max(7, (layout.fontSize - 1) * 0.68)}px` }}
                    >
                      1 comprimé matin et soir pendant 7 jours
                    </p>
                  </div>
                  <div>
                    <p
                      className="font-bold uppercase leading-snug"
                      style={{ fontSize: `${Math.max(8, (layout.fontSize + 1) * 0.68)}px` }}
                    >
                      02. DOLIPRANE 1000MG CP
                    </p>
                    <p
                      className="italic text-slate-700 pl-2 border-l border-slate-400"
                      style={{ fontSize: `${Math.max(7, (layout.fontSize - 1) * 0.68)}px` }}
                    >
                      1 comprimé en cas de douleur ou fièvre
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 px-6 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-center">
                <p className="text-sm font-medium text-slate-700">Aucun modèle personnalisé importé</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Par défaut, MonCabinet utilise une ordonnance officielle propre avec les coordonnées de votre cabinet. Importez une photo ou un PDF à gauche pour utiliser votre propre modèle.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          ONGLET 4 : MON ABONNEMENT & GESTION DES ARCHIVES
         ============================================================ */}
      {activeTab === "subscription" && (
        <div className="space-y-6">
          {/* Grille des indicateurs d'abonnement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Formule */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Formule en cours
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black ${
                  initialSettings.subscription?.plan === 'standard'
                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                }`}>
                  <span className="material-symbols-outlined text-[15px]">
                    {initialSettings.subscription?.plan === 'standard' ? 'history' : 'star'}
                  </span>
                  <span>{initialSettings.subscription?.plan === 'standard' ? 'STANDARD' : '⭐ PLAN PRO'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {initialSettings.subscription?.plan === 'standard'
                  ? 'Historique 30j + Export Excel'
                  : 'Historique permanent à vie'}
              </p>
            </div>

            {/* 2. Compte à rebours */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Validité restante
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`text-2xl font-black tabular-nums ${
                  (initialSettings.subscription?.daysRemaining || 0) > 15
                    ? 'text-emerald-700'
                    : (initialSettings.subscription?.daysRemaining || 0) > 0
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}>
                  {initialSettings.subscription?.daysRemaining ?? 30}
                </span>
                <span className="text-xs font-bold text-slate-500">jours</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {(initialSettings.subscription?.daysRemaining || 0) > 0 ? "Abonnement actif" : "Échéance dépassée"}
              </p>
            </div>

            {/* 3. Périodicité & Tarif */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Tarif & Cycle
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900 tabular-nums">
                  {initialSettings.subscription?.planPrice || (initialSettings.subscription?.plan === 'standard' ? 200 : 250)}
                </span>
                <span className="text-xs font-bold text-slate-500">DH</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium capitalize">
                {initialSettings.subscription?.billingCycle === 'yearly'
                  ? 'Facturation Annuelle'
                  : initialSettings.subscription?.billingCycle === 'quarterly'
                  ? 'Facturation Trimestrielle'
                  : 'Facturation Mensuelle'}
              </p>
            </div>

            {/* 4. Date d'échéance */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Date d'échéance
              </span>
              <div className="text-base font-bold text-slate-900 mt-1.5 tabular-nums">
                {initialSettings.subscription?.subscriptionExpiresAt
                  ? new Date(initialSettings.subscription.subscriptionExpiresAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "30 jours après activation"}
              </div>
              <p className="text-xs text-slate-400 mt-1">Renouvellement automatique</p>
            </div>
          </div>

          {/* Section d'archivage & Export Excel (indispensable pour le plan Standard) */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(16,24,40,0.06)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-xl">table_chart</span>
                  <span>Sauvegarde locale & Export Excel complet</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                  {initialSettings.subscription?.plan === 'standard'
                    ? "Votre formule STANDARD conserve un historique de 30 jours en direct sur la plateforme. Vous pouvez télécharger à tout moment l'intégralité de votre patientèle et de vos antécédents au format Excel / CSV pour conserver vos archives locales complètes sans aucune perte."
                    : "Votre formule PRO conserve vos données à vie en illimité. Vous pouvez également générer à tout moment un export Excel de vos patients et consultations pour vos sauvegardes comptables ou administratives."}
                </p>
              </div>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportData}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isExporting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Génération de l'export...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">download</span>
                    <span>Télécharger l'export Excel (.CSV)</span>
                  </>
                )}
              </button>
            </div>

            {/* Tableau comparatif des garanties du plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Inclus dans votre formule active
                </span>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                    <span>
                      {initialSettings.subscription?.plan === 'standard'
                        ? 'Historique patient glissant de 30 jours'
                        : 'Historique médical complet et permanent à vie'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                    <span>Export Excel illimité à tout moment</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                    <span>Salle d'attente en temps réel & File active</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                    <span>Ordonnances personnalisées & impression PDF</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                    <span>Messagerie interne & Interphone cabinet</span>
                  </li>
                </ul>
              </div>

              {/* Assistance & Renouvellement */}
              <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-xs font-bold text-sky-950 uppercase tracking-wider block">
                    Prolongation & Support Dédié
                  </span>
                  <p className="text-xs text-sky-900 mt-1 leading-relaxed">
                    Pour prolonger votre abonnement, modifier votre cycle (passer à l'annuel pour bénéficier de 2 mois offerts) ou basculer sur la formule Pro, contactez notre équipe support direct.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <a
                    href="https://wa.me/212600000000?text=Bonjour,%20je%20souhaite%20des%20informations%20sur%20mon%20abonnement%20MonCabinet"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">chat</span>
                    <span>Contacter par WhatsApp</span>
                  </a>
                  <a
                    href="mailto:nahli-ami@upf.ac.ma?subject=Gestion%20Abonnement%20Cabinet%20Médical"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition"
                  >
                    <span className="material-symbols-outlined text-[15px]">mail</span>
                    <span>Envoyer un email</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
