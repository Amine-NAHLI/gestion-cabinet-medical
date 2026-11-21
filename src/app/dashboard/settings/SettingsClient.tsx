"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  updateClinicSettings,
  updateConsultationFields,
  updatePrescriptionTemplate,
} from "@/actions/settings";
import {
  updateNotificationPreferences,
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/actions/notifications";
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
    orderNumber: string | null;
    taxId: string | null;
    defaultFee: string | null;
    consultationFields: ConsultationFieldConfig[];
    prescriptionTemplateUrl: string | null;
    prescriptionTemplateName: string | null;
    prescriptionTemplateLayout: PrescriptionTemplateLayout;
  };
  initialNotificationPreferences?: NotificationPreferences;
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
  initialNotificationPreferences,
}: SettingsClientProps) {
  const isDoctor = role === "doctor";
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"general" | "fields" | "template" | "notifications">(
    tabParam === "notifications" ? "notifications" : "general"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Préférences de notifications (par défaut toutes activées)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    initialNotificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);

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

  async function handleSaveNotifications(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingNotifs(true);
    const res = await updateNotificationPreferences(notifPrefs);
    setIsSavingNotifs(false);
    if (res.success) {
      showToast("Préférences de notifications enregistrées avec succès");
    } else {
      showToast(res.error || "Erreur lors de la sauvegarde.", "error");
    }
  }

  function handleResetDefaultNotifications() {
    setNotifPrefs(DEFAULT_NOTIFICATION_PREFERENCES);
    showToast("Toutes les alertes sont réactivées par défaut");
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

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-[13px] border-b-2 -mb-px transition cursor-pointer whitespace-nowrap ${
            activeTab === "notifications"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 font-medium hover:text-slate-800"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">notifications_active</span>
          <span>Notifications & Alertes</span>
        </button>
      </div>

      {/* ============================================================
          ONGLET 1 : COORDONNÉES DU CABINET
         ============================================================ */}
      {activeTab === "general" && (
        <form
          onSubmit={handleSaveGeneral}
          className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] divide-y divide-slate-200/80"
        >
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
          ONGLET 4 : NOTIFICATIONS & ALERTES EN DIRECT
         ============================================================ */}
      {activeTab === "notifications" && (
        <form
          onSubmit={handleSaveNotifications}
          className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] divide-y divide-slate-200/80"
        >
          {/* En-tête de section */}
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-700 text-lg">
                    notifications_active
                  </span>
                  <span>Gestion des Notifications & Alertes</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choisissez les canaux et événements pour lesquels vous souhaitez être averti en direct.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetDefaultNotifications}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                <span>Tout réactiver par défaut</span>
              </button>
            </div>

            {/* Note par défaut */}
            <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80 text-sky-900 text-xs flex items-start gap-2.5">
              <span className="material-symbols-outlined text-sky-600 text-base shrink-0 mt-0.5">
                info
              </span>
              <p className="leading-relaxed">
                <strong>Réactivité garantie :</strong> Par défaut, toutes les notifications sont activées pour vous tenir informé des arrivées de patients, des urgences de l&apos;accueil et des échanges confraternels.
              </p>
            </div>
          </div>

          {/* Section 1 : Réseau Confraternel (Médecins uniquement) */}
          {isDoctor && (
            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                  Réseau Médical Confraternel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Notifications liées au fil de publications et au chat privé entre confrères certifiés.
                </p>
              </div>

              <div className="space-y-3">
                {/* Switch Publications communauté */}
                <label className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/50 transition cursor-pointer">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
                      <span className="material-symbols-outlined text-base">stethoscope</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Publications Confraternelles & Cas Cliniques
                      </p>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        Alerte dès qu&apos;un confrère publie un nouveau cas clinique, une demande d&apos;orientation ou une annonce de garde.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.communityPosts}
                    onChange={(e) =>
                      setNotifPrefs((prev) => ({ ...prev, communityPosts: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 mt-1 cursor-pointer"
                  />
                </label>

                {/* Switch Messagerie directe */}
                <label className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/50 transition cursor-pointer">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
                      <span className="material-symbols-outlined text-base">chat</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Messagerie Directe Confraternelle (Chat 1-à-1)
                      </p>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        Notifications instantanées lors de la réception d&apos;un message privé d&apos;un confrère médecin.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.communityMessages}
                    onChange={(e) =>
                      setNotifPrefs((prev) => ({ ...prev, communityMessages: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 mt-1 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Section 2 : Cabinet & Pratique Interne */}
          <div className="p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Cabinet & Coordination Interne
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Alertes pour la fluidité des consultations et le travail en équipe.
              </p>
            </div>

            <div className="space-y-3">
              {/* Switch Interphone Cabinet */}
              <label className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/50 transition cursor-pointer">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                    <span className="material-symbols-outlined text-base">forum</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Interphone Cabinet (Médecin ⟷ Assistante)
                    </p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      Messages prioritaires, appels d&apos;urgence et consignes rapides échangés entre le bureau et l&apos;accueil.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.clinicMessages}
                  onChange={(e) =>
                    setNotifPrefs((prev) => ({ ...prev, clinicMessages: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 mt-1 cursor-pointer"
                />
              </label>

              {/* Switch Salle d'attente */}
              <label className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/50 transition cursor-pointer">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                    <span className="material-symbols-outlined text-base">groups</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Salle d&apos;Attente (Arrivée d&apos;un patient)
                    </p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      Notification dès qu&apos;un patient est accueilli et enregistré en salle d&apos;attente par le secrétariat.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.queueArrivals}
                  onChange={(e) =>
                    setNotifPrefs((prev) => ({ ...prev, queueArrivals: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 mt-1 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Section 3 : Alertes Sonores */}
          <div className="p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Signaux Audio
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Retour audio lors de la réception d&apos;une alerte.
              </p>
            </div>

            <label className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/50 transition cursor-pointer">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
                  <span className="material-symbols-outlined text-base">volume_up</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Signal Sonore Discret (Bip audio)
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    Émet un son doux et professionnel pour vous signaler l&apos;arrivée d&apos;un message urgent ou d&apos;une notification sans déranger la consultation.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.soundEnabled}
                onChange={(e) =>
                  setNotifPrefs((prev) => ({ ...prev, soundEnabled: e.target.checked }))
                }
                className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 mt-1 cursor-pointer"
              />
            </label>
          </div>

          {/* Barre d'action enregistrement */}
          <div className="p-5 sm:p-6 bg-slate-50/50 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSavingNotifs}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50 shadow-xs flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>{isSavingNotifs ? "Enregistrement..." : "Enregistrer les préférences"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
