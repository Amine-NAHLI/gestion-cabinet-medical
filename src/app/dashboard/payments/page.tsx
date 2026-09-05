import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
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

  // Tous les paiements en attente
  const toPayList = await db.select({
      id: visits.id,
      amountToPay: visits.amountToPay,
      patient: patients,
      createdAt: visits.createdAt
    })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(and(eq(visits.status, 'finished'), eq(visits.paymentStatus, 'pending')))
    .orderBy(asc(visits.createdAt));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-xs font-semibold text-emerald-800 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Caisse & Règlement
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Paiements en attente</h1>
          <p className="text-slate-500 text-sm mt-1">Encaissements des consultations clôturées par le médecin praticien.</p>
        </div>

        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">À encaisser</div>
            <div className="text-lg font-extrabold text-slate-900">{toPayList.length} dossier{toPayList.length > 1 ? "s" : ""}</div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
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
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Aucun règlement n&apos;est actuellement en souffrance pour le cabinet.</p>
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
                    className="p-5 rounded-2xl border border-emerald-100/80 bg-linear-to-r from-emerald-50/40 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-300/80 hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs shadow-emerald-600/30">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                          {visit.patient.lastName} {visit.patient.firstName}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-slate-400">calendar_today</span>
                            {visitDate}
                          </span>
                          <span>•</span>
                          <span>
                            Tarif praticien :{" "}
                            <span className="font-bold text-slate-900">
                              {visit.amountToPay ? `${visit.amountToPay} DH` : "À définir"}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <PaymentButton visitId={visit.id} initialAmount={visit.amountToPay} />
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
