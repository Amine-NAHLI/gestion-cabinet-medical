import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getClinicSettings } from "@/actions/settings";
import { getPlatformSettings } from "@/actions/platform";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role || "assistant";
  const settings = await getClinicSettings();
  const platform = await getPlatformSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Paramètres
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {role === "doctor"
            ? "Coordonnées du cabinet, champs de la fiche consultation et modèle d'ordonnance."
            : "Coordonnées du cabinet, mentions légales et tarif par défaut."}
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
          avatarUrl: (settings as any).avatarUrl || null,
          bio: (settings as any).bio || "",
          orderNumber: settings.orderNumber,
          taxId: settings.taxId,
          defaultFee: settings.defaultFee as string | null,
          consultationFields: settings.consultationFields,
          prescriptionTemplateUrl: settings.prescriptionTemplateUrl,
          prescriptionTemplateName: settings.prescriptionTemplateName,
          prescriptionTemplateLayout: settings.prescriptionTemplateLayout,
          subscription: (settings as any).subscription || null,
          supportWhatsapp: platform.supportWhatsapp,
          supportWhatsappMessage: platform.supportWhatsappMessage,
        }}
      />
    </div>
  );
}
