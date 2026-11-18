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
    <div className="space-y-5">
      {/* Header sobre & clinique */}
      <div className="bg-white p-5 sm:p-6 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] border border-slate-200/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center text-base font-semibold shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                  {visit.patients.lastName} {visit.patients.firstName}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium tabular-nums">
                  Visite #{visit.visits.id}
                </span>
                {isReturningPatient ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200/80 text-sky-800 text-xs font-medium">
                    Patient suivi ({pastVisits.length})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium">
                    Nouveau patient
                  </span>
                )}
                {visit.patients.cin && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-xs">
                    {visit.patients.cin}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span>{visit.patients.age} ans</span>
                {visit.patients.gender && (
                  <>
                    <span>•</span>
                    <span>{visit.patients.gender === "F" ? "Femme" : "Homme"}</span>
                  </>
                )}
                <span>•</span>
                <span>Tél. {visit.patients.phone}</span>
                {visit.patients.bloodGroup && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-rose-700">
                      Groupe {visit.patients.bloodGroup}
                    </span>
                  </>
                )}
                {visit.patients.mutuelle && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-slate-700">{visit.patients.mutuelle}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium transition shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Retour
          </Link>
        </div>

        {/* Alertes cliniques permanentes */}
        {(visit.patients.allergies || visit.patients.antecedents) && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2.5">
            {visit.patients.allergies && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200/80 text-red-900 text-xs">
                <span className="material-symbols-outlined text-[15px] text-red-600">warning</span>
                <span>
                  <strong className="font-semibold mr-1">Allergies :</strong>
                  {visit.patients.allergies}
                </span>
              </div>
            )}
            {visit.patients.antecedents && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-xs">
                <span className="material-symbols-outlined text-[15px] text-amber-600">info</span>
                <span>
                  <strong className="font-semibold mr-1">Antécédents :</strong>
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
