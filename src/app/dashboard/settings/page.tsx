import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getClinicSettings } from "@/actions/settings";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role || "assistant";
  const settings = await getClinicSettings();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
          <span className="material-symbols-outlined text-xs">tune</span>
          Configuration du Cabinet
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Paramètres & Personnalisation
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {role === "doctor"
            ? "Configurez les informations du cabinet, personnalisez les cases de la fiche consultation et importez votre modèle d'ordonnance."
            : "Gérez les coordonnées du cabinet, les mentions déontologiques et le tarif par défaut."}
        </p>
      </div>

      <SettingsClient
        role={role}
        initialSettings={{
          clinicName: settings.clinicName,
          doctorName: settings.doctorName,
          specialty: settings.specialty,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          city: settings.city,
          orderNumber: settings.orderNumber,
          taxId: settings.taxId,
          defaultFee: settings.defaultFee as string | null,
          consultationFields: settings.consultationFields,
          prescriptionTemplateUrl: settings.prescriptionTemplateUrl,
          prescriptionTemplateName: settings.prescriptionTemplateName,
          prescriptionTemplateLayout: settings.prescriptionTemplateLayout,
        }}
      />
    </div>
  );
}
