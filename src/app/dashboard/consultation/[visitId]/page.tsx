import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { visits, patients, prescriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import ConsultationClient from "./ConsultationClient";

export const dynamic = "force-dynamic";

export default async function ConsultationPage({ params }: { params: Promise<{ visitId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'doctor') redirect("/dashboard");

  const resolvedParams = await params;
  const visitId = parseInt(resolvedParams.visitId);

  const visitArray = await db
    .select()
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(eq(visits.id, visitId));

  if (visitArray.length === 0) return <div>Visite introuvable</div>;
  const visit = visitArray[0];

  const prescriptionArray = await db.select().from(prescriptions).where(eq(prescriptions.visitId, visitId));
  const hasPrescription = prescriptionArray.length > 0;
  const initialMedicines = hasPrescription ? (prescriptionArray[0].medicines as any) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header avec infos patient */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700 text-2xl font-bold">
            {visit.patients.firstName[0]}{visit.patients.lastName[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{visit.patients.lastName} {visit.patients.firstName}</h1>
            <p className="text-slate-500 font-medium">{visit.patients.age} ans • Tél: {visit.patients.phone}</p>
          </div>
        </div>
        <Link href="/dashboard" className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold transition">
          Retour à la liste
        </Link>
      </div>

      {/* Interface interactive (Dossier, Ordonnance, Facturation) */}
      <ConsultationClient visitId={visitId} initialData={visit.visits} patient={visit.patients} hasPrescription={hasPrescription} initialMedicines={initialMedicines} />
    </div>
  );
}
