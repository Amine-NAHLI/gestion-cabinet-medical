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
  const user = session?.user as { role?: string } | undefined;
  if (!session || user?.role !== 'doctor') redirect("/dashboard");

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
  const initialMedicines = hasPrescription ? (prescriptionArray[0].medicines as { name: string; instructions: string }[]) : [];

  const initials = `${visit.patients.firstName[0] || ""}${visit.patients.lastName[0] || ""}`.toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header avec infos patient */}
      <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center text-xl font-bold tracking-wider shadow-xs shadow-sky-600/30">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {visit.patients.lastName} {visit.patients.firstName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200/70 text-sky-700 text-xs font-bold">
                Dossier #{visit.visits.id}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
              <span>{visit.patients.age} ans</span>
              <span>•</span>
              <span>Tél : {visit.patients.phone}</span>
              {visit.patients.mutuelle && (
                <>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                    {visit.patients.mutuelle}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <Link 
          href="/dashboard" 
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Retour au tableau
        </Link>
      </div>

      {/* Interface interactive (Dossier, Ordonnance, Facturation) */}
      <ConsultationClient visitId={visitId} initialData={visit.visits} patient={visit.patients} hasPrescription={hasPrescription} initialMedicines={initialMedicines} />
    </div>
  );
}
