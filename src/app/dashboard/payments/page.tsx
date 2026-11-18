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
                  <MotionDiv
                    key={visit.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="p-5 rounded-2xl border border-emerald-100/80 bg-gradient-to-r from-emerald-50/30 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-300/80 hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs shadow-emerald-600/30">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                            {visit.patient.lastName} {visit.patient.firstName}
                          </h3>
                          {visit.patient.cin && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
                              {visit.patient.cin}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-slate-400">calendar_today</span>
                            {visitDate}
                          </span>
                          <span>•</span>
                          <span>
                            Tarif consultation :{" "}
                            <span className="font-bold text-slate-900 font-mono">
                              {visit.amountToPay ? `${visit.amountToPay} DH` : "À définir"}
                            </span>
                          </span>
                          {visit.patient.mutuelle && (
                            <>
                              <span>•</span>
                              <span className="text-teal-700 font-bold">{visit.patient.mutuelle}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <PaymentButton 
                        visitId={visit.id} 
                        initialAmount={visit.amountToPay as string | null} 
                        patient={visit.patient}
                        settings={settings}
                      />
                    </div>
                  </MotionDiv>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
