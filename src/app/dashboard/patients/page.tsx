import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { patients, visits } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import PatientsClient from "./PatientsClient";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const session = await getServerSession(authOptions);

  // Récupérer tous les patients et leurs visites associées
  const allPatients = await db.select().from(patients).orderBy(desc(patients.createdAt));
  const allVisits = await db.select().from(visits).orderBy(desc(visits.createdAt));

  // Regrouper l'historique par patient
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
        amountToPay: v.amountToPay as string | null,
        paymentStatus: v.paymentStatus,
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
