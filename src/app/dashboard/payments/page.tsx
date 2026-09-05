import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/db";
import { visits, patients } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import PaymentButton from "@/components/PaymentButton";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== 'assistant') {
    redirect("/dashboard/queue");
  }

  // Tous les paiements en attente (pas seulement d'aujourd'hui, au cas où il y a un oubli d'hier)
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Paiements en attente</h1>
        <p className="text-slate-500 mt-1">Gérez les encaissements des consultations terminées.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            À encaisser ({toPayList.length})
          </h2>
        </div>
        
        <div className="p-6">
          {toPayList.length === 0 ? (
            <div className="text-center text-slate-500 py-12 flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl mb-3 text-slate-300">task_alt</span>
              <p>Aucun paiement en attente.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {toPayList.map(visit => (
                <div key={visit.id} className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/30 flex items-center justify-between hover:border-emerald-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                      <span className="material-symbols-outlined">payments</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{visit.patient.lastName} {visit.patient.firstName}</h3>
                      <p className="text-sm font-semibold mt-0.5 text-slate-500">
                        Date : {visit.createdAt.toLocaleDateString('fr-FR')} | Montant : <span className="text-emerald-600">{visit.amountToPay ? `${visit.amountToPay} DH` : 'À définir'}</span>
                      </p>
                    </div>
                  </div>
                  <PaymentButton visitId={visit.id} initialAmount={visit.amountToPay} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
