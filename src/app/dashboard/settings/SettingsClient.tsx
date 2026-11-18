"use client";

import { useState, useRef } from "react";
import {
  updateClinicSettings,
  updateConsultationFields,
  updatePrescriptionTemplate,
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
    orderNumber: string | null;
    taxId: string | null;
    defaultFee: string | null;
    consultationFields: ConsultationFieldConfig[];
    prescriptionTemplateUrl: string | null;
    prescriptionTemplateName: string | null;
    prescriptionTemplateLayout: PrescriptionTemplateLayout;
  };
}

const FIELD_TYPE_LABELS: Record<ConsultationFieldType, { label: string; icon: string }> = {
  text: { label: "Texte court", icon: "short_text" },
  textarea: { label: "Texte long", icon: "notes" },
  number: { label: "Nombre / Mesure", icon: "123" },
  select: { label: "Liste de sélection", icon: "arrow_drop_down_circle" },
  checkbox: { label: "Case à cocher (Oui/Non)", icon: "check_box" },
  date: { label: "Date", icon: "calendar_today" },
};

export default function SettingsClient({ role, initialSettings }: SettingsClientProps) {
  const isDoctor = role === "doctor";
  const [activeTab, setActiveTab] = useState<"general" | "fields" | "template">("general");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // ========================================================
  // STATE : CONSTRUCTEUR DE CASES CONSULTATION (FORM BUILDER)
  // ========================================================
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

  // ========================================================
  // STATE : TEMPLATE D'ORDONNANCE PERSONNALISÉ (PHOTO / PDF)
  // ========================================================
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

  // 1. Sauvegarde infos générales du cabinet
  async function handleSaveGeneral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await updateClinicSettings(formData);
    setIsLoading(false);
    if (res.success) {
      showToast("Coordonnées du cabinet mises à jour avec succès !");
    } else {
      showToast(res.error || "Erreur lors de la sauvegarde.", "error");
    }
  }

  // 2. Gestion des cases consultation
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
      showToast("Une liste de sélection doit contenir au moins 2 choix (séparés par des virgules).", "error");
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
    showToast(`Case "${created.label}" ajoutée. Cliquez sur "Enregistrer mes cases" pour valider.`);
  }

  function handleUpdateField(id: string, patch: Partial<ConsultationFieldConfig>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function handleDeleteField(id: string) {
    if (fields.length <= 1) {
      showToast("Vous devez conserver au moins une case dans le formulaire.", "error");
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
      showToast("Fiche consultation personnalisée enregistrée !");
    } else {
      showToast(res.error || "Erreur lors de l'enregistrement.", "error");
    }
  }

  // 3. Upload & sauvegarde Template d'ordonnance (Photo ou PDF)
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsConvertingFile(true);
    try {
      const dataUrl = await convertFileToTemplateImage(file);
      setTemplateUrl(dataUrl);
      setTemplateName(file.name);
      showToast(`Modèle "${file.name}" chargé ! Ajustez la position puis enregistrez.`);
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
      showToast("Template d'ordonnance enregistré avec succès !");
    } else {
      showToast(res.error || "Erreur lors de la sauvegarde du template.", "error");
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
      showToast("Modèle personnalisé supprimé. Retour à l'ordonnance standard MonCabinet.");
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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 border ${
              toast.type === "error"
                ? "bg-red-600 text-white border-red-500"
                : "bg-slate-900 text-white border-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {toast.type === "error" ? "error" : "check_circle"}
            </span>
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAVIGATION DES ONGLETS PARAMÈTRES (SOBRE À SOULIGNEMENT) */}
      <div className="border-b border-slate-200/90 flex overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 -mb-px transition cursor-pointer whitespace-nowrap ${
            activeTab === "general"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">business</span>
          <span>Infos du cabinet</span>
        </button>

        {isDoctor && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("fields")}
              className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 -mb-px transition cursor-pointer whitespace-nowrap ${
                activeTab === "fields"
                  ? "border-slate-900 text-slate-900 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">dynamic_form</span>
              <span>Cases fiche patient</span>
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold tabular-nums">
                {fields.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("template")}
              className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 -mb-px transition cursor-pointer whitespace-nowrap ${
                activeTab === "template"
                  ? "border-slate-900 text-slate-900 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              <span>Template d'ordonnance</span>
              {templateUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </button>
          </>
        )}
      </div>

      {/* ============================================================
          ONGLET 1 : COORDONNÉES & IDENTITÉ DU CABINET
         ============================================================ */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">medical_information</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">En-tête & Identité du Praticien</h2>
                <p className="text-xs text-slate-500">
                  Ces informations figurent sur vos ordonnances standard et quittances imprimées.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Nom du Médecin Praticien *
                </label>
                <input
                  type="text"
                  name="doctorName"
                  defaultValue={initialSettings.doctorName}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Spécialité Médicale *
                </label>
                <input
                  type="text"
                  name="specialty"
                  defaultValue={initialSettings.specialty}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Nom du Cabinet ou de la Clinique *
              </label>
              <input
                type="text"
                name="clinicName"
                defaultValue={initialSettings.clinicName}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">location_on</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Coordonnées & Facturation</h2>
                <p className="text-xs text-slate-500">
                  Adresse, contacts, mentions légales (INPE / ICE) et tarif par défaut.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Téléphone *
                </label>
                <input
                  type="text"
                  name="phone"
                  defaultValue={initialSettings.phone}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Email Professionnel *
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={initialSettings.email}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Adresse Complète *
                </label>
                <input
                  type="text"
                  name="address"
                  defaultValue={initialSettings.address}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Ville *
                </label>
                <input
                  type="text"
                  name="city"
                  defaultValue={initialSettings.city}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  INPE / N° Ordre
                </label>
                <input
                  type="text"
                  name="orderNumber"
                  defaultValue={initialSettings.orderNumber || ""}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Identifiants Fiscaux (ICE / IF)
                </label>
                <input
                  type="text"
                  name="taxId"
                  defaultValue={initialSettings.taxId || ""}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="max-w-xs">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Tarif Consultation par Défaut (DH)
              </label>
              <input
                type="number"
                step="10"
                name="defaultFee"
                defaultValue={initialSettings.defaultFee ? String(parseFloat(initialSettings.defaultFee)) : "250"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm font-extrabold text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-base">save</span>
                <span>{isLoading ? "Enregistrement..." : "Enregistrer les coordonnées"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ============================================================
          ONGLET 2 : PERSONNALISATION DES CASES DE LA FICHE CONSULTATION
         ============================================================ */}
      {activeTab === "fields" && isDoctor && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">dynamic_form</span>
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Cases à remplir pendant la Consultation
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ajoutez, modifiez, réorganisez ou supprimez les cases selon votre spécialité (texte, nombre, liste de sélection, oui/non, date).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    {showAddForm ? "close" : "add_circle"}
                  </span>
                  <span>{showAddForm ? "Fermer" : "Ajouter une case"}</span>
                </button>
              </div>
            </div>

            {/* FORMULAIRE D'AJOUT D'UNE NOUVELLE CASE */}
            <AnimatePresence>
              {showAddForm && (
                <motion.form
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onSubmit={handleAddField}
                  className="p-5 rounded-2xl border-2 border-sky-200 bg-sky-50/40 space-y-4"
                >
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-sky-600">add_box</span>
                    Créer une nouvelle case personnalisée
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nom de la case *
                      </label>
                      <input
                        type="text"
                        required
                        value={newField.label}
                        onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))}
                        placeholder="Ex: Glycémie, Acuité visuelle, Degré douleur..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Type de champ *
                      </label>
                      <select
                        value={newField.type}
                        onChange={(e) =>
                          setNewField((p) => ({
                            ...p,
                            type: e.target.value as ConsultationFieldType,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-sky-500"
                      >
                        <option value="text">Texte court</option>
                        <option value="textarea">Zone de texte long</option>
                        <option value="number">Nombre / Mesure</option>
                        <option value="select">Liste de sélection (Choix)</option>
                        <option value="checkbox">Case à cocher (Oui / Non)</option>
                        <option value="date">Date</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Emplacement dans la fiche
                      </label>
                      <select
                        value={newField.section}
                        onChange={(e) =>
                          setNewField((p) => ({
                            ...p,
                            section: e.target.value as "vitals" | "clinical",
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-sky-500"
                      >
                        <option value="vitals">Bloc Constantes / Mesures (compact)</option>
                        <option value="clinical">Bloc Examen Clinique (large)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(newField.type === "number" || newField.type === "text") && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Unité (Optionnel)
                        </label>
                        <input
                          type="text"
                          value={newField.unit}
                          onChange={(e) => setNewField((p) => ({ ...p, unit: e.target.value }))}
                          placeholder="Ex: g/L, %, mmHg, kg..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    )}

                    {newField.type !== "checkbox" && newField.type !== "select" && newField.type !== "date" && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Texte d'exemple (Placeholder)
                        </label>
                        <input
                          type="text"
                          value={newField.placeholder}
                          onChange={(e) =>
                            setNewField((p) => ({ ...p, placeholder: e.target.value }))
                          }
                          placeholder="Ex: Saisir la valeur..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    )}
                  </div>

                  {newField.type === "select" && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Choix de la liste de sélection (séparés par des virgules) *
                      </label>
                      <input
                        type="text"
                        required
                        value={newField.optionsText}
                        onChange={(e) =>
                          setNewField((p) => ({ ...p, optionsText: e.target.value }))
                        }
                        placeholder="Ex: Léger, Modéré, Sévère, Critique"
                        className="w-full px-3 py-2 rounded-xl border border-sky-300 bg-white text-xs font-semibold focus:outline-none focus:border-sky-600"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newField.required}
                        onChange={(e) =>
                          setNewField((p) => ({ ...p, required: e.target.checked }))
                        }
                        className="w-4 h-4 rounded text-sky-600"
                      />
                      <span>Rendre cette case obligatoire</span>
                    </label>

                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      <span>Ajouter à la fiche</span>
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* LISTE DES CASES CONFIGURÉES */}
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isEditing = editingFieldId === field.id;
                const typeInfo = FIELD_TYPE_LABELS[field.type] || FIELD_TYPE_LABELS.text;

                return (
                  <div
                    key={field.id}
                    className={`rounded-2xl border transition-all ${
                      isEditing
                        ? "border-sky-300 bg-sky-50/30 p-4 shadow-xs"
                        : "border-slate-200/90 bg-white p-3.5 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveField(index, -1)}
                            disabled={index === 0}
                            className="w-6 h-5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                            title="Monter"
                          >
                            <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveField(index, 1)}
                            disabled={index === fields.length - 1}
                            className="w-6 h-5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                            title="Descendre"
                          >
                            <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                          </button>
                        </div>

                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-lg">{typeInfo.icon}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-extrabold text-slate-900">
                              {field.label}
                              {field.unit ? ` (${field.unit})` : ""}
                            </p>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                              {typeInfo.label}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                field.section === "vitals"
                                  ? "bg-sky-50 text-sky-700"
                                  : "bg-indigo-50 text-indigo-700"
                              }`}
                            >
                              {field.section === "vitals" ? "Constantes" : "Examen Clinique"}
                            </span>
                            {field.required && (
                              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">
                                Obligatoire
                              </span>
                            )}
                          </div>
                          {field.type === "select" && field.options && field.options.length > 0 && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              Choix : {field.options.join(" • ")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingFieldId(isEditing ? null : field.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                            isEditing
                              ? "bg-sky-600 text-white border-sky-600"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isEditing ? "check" : "edit"}
                          </span>
                          <span>{isEditing ? "OK" : "Modifier"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteField(field.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 text-[11px] font-bold transition cursor-pointer"
                          title="Supprimer cette case"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* ÉDITEUR INLINE DE LA CASE */}
                    {isEditing && (
                      <div className="mt-4 pt-4 border-t border-sky-200/70 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Nom de la case
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Type
                          </label>
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
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                          >
                            <option value="text">Texte court</option>
                            <option value="textarea">Texte long</option>
                            <option value="number">Nombre / Mesure</option>
                            <option value="select">Liste de sélection</option>
                            <option value="checkbox">Case à cocher (Oui/Non)</option>
                            <option value="date">Date</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Section
                          </label>
                          <select
                            value={field.section}
                            onChange={(e) =>
                              handleUpdateField(field.id, {
                                section: e.target.value as "vitals" | "clinical",
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                          >
                            <option value="vitals">Constantes / Mesures</option>
                            <option value="clinical">Examen Clinique</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Unité (ex: mmHg, g/L)
                          </label>
                          <input
                            type="text"
                            value={field.unit || ""}
                            onChange={(e) => handleUpdateField(field.id, { unit: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Placeholder / Exemple
                          </label>
                          <input
                            type="text"
                            value={field.placeholder || ""}
                            onChange={(e) =>
                              handleUpdateField(field.id, { placeholder: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                          />
                        </div>

                        <div className="flex items-end pb-1.5">
                          <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(field.required)}
                              onChange={(e) =>
                                handleUpdateField(field.id, { required: e.target.checked })
                              }
                              className="w-4 h-4 rounded text-sky-600"
                            />
                            <span>Champ obligatoire</span>
                          </label>
                        </div>

                        {field.type === "select" && (
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Options de la liste de sélection (séparées par des virgules)
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
                              className="w-full px-3 py-2 rounded-xl border border-sky-300 bg-white font-semibold"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* BARRE D'ACTIONS BAS */}
            <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setFields(DEFAULT_CONSULTATION_FIELDS);
                  setEditingFieldId(null);
                  showToast("Cases par défaut restaurées. Cliquez sur Enregistrer pour valider.");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                <span>Réinitialiser par défaut</span>
              </button>

              <button
                type="button"
                onClick={handleSaveFields}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-base">save</span>
                <span>{isLoading ? "Enregistrement..." : "Enregistrer mes cases"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          ONGLET 3 : TEMPLATE D'ORDONNANCE PERSONNALISÉ (PHOTO OU PDF)
         ============================================================ */}
      {activeTab === "template" && isDoctor && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLONNE GAUCHE : UPLOAD & RÉGLAGES DE POSITION */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">upload_file</span>
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Modèle d'Ordonnance
                </h2>
                <p className="text-xs text-slate-500">
                  Importez votre propre papier à en-tête (Photo ou PDF).
                </p>
              </div>
            </div>

            {/* Zone d'upload */}
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
                className="w-full p-6 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/40 hover:bg-teal-50 transition flex flex-col items-center justify-center gap-2 text-center cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-3xl text-teal-600">
                  {isConvertingFile ? "hourglass_top" : "cloud_upload"}
                </span>
                <p className="text-xs font-extrabold text-slate-900">
                  {isConvertingFile
                    ? "Conversion du modèle en haute qualité..."
                    : templateUrl
                    ? "Changer le template (Photo ou PDF)"
                    : "Importer votre template (Photo PNG/JPG ou PDF)"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {templateName ? `Fichier actuel : ${templateName}` : "Scan de votre ordonnance papier, Canva, Word exporté en PDF..."}
                </p>
              </button>
            </div>

            {/* Réglages visuels de calage du texte */}
            {templateUrl && (
              <div className="space-y-4 pt-2 border-t border-slate-100 text-xs">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Calage du texte sur votre template
                </p>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Format papier</span>
                  <div className="flex gap-1.5">
                    {(["A4", "A5"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setLayout((l) => ({ ...l, paperSize: fmt }))}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
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

                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="font-bold text-slate-700">Afficher Nom Patient & Date</span>
                  <input
                    type="checkbox"
                    checked={layout.showPatientInfo}
                    onChange={(e) =>
                      setLayout((l) => ({ ...l, showPatientInfo: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-teal-600"
                  />
                </label>

                {layout.showPatientInfo && (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                        <span>Patient Haut</span>
                        <span>{layout.patientTop}%</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={60}
                        value={layout.patientTop}
                        onChange={(e) =>
                          setLayout((l) => ({ ...l, patientTop: Number(e.target.value) }))
                        }
                        className="w-full accent-teal-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                        <span>Patient Gauche</span>
                        <span>{layout.patientLeft}%</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={50}
                        value={layout.patientLeft}
                        onChange={(e) =>
                          setLayout((l) => ({ ...l, patientLeft: Number(e.target.value) }))
                        }
                        className="w-full accent-teal-600"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>Début des médicaments (Haut)</span>
                      <span>{layout.medsTop}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={75}
                      value={layout.medsTop}
                      onChange={(e) =>
                        setLayout((l) => ({ ...l, medsTop: Number(e.target.value) }))
                      }
                      className="w-full accent-teal-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                        <span>Marge Gauche</span>
                        <span>{layout.medsLeft}%</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={35}
                        value={layout.medsLeft}
                        onChange={(e) =>
                          setLayout((l) => ({ ...l, medsLeft: Number(e.target.value) }))
                        }
                        className="w-full accent-teal-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                        <span>Marge Droite</span>
                        <span>{layout.medsRight}%</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={35}
                        value={layout.medsRight}
                        onChange={(e) =>
                          setLayout((l) => ({ ...l, medsRight: Number(e.target.value) }))
                        }
                        className="w-full accent-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>Taille du texte</span>
                      <span>{layout.fontSize} px</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={20}
                      value={layout.fontSize}
                      onChange={(e) =>
                        setLayout((l) => ({ ...l, fontSize: Number(e.target.value) }))
                      }
                      className="w-full accent-teal-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-base">save</span>
                <span>{isLoading ? "Enregistrement..." : "Enregistrer ce template"}</span>
              </button>

              {templateUrl && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleTestDownloadPdf}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                    <span>Tester PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveTemplate}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>Supprimer</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* COLONNE DROITE : APERÇU EN DIRECT DU RENDU FINAL */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Aperçu en direct de l'ordonnance remplie
                </h3>
                <p className="text-[11px] text-slate-500">
                  Voici exactement comment vos médicaments seront placés sur votre feuille.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                {templateUrl ? `Template ${layout.paperSize}` : "Modèle Standard"}
              </span>
            </div>

            {templateUrl ? (
              <div className="w-full max-w-[480px] mx-auto relative rounded-2xl border border-slate-300 shadow-lg overflow-hidden bg-white aspect-[210/297]">
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
                      className="font-extrabold uppercase leading-tight"
                      style={{ fontSize: `${Math.max(8, layout.fontSize * 0.68)}px` }}
                    >
                      Patient(e) : BENALI AHMED (42 ans)
                    </p>
                    <p
                      className="text-slate-700 font-medium"
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
                      className="font-extrabold uppercase leading-snug"
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
                      className="font-extrabold uppercase leading-snug"
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
              <div className="p-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-slate-300">
                  description
                </span>
                <p className="text-xs font-bold text-slate-700">
                  Aucun template personnalisé importé pour le moment
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Par défaut, MonCabinet génère automatiquement une ordonnance officielle propre avec les coordonnées de votre cabinet. Importez votre propre photo ou PDF à gauche pour la remplacer.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
