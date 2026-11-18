export type ConsultationFieldType =
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "checkbox"
  | "date";

export type SystemVisitKey =
  | "bloodPressure"
  | "heartRate"
  | "temperature"
  | "weight"
  | "height"
  | "disease"
  | "diagnosis"
  | "notes";

export interface ConsultationFieldConfig {
  id: string;
  label: string;
  type: ConsultationFieldType;
  section: "vitals" | "clinical";
  placeholder?: string;
  unit?: string;
  options?: string[];
  required?: boolean;
  systemKey?: SystemVisitKey;
}

export interface CustomFieldValue {
  id: string;
  label: string;
  value: string;
  unit?: string;
  type: ConsultationFieldType;
  section: "vitals" | "clinical";
}

export interface PrescriptionTemplateLayout {
  paperSize: "A4" | "A5";
  showPatientInfo: boolean;
  patientTop: number; // % from top (0 - 80)
  patientLeft: number; // % from left (0 - 60)
  medsTop: number; // % from top (5 - 85)
  medsLeft: number; // % from left (0 - 40)
  medsRight: number; // % from right (0 - 40)
  fontSize: number; // px (11 - 20)
}

export const DEFAULT_PRESCRIPTION_LAYOUT: PrescriptionTemplateLayout = {
  paperSize: "A4",
  showPatientInfo: true,
  patientTop: 22,
  patientLeft: 8,
  medsTop: 34,
  medsLeft: 10,
  medsRight: 10,
  fontSize: 14,
};

export const DEFAULT_CONSULTATION_FIELDS: ConsultationFieldConfig[] = [
  {
    id: "bloodPressure",
    label: "Tension",
    type: "text",
    section: "vitals",
    unit: "mmHg",
    placeholder: "Ex: 12/8",
    required: false,
    systemKey: "bloodPressure",
  },
  {
    id: "heartRate",
    label: "Pouls",
    type: "number",
    section: "vitals",
    unit: "bpm",
    placeholder: "Ex: 72",
    required: false,
    systemKey: "heartRate",
  },
  {
    id: "temperature",
    label: "Température",
    type: "text",
    section: "vitals",
    unit: "°C",
    placeholder: "37.2",
    required: false,
    systemKey: "temperature",
  },
  {
    id: "weight",
    label: "Poids",
    type: "text",
    section: "vitals",
    unit: "kg",
    placeholder: "70",
    required: false,
    systemKey: "weight",
  },
  {
    id: "height",
    label: "Taille",
    type: "text",
    section: "vitals",
    unit: "cm",
    placeholder: "175",
    required: false,
    systemKey: "height",
  },
  {
    id: "disease",
    label: "Motif de consultation / Symptômes",
    type: "text",
    section: "clinical",
    placeholder: "Ex: Céphalées aiguës, Contrôle annuel, Bilan respiratoire...",
    required: false,
    systemKey: "disease",
  },
  {
    id: "diagnosis",
    label: "Diagnostic & Examen Clinique",
    type: "textarea",
    section: "clinical",
    placeholder: "Observations cliniques, auscultation, conclusions du praticien...",
    required: false,
    systemKey: "diagnosis",
  },
  {
    id: "notes",
    label: "Notes Personnelles & Recommandations (Confidentiel)",
    type: "textarea",
    section: "clinical",
    placeholder: "Notes de suivi, examens complémentaires demandés...",
    required: false,
    systemKey: "notes",
  },
];

export function normalizeConsultationFields(raw: unknown): ConsultationFieldConfig[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw as ConsultationFieldConfig[];
  }
  return DEFAULT_CONSULTATION_FIELDS;
}

export function normalizePrescriptionLayout(raw: unknown): PrescriptionTemplateLayout {
  if (raw && typeof raw === "object") {
    return {
      ...DEFAULT_PRESCRIPTION_LAYOUT,
      ...(raw as Partial<PrescriptionTemplateLayout>),
    };
  }
  return DEFAULT_PRESCRIPTION_LAYOUT;
}
