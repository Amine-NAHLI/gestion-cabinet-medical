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

  // Si la consultation n'est pas encore marquée active ('consulting'), on l'active en BDD
  if (
    visit.visits.status !== "consulting" &&
    visit.visits.status !== "finished" &&
    visit.visits.status !== "cancelled"
  ) {
    await db
      .update(visits)
      .set({ status: "consulting" })
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)));
    visit.visits.status = "consulting";
  }

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
    documents: Array.isArray(v.documents) ? v.documents : [],
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
    documents: Array.isArray(visit.visits.documents) ? visit.visits.documents : [],
  };

  const initials = `${visit.patients.firstName[0] || ""}${visit.patients.lastName[0] || ""}`.toUpperCase();
  const isReturningPatient = pastVisits.length > 0;

  return (
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
  );
}
