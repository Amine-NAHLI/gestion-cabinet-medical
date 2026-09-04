import { NextResponse } from 'next/server';
import { db } from "@/db";
import { visits, patients, appointments } from "@/db/schema";
import { sql, lt, notInArray } from "drizzle-orm";

export async function GET() {
  try {
    // 1. Calculer la date limite (il y a 7 jours)
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);

    // 2. Trouver toutes les visites vieilles de plus de 7 jours
    const oldVisits = await db.select({ id: visits.id, patientId: visits.patientId })
      .from(visits)
      .where(lt(visits.createdAt, limite));
      
    if (oldVisits.length === 0) {
      return NextResponse.json({ message: "Rien à purger" });
    }

    const oldVisitIds = oldVisits.map(v => v.id);
    const potentiallyOldPatientIds = oldVisits.map(v => v.patientId);

    // 3. Supprimer les vieilles visites (ce qui supprime aussi les ordonnances en cascade si on avait configuré le onDelete cascade, sinon on doit le faire manuellement).
    // Note: Dans ce schéma, nous n'avons pas d'ordonnances séparées (tout est dans la visite ou dans prescriptions avec visitId).
    // Pour simplifier on va juste supprimer les visites.
    await db.delete(visits).where(lt(visits.createdAt, limite));

    // 4. On récupère les IDs des patients qui ont des rendez-vous futurs
    const futureAppointments = await db.select({ patientId: appointments.patientId })
      .from(appointments);
    const protectedPatientIds = futureAppointments.map(a => a.patientId);

    // 5. On supprime les patients qui étaient liés aux vieilles visites MAIS qui n'ont PAS de rendez-vous futur.
    // Et qui n'ont plus aucune visite récente (pour être sûr).
    const recentVisits = await db.select({ patientId: visits.patientId }).from(visits);
    const recentPatientIds = recentVisits.map(v => v.patientId);

    const patientsToKeep = new Set([...protectedPatientIds, ...recentPatientIds]);
    
    // Tous les patients qui ne sont ni dans protectedPatientIds ni dans recentPatientIds peuvent être supprimés
    if (patientsToKeep.size > 0) {
      await db.delete(patients).where(
        notInArray(patients.id, Array.from(patientsToKeep))
      );
    } else {
      // Si la base est totalement vide de visites récentes et rendez-vous, on supprime tout !
      await db.delete(patients);
    }

    return NextResponse.json({ 
      success: true, 
      purgedVisits: oldVisitIds.length 
    });

  } catch (error) {
    console.error("Erreur lors de la purge:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
