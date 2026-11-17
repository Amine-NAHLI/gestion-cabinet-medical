import { NextResponse } from 'next/server';
import { db } from "@/db";
import { visits, patients, appointments } from "@/db/schema";
import { count } from "drizzle-orm";

/**
 * Endpoint de surveillance et de statistiques de santé du cabinet.
 * NOTE DE SÉCURITÉ MÉDICALE :
 * Conformément aux réglementations médicales et déontologiques (Loi 09-08 / RGPD / HDS),
 * les dossiers médicaux et consultations NE DOIVENT JAMAIS être purgés automatiquement.
 * Cet endpoint sert désormais de rapport de diagnostic du système.
 */
export async function GET() {
  try {
    const [visitsCount] = await db.select({ value: count() }).from(visits);
    const [patientsCount] = await db.select({ value: count() }).from(patients);
    const [appointmentsCount] = await db.select({ value: count() }).from(appointments);

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      medicalArchivePolicy: "Preservation compliant (Illimité)",
      counts: {
        totalVisits: visitsCount?.value || 0,
        totalPatients: patientsCount?.value || 0,
        totalAppointments: appointmentsCount?.value || 0,
      }
    });
  } catch (error) {
    console.error("Erreur maintenance diagnostic:", error);
    return NextResponse.json({ status: "error", message: "Erreur base de données" }, { status: 500 });
  }
}
