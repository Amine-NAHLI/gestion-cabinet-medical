"use server";

import { db } from "@/db";
import { patients, visits, prescriptions, appointments } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { ilike, or, eq, desc, and, inArray, ne } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getTenantClinicId } from "@/lib/tenant";

export async function addPatientAndVisit(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: "Non autorisé" };
  }

  const clinicId = await getTenantClinicId();

  const firstName = (formData.get("firstName") as string || "").trim();
  const lastName = (formData.get("lastName") as string || "").trim();
  const phone = (formData.get("phone") as string || "").trim();
  const age = parseInt(formData.get("age") as string) || 0;
  const mutuelle = (formData.get("mutuelle") as string || "").trim() || null;
  const cin = (formData.get("cin") as string || "").trim() || null;
  const gender = (formData.get("gender") as string || "M").trim();
  const bloodGroup = (formData.get("bloodGroup") as string || "").trim() || null;
  const allergies = (formData.get("allergies") as string || "").trim() || null;
  const antecedents = (formData.get("antecedents") as string || "").trim() || null;

  try {
    // Vérifier si un patient existe déjà dans CE cabinet (Multi-Tenancy)
    let targetPatientId: number | null = null;
    
    if (cin) {
      const existingCin = await db
        .select()
        .from(patients)
        .where(and(eq(patients.clinicId, clinicId), eq(patients.cin, cin)))
        .limit(1);
      if (existingCin.length > 0) {
        targetPatientId = existingCin[0].id;
      }
    }

    if (!targetPatientId && phone) {
      const existingPhone = await db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            eq(patients.phone, phone),
            ilike(patients.lastName, lastName)
          )
        )
        .limit(1);
      if (existingPhone.length > 0) {
        targetPatientId = existingPhone[0].id;
      }
    }

    // Si le patient n'existe pas dans ce cabinet, on le crée
    if (!targetPatientId) {
      const [newPatient] = await db
        .insert(patients)
        .values({
          clinicId,
          firstName,
          lastName,
          phone,
          age,
          mutuelle,
          cin,
          gender,
          bloodGroup,
          allergies,
          antecedents,
        })
        .returning();
      targetPatientId = newPatient.id;
    } else {
      // Mettre à jour les éventuelles nouvelles informations pour ce cabinet
      await db
        .update(patients)
        .set({
          phone: phone || undefined,
          age: age || undefined,
          mutuelle: mutuelle || undefined,
          cin: cin || undefined,
          allergies: allergies || undefined,
          antecedents: antecedents || undefined,
        })
        .where(and(eq(patients.id, targetPatientId), eq(patients.clinicId, clinicId)));
    }

    // Créer la visite en salle d'attente pour ce cabinet
    await db.insert(visits).values({
      clinicId,
      patientId: targetPatientId,
      status: "waiting",
      isAppointment: false,
    });

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/queue");
    revalidatePath("/dashboard/patients");
    return { success: true, patientId: targetPatientId };
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du patient:", error);
    return { success: false, error: "Erreur lors de l'enregistrement." };
  }
}

export async function createVisitForExistingPatient(patientId: number) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: "Non autorisé" };
  }

  const clinicId = await getTenantClinicId();

  try {
    // Vérifier que le patient appartient bien à ce cabinet
    const patientCheck = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)))
      .limit(1);

    if (patientCheck.length === 0) {
      return { success: false, error: "Patient introuvable dans ce cabinet." };
    }

    await db.insert(visits).values({
      clinicId,
      patientId,
      status: "waiting",
      isAppointment: false,
    });

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/queue");
    return { success: true };
  } catch (error) {
    console.error("Erreur mise en file du patient existant:", error);
    return { success: false, error: "Impossible de mettre le patient en file d'attente." };
  }
}

export async function searchPatients(query: string) {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  const clinicId = await getTenantClinicId();

  try {
    const list = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.clinicId, clinicId),
          or(
            ilike(patients.lastName, `%${trimmed}%`),
            ilike(patients.firstName, `%${trimmed}%`),
            ilike(patients.phone, `%${trimmed}%`),
            ilike(patients.cin, `%${trimmed}%`)
          )
        )
      )
      .limit(10);

    return list;
  } catch (error) {
    console.error("Erreur recherche patients:", error);
    return [];
  }
}

export async function updatePatient(patientId: number, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  const firstName = (formData.get("firstName") as string || "").trim();
  const lastName = (formData.get("lastName") as string || "").trim();
  const phone = (formData.get("phone") as string || "").trim();
  const age = parseInt(formData.get("age") as string) || 0;
  const mutuelle = (formData.get("mutuelle") as string || "").trim() || null;
  const cin = (formData.get("cin") as string || "").trim() || null;
  const bloodGroup = (formData.get("bloodGroup") as string || "").trim() || null;
  const allergies = (formData.get("allergies") as string || "").trim() || null;
  const antecedents = (formData.get("antecedents") as string || "").trim() || null;
  const address = (formData.get("address") as string || "").trim() || null;

  try {
    await db
      .update(patients)
      .set({
        firstName,
        lastName,
        phone,
        age,
        mutuelle,
        cin,
        bloodGroup,
        allergies,
        antecedents,
        address,
      })
      .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)));

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error) {
    console.error("Erreur mise à jour dossier patient:", error);
    return { success: false, error: "Erreur lors de la mise à jour." };
  }
}

export async function sendPatientToDoctor(visitId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  try {
    await db
      .update(visits)
      .set({ status: 'ready' })
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)));
      
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/queue");
    return { success: true };
  } catch (error) {
    console.error("Erreur d'envoi au médecin:", error);
    return { success: false, error: "Erreur lors de la mise à jour du statut." };
  }
}

export async function cancelVisit(visitId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  try {
    await db
      .update(visits)
      .set({ status: 'cancelled' })
      .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)));
      
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/queue");
    return { success: true };
  } catch (error) {
    console.error("Erreur annulation visite:", error);
    return { success: false, error: "Erreur lors de l'annulation de la visite." };
  }
}

export async function deletePatient(patientId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  try {
    const patientVisits = await db
      .select({ id: visits.id })
      .from(visits)
      .where(and(eq(visits.patientId, patientId), eq(visits.clinicId, clinicId)));

    const visitIds = patientVisits.map((v) => v.id);
    if (visitIds.length > 0) {
      await db.delete(prescriptions).where(inArray(prescriptions.visitId, visitIds));
      await db
        .delete(visits)
        .where(and(eq(visits.patientId, patientId), eq(visits.clinicId, clinicId)));
    }

    await db
      .delete(appointments)
      .where(and(eq(appointments.patientId, patientId), eq(appointments.clinicId, clinicId)));

    await db
      .delete(patients)
      .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)));

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/patients");
    revalidatePath("/dashboard/queue");
    revalidatePath("/dashboard/history");
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression patient:", error);
    return { success: false, error: "Erreur lors de la suppression de la fiche patient." };
  }
}

export async function getPatientMedicalHistory(patientId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Non autorisé" };

  const clinicId = await getTenantClinicId();

  try {
    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)))
      .limit(1);

    if (!patient) {
      return { success: false, error: "Patient introuvable" };
    }

    const pastVisits = await db
      .select()
      .from(visits)
      .where(
        and(
          eq(visits.patientId, patientId),
          eq(visits.clinicId, clinicId),
          ne(visits.status, "cancelled")
        )
      )
      .orderBy(desc(visits.createdAt));

    const visitIds = pastVisits.map((v) => v.id);
    const prescriptionsList =
      visitIds.length > 0
        ? await db
            .select()
            .from(prescriptions)
            .where(inArray(prescriptions.visitId, visitIds))
        : [];

    const prescriptionsMap = new Map<number, { name: string; instructions: string }[]>();
    for (const pr of prescriptionsList) {
      prescriptionsMap.set(
        pr.visitId,
        Array.isArray(pr.medicines) ? (pr.medicines as { name: string; instructions: string }[]) : []
      );
    }

    const serializedVisits = pastVisits.map((v) => ({
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
      medicines: prescriptionsMap.get(v.id) || [],
    }));

    return {
      success: true,
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        age: patient.age,
        phone: patient.phone,
        gender: patient.gender,
        mutuelle: patient.mutuelle,
        cin: patient.cin,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies,
        antecedents: patient.antecedents,
        address: patient.address,
        createdAt: patient.createdAt.toISOString(),
      },
      visits: serializedVisits,
      totalVisitsCount: serializedVisits.length,
    };
  } catch (error) {
    console.error("Erreur récupération historique patient:", error);
    return { success: false, error: "Erreur lors du chargement de l'historique." };
  }
}
