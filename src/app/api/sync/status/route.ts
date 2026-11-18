import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients, appointments, users } from "@/db/schema";
import { eq, and, sql, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Résolution sécurisée du clinicId (Multi-Tenancy strict)
    let clinicId = (session.user as any).clinicId;
    if (!clinicId && session.user.id) {
      const userInDb = await db
        .select({ clinicId: users.clinicId })
        .from(users)
        .where(eq(users.id, parseInt(session.user.id, 10)))
        .limit(1);
      clinicId = userInDb[0]?.clinicId;
    }

    if (!clinicId) {
      return NextResponse.json({ error: "No clinic assigned" }, { status: 403 });
    }

    const numericClinicId = Number(clinicId);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Requêtes légères en parallèle, strictement isolées par cabinet
    const [todayVisits, clinicAppointments, patientsStats] = await Promise.all([
      db
        .select({
          id: visits.id,
          status: visits.status,
          paymentStatus: visits.paymentStatus,
          amountToPay: visits.amountToPay,
          firstName: patients.firstName,
          lastName: patients.lastName,
        })
        .from(visits)
        .innerJoin(patients, eq(visits.patientId, patients.id))
        .where(and(eq(visits.clinicId, numericClinicId), sql`${visits.createdAt} >= ${todayStart}`))
        .orderBy(asc(visits.createdAt)),

      db
        .select({
          id: appointments.id,
          status: appointments.status,
          date: appointments.date,
          time: appointments.time,
        })
        .from(appointments)
        .where(eq(appointments.clinicId, numericClinicId))
        .orderBy(asc(appointments.id)),

      db
        .select({
          total: sql<number>`count(*)::int`,
          maxId: sql<number>`coalesce(max(${patients.id}), 0)::int`,
        })
        .from(patients)
        .where(eq(patients.clinicId, numericClinicId)),
    ]);

    const waitingVisits = todayVisits.filter((v) => v.status === "waiting");
    const readyVisits = todayVisits
      .filter((v) => v.status === "ready")
      .map((v) => ({
        id: v.id,
        patientName: `${v.lastName} ${v.firstName}`.trim(),
      }));

    const pendingPayments = todayVisits
      .filter((v) => v.status === "finished" && v.paymentStatus !== "paid")
      .map((v) => ({
        id: v.id,
        patientName: `${v.lastName} ${v.firstName}`.trim(),
        amount: v.amountToPay,
      }));

    const activeAppointments = clinicAppointments.filter((a) => a.status !== "cancelled");

    // Empreinte déterministe : change instantanément dès qu'une donnée bouge
    const visitsSig = todayVisits
      .map((v) => `${v.id}:${v.status}:${v.paymentStatus}:${v.amountToPay ?? ""}`)
      .join("|");
    const apptSig = clinicAppointments
      .map((a) => `${a.id}:${a.status}:${a.time ?? ""}`)
      .join("|");
    const patientsCount = patientsStats[0]?.total ?? 0;
    const maxPatientId = patientsStats[0]?.maxId ?? 0;

    const signature = `v[${visitsSig}]_a[${apptSig}]_p[${patientsCount}:${maxPatientId}]`;

    return NextResponse.json(
      {
        signature,
        waitingCount: waitingVisits.length,
        readyVisits,
        pendingPayments,
        patientsCount,
        appointmentsCount: activeAppointments.length,
        timestamp: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("[SYNC API ERROR]", error);
    return NextResponse.json({ error: "Sync error" }, { status: 500 });
  }
}
