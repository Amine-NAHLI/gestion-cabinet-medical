import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { patients, visits, prescriptions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import PatientsClient from "./PatientsClient";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  await getServerSession(authOptions);
  const clinicId = await getTenantClinicId();

  // Récupérer patients, visites et ordonnances strictement de ce cabinet
  const [allPatients, allVisits, allPrescriptions] = await Promise.all([
    db
      .select()
      .from(patients)
      .where(eq(patients.clinicId, clinicId))
      .orderBy(desc(patients.createdAt)),
    db
      .select()
      .from(visits)
      .where(eq(visits.clinicId, clinicId))
      .orderBy(desc(visits.createdAt)),
    db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.clinicId, clinicId)),
  ]);

  const prescriptionsByVisit = new Map<number, { name: string; instructions: string }[]>();
  for (const pr of allPrescriptions) {
    prescriptionsByVisit.set(
      pr.visitId,
      Array.isArray(pr.medicines) ? (pr.medicines as { name: string; instructions: string }[]) : []
    );
  }

  // Regrouper l'historique détaillé par patient
  const patientsWithVisits = allPatients.map((p) => {
    const patientVisits = allVisits
      .filter((v) => v.patientId === p.id)
      .map((v) => ({
        id: v.id,
        date: v.createdAt.toISOString(),
        disease: v.disease,
        diagnosis: v.diagnosis,
        notes: v.notes,
        status: v.status,
        bloodPressure: v.bloodPressure,
        heartRate: v.heartRate,
        temperature: v.temperature ? String(v.temperature) : null,
        weight: v.weight ? String(v.weight) : null,
        height: v.height ? String(v.height) : null,
        amountToPay: v.amountToPay ? String(v.amountToPay) : null,
        paymentStatus: v.paymentStatus,
        paymentMethod: v.paymentMethod,
        customData: Array.isArray(v.customData) ? v.customData : [],
        medicines: prescriptionsByVisit.get(v.id) || [],
      }));

    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      age: p.age,
      mutuelle: p.mutuelle,
      cin: p.cin,
      gender: p.gender,
      bloodGroup: p.bloodGroup,
      allergies: p.allergies,
      antecedents: p.antecedents,
      address: p.address,
      createdAt: p.createdAt.toISOString(),
      visits: patientVisits,
    };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-[11px] font-bold uppercase tracking-wider text-sky-700 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          Dossiers Patients Partagés
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Répertoire des Patients
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Consultation des fiches médicales, antécédents, allergies et historique complet des consultations.
        </p>
      </div>

      <PatientsClient initialPatients={patientsWithVisits} />
    </div>
  );
}
