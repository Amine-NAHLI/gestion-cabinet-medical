import { db } from "@/db";
import { visits, patients, clinics } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getTenantClinicId } from "@/lib/tenant";
import { getClinicSettings } from "@/actions/settings";
import { getPlatformSettings } from "@/actions/platform";
import StatsCharts from "./StatsCharts";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const clinicId = await getTenantClinicId();
  const settings = await getClinicSettings(clinicId);

  // Vérifier le plan du cabinet
  const [clinic] = await db
    .select({
      id: clinics.id,
      plan: clinics.plan,
    })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  const isStandard = clinic?.plan === "standard";
  const platform = await getPlatformSettings();

  if (isStandard) {
    return (
      <div className="space-y-6 pb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Statistiques</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
              Formule Standard
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Activité clinique, recettes et répartition des consultations.
          </p>
        </div>

        {/* ÉCRAN DE VERROUILLAGE ÉLÉGANT STANDARD */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-6 sm:p-10 text-center max-w-2xl mx-auto flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-5 shadow-xs">
              <span className="material-symbols-outlined text-[30px]">analytics</span>
            </div>

            <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider mb-3">
              Fonctionnalité Exclusivité Plan Pro
            </span>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Pilotez l'activité et les finances de votre cabinet
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
              Votre formule <strong>Standard</strong> est dédiée à la gestion clinique quotidienne (file d'attente, dossiers patients, ordonnances). 
              Les tableaux de bord analytiques, la comptabilité des encaissements et les bilans d'activité sont réservés aux praticiens abonnés à la formule <strong>Pro</strong>.
            </p>

            {/* 3 Cartes illustratives de ce qui est inclus dans le Plan Pro */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full my-7 text-left">
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <span className="material-symbols-outlined text-emerald-600 text-xl mb-1.5 block">
                  payments
                </span>
                <h3 className="text-xs font-bold text-slate-900">Chiffre d'Affaires</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Suivi quotidien, mensuel et annuel des encaissements en DH avec répartition par mode de paiement.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <span className="material-symbols-outlined text-sky-600 text-xl mb-1.5 block">
                  trending_up
                </span>
                <h3 className="text-xs font-bold text-slate-900">Flux & Fréquentation</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Volume de consultations par période, taux de nouveaux patients et pyramide des âges.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <span className="material-symbols-outlined text-purple-600 text-xl mb-1.5 block">
                  picture_as_pdf
                </span>
                <h3 className="text-xs font-bold text-slate-900">Export Comptable</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Téléchargement en 1 clic de rapports PDF complets prêts pour votre déclaration ou comptabilité.
                </p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                href="/dashboard/settings"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition"
              >
                <span className="material-symbols-outlined text-[17px] text-emerald-400">workspace_premium</span>
                <span>Passer au Plan Pro dans mes Paramètres</span>
              </Link>

              <a
                href={`mailto:${platform.supportEmail || "contact@toncabinet.me"}?subject=Demande%20de%20passage%20au%20Plan%20Pro`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition"
              >
                <span className="material-symbols-outlined text-[17px]">mail</span>
                <span>Contacter l'équipe par email</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PLAN PRO : Récupérer toutes les consultations terminées pour ce cabinet
  const allVisits = await db
    .select({
      id: visits.id,
      amountToPay: visits.amountToPay,
      createdAt: visits.createdAt,
      paidAt: visits.paidAt,
      paymentMethod: visits.paymentMethod,
      disease: visits.disease,
      diagnosis: visits.diagnosis,
      paymentStatus: visits.paymentStatus,
      status: visits.status,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientAge: patients.age,
    })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(and(eq(visits.clinicId, clinicId), eq(visits.status, "finished")));

  const clientVisits = allVisits.map((v) => ({
    ...v,
    amountToPay: v.amountToPay ? parseFloat(v.amountToPay as string) : 0,
    hasCustomAmount: v.amountToPay !== null && v.amountToPay !== undefined,
    createdAt: v.createdAt.toISOString(),
    paidAt: v.paidAt ? v.paidAt.toISOString() : null,
  }));

  const clinicInfo = {
    clinicName: settings?.clinicName || "",
    doctorName: settings?.doctorName || "",
    specialty: settings?.specialty || "",
    phone: settings?.phone || "",
    email: settings?.email || "",
    address: settings?.address || "",
    city: settings?.city || "",
    orderNumber: settings?.orderNumber || "",
    taxId: settings?.taxId || "",
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Statistiques</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            Formule Pro Active
          </span>
        </div>
        <p className="text-slate-500 text-sm mt-0.5">
          Activité clinique, recettes et répartition des consultations.
        </p>
      </div>

      <StatsCharts rawVisits={clientVisits} clinicInfo={clinicInfo} />
    </div>
  );
}
