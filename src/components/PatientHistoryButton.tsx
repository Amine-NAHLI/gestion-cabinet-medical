"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getPatientMedicalHistory } from "@/actions/patients";

interface PatientHistoryButtonProps {
  patientId: number;
  visitIdToOpen?: number;
  patientName?: string;
  variant?: "default" | "compact";
  className?: string;
}

interface VisitRecord {
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
  medicines: { name: string; instructions: string }[];
}

interface PatientRecord {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  phone: string;
  gender?: string | null;
  mutuelle?: string | null;
  cin?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  antecedents?: string | null;
  address?: string | null;
  createdAt?: string;
}

export default function PatientHistoryButton({
  patientId,
  visitIdToOpen,
  patientName,
  variant = "default",
  className = "",
}: PatientHistoryButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setIsOpen(true);
    setLoading(true);
    setError(null);

    try {
      const res = await getPatientMedicalHistory(patientId);
      if (res && res.success && res.patient) {
        setPatient(res.patient);
        setVisits(res.visits || []);
      } else {
        setError(res?.error || "Impossible de charger le dossier médical.");
      }
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToConsultation = () => {
    if (visitIdToOpen) {
      setIsOpen(false);
      router.push(`/dashboard/consultation/${visitIdToOpen}`);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Consulter l'historique médical antérieur du patient"
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition font-medium shadow-2xs cursor-pointer active:bg-slate-100 ${
          variant === "compact"
            ? "px-3 py-1.5 text-xs"
            : "px-4 py-2.5 text-sm"
        } ${className}`}
      >
        <span className="material-symbols-outlined text-[18px] text-slate-500">
          folder_shared
        </span>
        <span>Voir ancien dossier</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-slate-200/80 bg-slate-50/70 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-700 text-[22px]">
                      medical_information
                    </span>
                    <h2 className="text-base font-semibold text-slate-900 truncate">
                      Ancien Dossier Médical • {patient ? `${patient.lastName} ${patient.firstName}` : patientName || "Patient"}
                    </h2>
                  </div>
                  {patient && (
                    <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span>{patient.age} ans</span>
                      <span>•</span>
                      <span>Tél : {patient.phone}</span>
                      {patient.cin && (
                        <>
                          <span>•</span>
                          <span>CIN : {patient.cin}</span>
                        </>
                      )}
                      {patient.mutuelle && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-slate-700">Mutuelle : {patient.mutuelle}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {loading ? (
                  <div className="py-16 text-center space-y-3">
                    <span className="inline-block w-7 h-7 border-3 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                    <p className="text-xs text-slate-500">Chargement de l'historique du patient...</p>
                  </div>
                ) : error ? (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                    {error}
                  </div>
                ) : (
                  <>
                    {/* Alertes médicales : Allergies & Antécédents */}
                    {patient && (patient.allergies || patient.antecedents || patient.bloodGroup) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {patient.allergies && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                            <span className="font-semibold block mb-0.5 text-rose-950 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-rose-600">warning</span>
                              Allergies connues
                            </span>
                            <span className="text-rose-800 font-medium">{patient.allergies}</span>
                          </div>
                        )}

                        {patient.antecedents && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                            <span className="font-semibold block mb-0.5 text-amber-950 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-amber-600">history_edu</span>
                              Antécédents médicaux
                            </span>
                            <span className="text-amber-800 font-medium">{patient.antecedents}</span>
                          </div>
                        )}

                        {patient.bloodGroup && (
                          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs sm:col-span-2">
                            <span className="font-semibold text-indigo-950 mr-1.5">Groupe Sanguin :</span>
                            <span className="font-bold text-indigo-700">{patient.bloodGroup}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Historique chronologique des visites */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Consultations précédentes ({visits.length})
                        </h3>
                        {visits.length > 0 && (
                          <span className="text-[11px] text-slate-400">
                            Du plus récent au plus ancien
                          </span>
                        )}
                      </div>

                      {visits.length === 0 ? (
                        <div className="py-12 px-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-xs">
                          <span className="material-symbols-outlined text-slate-300 text-3xl mb-1 block">
                            folder_off
                          </span>
                          Ce patient n'a pas encore de consultations clôturées enregistrées.
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          {visits.map((v, idx) => (
                            <div
                              key={v.id}
                              className="rounded-xl border border-slate-200/90 p-4 bg-white shadow-2xs space-y-2.5 hover:border-slate-300 transition-colors"
                            >
                              {/* Ligne En-tête visite */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center tabular-nums">
                                    {visits.length - idx}
                                  </span>
                                  <span className="font-semibold text-xs text-slate-900">
                                    {formatDate(v.date)}
                                  </span>
                                </div>
                                {v.disease && (
                                  <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 text-[11px] font-semibold border border-sky-100">
                                    {v.disease}
                                  </span>
                                )}
                              </div>

                              {/* Diagnostic et Notes */}
                              {(v.diagnosis || v.notes) && (
                                <div className="text-xs space-y-1">
                                  {v.diagnosis && (
                                    <p className="text-slate-800">
                                      <span className="font-semibold text-slate-900">Diagnostic : </span>
                                      {v.diagnosis}
                                    </p>
                                  )}
                                  {v.notes && (
                                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                                      « {v.notes} »
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Constantes cliniques */}
                              {(v.bloodPressure || v.heartRate || v.temperature || v.weight) && (
                                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                                  {v.bloodPressure && (
                                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                                      TA : <strong className="text-slate-900">{v.bloodPressure}</strong>
                                    </span>
                                  )}
                                  {v.heartRate && (
                                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                                      Pouls : <strong className="text-slate-900">{v.heartRate} bpm</strong>
                                    </span>
                                  )}
                                  {v.temperature && (
                                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                                      T° : <strong className="text-slate-900">{v.temperature} °C</strong>
                                    </span>
                                  )}
                                  {v.weight && (
                                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                                      Poids : <strong className="text-slate-900">{v.weight} kg</strong>
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Ordonnance délivrée */}
                              {v.medicines && v.medicines.length > 0 && (
                                <div className="pt-2 border-t border-slate-100">
                                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                    Prescription délivrée ({v.medicines.length}) :
                                  </span>
                                  <ul className="space-y-1 text-xs">
                                    {v.medicines.map((m, mIdx) => (
                                      <li key={mIdx} className="flex items-start gap-1.5 text-slate-700">
                                        <span className="text-slate-400 font-bold">•</span>
                                        <span>
                                          <strong className="text-slate-900">{m.name}</strong>
                                          {m.instructions && (
                                            <span className="text-slate-500 text-[11px] ml-1">
                                              ({m.instructions})
                                            </span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  Fermer
                </button>

                {visitIdToOpen && (
                  <button
                    type="button"
                    onClick={handleGoToConsultation}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <span>Faire entrer & Ouvrir la consultation</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
