import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { getClinicSettings } from "@/actions/settings";
import { getTenantClinicId } from "@/lib/tenant";
import PaymentButton from "@/components/PaymentButton";
import { redirect } from "next/navigation";
import { MotionDiv } from "@/components/MotionWrapper";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;

  if (role !== 'assistant') {
    redirect("/dashboard/queue");
  }

  const clinicId = await getTenantClinicId();
  const settings = await getClinicSettings();

  // Tous les paiements en attente strictement pour ce cabinet
  const toPayList = await db.select({
      id: visits.id,
      amountToPay: visits.amountToPay,
      patient: patients,
      createdAt: visits.createdAt
    })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(and(eq(visits.clinicId, clinicId), eq(visits.status, 'finished'), eq(visits.paymentStatus, 'pending')))
    .orderBy(asc(visits.createdAt));

  // Total à encaisser
  const totalPendingAmount = toPayList.reduce(
    (acc, v) => acc + (v.amountToPay ? parseFloat(v.amountToPay as string) : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Encaissements</h1>
          <p className="text-slate-500 text-sm mt-0.5">Consultations clôturées en attente de règlement.</p>
        </div>

        <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] self-start">
          <div className="text-[11px] text-slate-500 font-medium">Total à encaisser</div>
          <div className="text-lg font-semibold text-slate-900 tabular-nums">
            {totalPendingAmount.toLocaleString("fr-FR")}{" "}
            <span className="text-xs font-normal text-slate-500">DH</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] border border-slate-200/90 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Dossiers en attente de règlement ({toPayList.length})
          </h2>
        </div>
        
        <div className="p-6">
          {toPayList.length === 0 ? (
            <div className="text-center text-slate-500 py-16 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
                <span className="material-symbols-outlined text-3xl">task_alt</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Tous les paiements sont à jour</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Aucun règlement n'est actuellement en souffrance pour le cabinet.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {toPayList.map((visit, index) => {
                const initials = `${visit.patient.firstName[0] || ""}${visit.patient.lastName[0] || ""}`.toUpperCase();
                const visitDate = visit.createdAt.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <div
                    key={visit.id}
                    className="p-4 sm:p-5 rounded-xl border border-slate-200/90 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:border-slate-300 transition"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center font-semibold text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                            {visit.patient.lastName} {visit.patient.firstName}
                          </h3>
                          {visit.patient.cin && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                              {visit.patient.cin}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-slate-400">calendar_today</span>
                            {visitDate}
                          </span>
                          <span>•</span>
                          <span>
                            Tarif :{" "}
                            <span className="font-semibold text-slate-900 tabular-nums">
                              {visit.amountToPay ? `${visit.amountToPay} DH` : "À définir"}
                            </span>
                          </span>
                          {visit.patient.mutuelle && (
                            <>
                              <span>•</span>
                              <span className="text-slate-700 font-medium">{visit.patient.mutuelle}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                      <PaymentButton 
                        visitId={visit.id} 
                        initialAmount={visit.amountToPay as string | null} 
                        patient={visit.patient}
                        settings={settings}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
