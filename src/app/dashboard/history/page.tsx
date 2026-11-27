import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients, clinics, prescriptions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import { getPlatformSettings } from "@/actions/platform";
import { getClinicSettings } from "@/actions/settings";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;
  const clinicId = await getTenantClinicId();

  // Récupérer le plan du cabinet
  const [clinic] = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      plan: clinics.plan,
      billingCycle: clinics.billingCycle,
      subscriptionExpiresAt: clinics.subscriptionExpiresAt,
      subscriptionStatus: clinics.subscriptionStatus,
      createdAt: clinics.createdAt,
    })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  const isStandard = clinic?.plan === "standard";
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = new Date(now - thirtyDaysMs);

  // 1. Récupérer TOUS les patients enregistrés dans ce cabinet
  const allPatients = await db
    .select()
    .from(patients)
    .where(eq(patients.clinicId, clinicId))
    .orderBy(desc(patients.createdAt));

  // 2. Récupérer TOUTES les consultations de ce cabinet
  const allVisits = await db
    .select({
      id: visits.id,
      patientId: visits.patientId,
      amountToPay: visits.amountToPay,
      status: visits.status,
      paymentStatus: visits.paymentStatus,
      paymentMethod: visits.paymentMethod,
      paidAt: visits.paidAt,
      disease: visits.disease,
      diagnosis: visits.diagnosis,
      notes: visits.notes,
      bloodPressure: visits.bloodPressure,
      heartRate: visits.heartRate,
      temperature: visits.temperature,
      weight: visits.weight,
      height: visits.height,
      documents: visits.documents,
      customData: visits.customData,
      createdAt: visits.createdAt,
    })
    .from(visits)
    .where(eq(visits.clinicId, clinicId))
    .orderBy(desc(visits.createdAt));

  // 3. Récupérer toutes les ordonnances du cabinet
  const allPrescriptions = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.clinicId, clinicId));

  const prescriptionsByVisit = new Map<number, { name: string; instructions: string }[]>();
  for (const pr of allPrescriptions) {
    prescriptionsByVisit.set(
      pr.visitId,
      Array.isArray(pr.medicines) ? (pr.medicines as { name: string; instructions: string }[]) : []
    );
  }

  // Dictionnaire des patients pour lookup instantané
  const patientMap = new Map<number, typeof allPatients[0]>();
  for (const p of allPatients) {
    patientMap.set(p.id, p);
  }

  // Filtrage standard si applicable
  let finishedVisits = allVisits.filter((v) => v.status === "finished");
  let archivedCount = 0;
  let daysUntilReset = 30;

  if (isStandard) {
    archivedCount = finishedVisits.filter((v) => new Date(v.createdAt) < thirtyDaysAgo).length;
    finishedVisits = finishedVisits.filter((v) => new Date(v.createdAt) >= thirtyDaysAgo);

    if (clinic?.subscriptionExpiresAt) {
      daysUntilReset = Math.max(
        1,
        Math.ceil((new Date(clinic.subscriptionExpiresAt).getTime() - now) / (1000 * 60 * 60 * 24))
      );
    } else {
      const daysSinceCreation = Math.floor(
        (now - new Date(clinic?.createdAt || now).getTime()) / (1000 * 60 * 60 * 24)
      );
      daysUntilReset = Math.max(1, 30 - (daysSinceCreation % 30));
    }
  }

  // Formatter la liste chronologique des consultations
  const formattedVisits = finishedVisits.map((v) => {
    const p = patientMap.get(v.patientId) || {
      id: v.patientId,
      clinicId,
      firstName: "Patient",
      lastName: `#${v.patientId}`,
      phone: "",
      age: 0,
      mutuelle: null,
      cin: null,
      gender: "M",
      bloodGroup: null,
      allergies: null,
      antecedents: null,
      address: null,
      createdAt: new Date(),
    };

    return {
      id: v.id,
      patientId: v.patientId,
      amountToPay: v.amountToPay ? String(v.amountToPay) : null,
      status: v.status,
      paymentStatus: v.paymentStatus,
      paymentMethod: v.paymentMethod,
      paidAt: v.paidAt ? v.paidAt.toISOString() : null,
      disease: v.disease,
      diagnosis: v.diagnosis,
      notes: v.notes,
      bloodPressure: v.bloodPressure,
      heartRate: v.heartRate,
      temperature: v.temperature ? String(v.temperature) : null,
      weight: v.weight ? String(v.weight) : null,
      height: v.height ? String(v.height) : null,
      createdAt: v.createdAt.toISOString(),
      documents: Array.isArray(v.documents) ? (v.documents as any) : [],
      medicines: prescriptionsByVisit.get(v.id) || [],
      patient: {
        ...p,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
      },
    };
  });

  // Regrouper l'historique complet longitudinal par patient
  const formattedPatients = allPatients.map((p) => {
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
        documents: Array.isArray(v.documents) ? (v.documents as any) : [],
        medicines: prescriptionsByVisit.get(v.id) || [],
      }));

    const lastVisit = patientVisits.length > 0 ? patientVisits[0] : null;

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
      lastVisitDate: lastVisit ? lastVisit.date : null,
      totalVisits: patientVisits.length,
      finishedVisitsCount: patientVisits.filter((v) => v.status === "finished").length,
    };
  });

  const [platform, clinicSettings] = await Promise.all([
    getPlatformSettings(),
    getClinicSettings(clinicId),
  ]);

  return (
    <HistoryClient
      visits={formattedVisits}
      patients={formattedPatients}
      role={role}
      isStandard={isStandard}
      archivedCount={archivedCount}
      daysUntilReset={daysUntilReset}
      supportWhatsapp={platform?.supportWhatsapp}
      supportWhatsappMessage={platform?.supportWhatsappMessage}
      clinicSettings={clinicSettings}
    />
  );
}
