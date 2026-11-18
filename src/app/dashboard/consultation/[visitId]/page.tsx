import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { visits, patients, prescriptions, appointments } from "@/db/schema";
import { getClinicSettings } from "@/actions/settings";
import { eq, and, ne, desc, inArray } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import Link from "next/link";
import ConsultationClient from "./ConsultationClient";

export const dynamic = "force-dynamic";

export default async function ConsultationPage({ params }: { params: Promise<{ visitId: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (!session || user?.role !== "doctor") redirect("/dashboard");

  const resolvedParams = await params;
  const visitId = parseInt(resolvedParams.visitId, 10);
  const clinicId = await getTenantClinicId();

  // Vérification stricte que cette consultation appartient bien à ce cabinet médical
  const visitArray = await db
    .select()
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)));

  if (visitArray.length === 0) {
    redirect("/dashboard");
  }
  const visit = visitArray[0];
  const patientId = visit.patients.id;

  // Charger en parallèle : ordonnance courante, historique complet des visites passées, RDV et paramètres cabinet
  const [prescriptionArray, previousVisitsRaw, patientAppointmentsRaw, settings] = await Promise.all([
    db.select().from(prescriptions).where(eq(prescriptions.visitId, visitId)),
    db
      .select()
      .from(visits)
      .where(
        and(
          eq(visits.patientId, patientId),
          eq(visits.clinicId, clinicId),
          ne(visits.id, visitId),
          ne(visits.status, "cancelled")
        )
      )
      .orderBy(desc(visits.createdAt)),
    db
      .select()
      .from(appointments)
      .where(and(eq(appointments.patientId, patientId), eq(appointments.clinicId, clinicId)))
      .orderBy(desc(appointments.date)),
    getClinicSettings(),
  ]);

  const hasPrescription = prescriptionArray.length > 0;
  const initialMedicines = hasPrescription
    ? (prescriptionArray[0].medicines as { name: string; instructions: string }[])
    : [];

  // Récupérer toutes les ordonnances des visites antérieures de ce patient
  const pastVisitIds = previousVisitsRaw.map((v) => v.id);
  const pastPrescriptionsRaw =
    pastVisitIds.length > 0
      ? await db
          .select()
          .from(prescriptions)
          .where(inArray(prescriptions.visitId, pastVisitIds))
      : [];

  const prescriptionsByVisit = new Map<number, { name: string; instructions: string }[]>();
  for (const pr of pastPrescriptionsRaw) {
    prescriptionsByVisit.set(
      pr.visitId,
      Array.isArray(pr.medicines) ? (pr.medicines as { name: string; instructions: string }[]) : []
    );
  }

  const pastVisits = previousVisitsRaw.map((v) => ({
    id: v.id,
    date: v.createdAt.toISOString(),
    status: v.status,
    disease: v.disease,
    diagnosis: v.diagnosis,
    notes: v.notes,
    bloodPressure: v.bloodPressure,
    heartRate: v.heartRate,
    temperature: v.temperature ? String(v.temperature) : null,
    weight: v.weight ? String(v.weight) : null,
    height: v.height ? String(v.height) : null,
    amountToPay: v.amountToPay ? String(v.amountToPay) : null,
    paymentStatus: v.paymentStatus,
    paymentMethod: v.paymentMethod,
    paidAt: v.paidAt ? v.paidAt.toISOString() : null,
    customData: Array.isArray(v.customData) ? v.customData : [],
    medicines: prescriptionsByVisit.get(v.id) || [],
  }));

  const pastAppointments = patientAppointmentsRaw.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    time: a.time || "09:00",
    reason: a.reason || "Consultation",
    status: a.status,
  }));

  const serializedPatient = {
    ...visit.patients,
    createdAt: visit.patients.createdAt.toISOString(),
  };

  const serializedCurrentVisit = {
    ...visit.visits,
    date: visit.visits.date.toISOString(),
    createdAt: visit.visits.createdAt.toISOString(),
    paidAt: visit.visits.paidAt ? visit.visits.paidAt.toISOString() : null,
    temperature: visit.visits.temperature ? String(visit.visits.temperature) : null,
    weight: visit.visits.weight ? String(visit.visits.weight) : null,
    height: visit.visits.height ? String(visit.visits.height) : null,
    amountToPay: visit.visits.amountToPay ? String(visit.visits.amountToPay) : null,
    customData: Array.isArray(visit.visits.customData) ? visit.visits.customData : [],
  };

  const initials = `${visit.patients.firstName[0] || ""}${visit.patients.lastName[0] || ""}`.toUpperCase();
  const isReturningPatient = pastVisits.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header avec infos patient + statut suivi / alertes médicales */}
      <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center text-xl font-bold tracking-wider shadow-xs shadow-sky-600/30 shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {visit.patients.lastName} {visit.patients.firstName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200/70 text-sky-700 text-xs font-bold">
                  Visite #{visit.visits.id}
                </span>
                {isReturningPatient ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                    <span className="material-symbols-outlined text-xs">history</span>
                    Patient suivi • {pastVisits.length} visite{pastVisits.length > 1 ? "s" : ""} précédente
                    {pastVisits.length > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    Nouveau patient
                  </span>
                )}
                {visit.patients.cin && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-bold">
                    {visit.patients.cin}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-medium mt-1.5">
                <span>{visit.patients.age} ans</span>
                {visit.patients.gender && (
                  <>
                    <span>•</span>
                    <span>{visit.patients.gender === "F" ? "Femme" : "Homme"}</span>
                  </>
                )}
                <span>•</span>
                <span>Tél : {visit.patients.phone}</span>
                {visit.patients.bloodGroup && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-extrabold text-[11px]">
                      Groupe {visit.patients.bloodGroup}
                    </span>
                  </>
                )}
                {visit.patients.mutuelle && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-bold text-[11px]">
                      {visit.patients.mutuelle}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Retour au tableau
          </Link>
        </div>

        {/* Bandeau d'alerte Allergies / Antécédents permanents (toujours visible pour le médecin) */}
        {(visit.patients.allergies || visit.patients.antecedents) && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-3">
            {visit.patients.allergies && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
                <span className="material-symbols-outlined text-sm text-red-600">warning</span>
                <span>
                  <strong className="uppercase text-[10px] tracking-wider mr-1">Allergies :</strong>
                  {visit.patients.allergies}
                </span>
              </div>
            )}
            {visit.patients.antecedents && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                <span className="material-symbols-outlined text-sm text-amber-600">medical_information</span>
                <span>
                  <strong className="uppercase text-[10px] tracking-wider mr-1">Antécédents :</strong>
                  {visit.patients.antecedents}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interface interactive (Historique Médical Complet + Examen + Ordonnance + Facturation) */}
      <ConsultationClient
        visitId={visitId}
        initialData={serializedCurrentVisit}
        patient={serializedPatient}
        hasPrescription={hasPrescription}
        initialMedicines={initialMedicines}
        pastVisits={pastVisits}
        pastAppointments={pastAppointments}
        settings={settings}
      />
    </div>
  );
}
