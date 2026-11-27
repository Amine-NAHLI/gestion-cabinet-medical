import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { eq, asc, not, and } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import AppointmentsClient, { AppointmentItem } from "./AppointmentsClient";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;
  const clinicId = await getTenantClinicId();

  // Récupérer les rendez-vous non annulés triés par date pour ce cabinet
  const appointmentsList = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      time: appointments.time,
      reason: appointments.reason,
      status: appointments.status,
      patient: patients,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(eq(appointments.clinicId, clinicId), not(eq(appointments.status, "cancelled"))))
    .orderBy(asc(appointments.date));

  const formatted: AppointmentItem[] = appointmentsList.map((appt) => ({
    id: appt.id,
    date: appt.date instanceof Date ? appt.date.toISOString() : String(appt.date),
    time: appt.time,
    reason: appt.reason,
    status: appt.status,
    patient: {
      id: appt.patient.id,
      firstName: appt.patient.firstName,
      lastName: appt.patient.lastName,
      age: appt.patient.age,
      phone: appt.patient.phone,
      gender: appt.patient.gender,
      cin: appt.patient.cin,
      mutuelle: appt.patient.mutuelle,
      bloodGroup: appt.patient.bloodGroup,
      allergies: appt.patient.allergies,
      antecedents: appt.patient.antecedents,
    },
  }));

  return <AppointmentsClient initialAppointments={formatted} role={role} />;
}
