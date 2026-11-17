interface ReceiptPDFProps {
  patient: {
    firstName: string;
    lastName: string;
    age?: number;
    phone?: string;
    mutuelle?: string | null;
    cin?: string | null;
  };
  amount: number | string;
  paymentMethod?: string;
  date: Date;
  visitId: number;
  settings?: {
    clinicName?: string;
    doctorName?: string;
    specialty?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    orderNumber?: string | null;
    taxId?: string | null;
  } | null;
}

export default function ReceiptPDF({
  patient,
  amount,
  paymentMethod = "cash",
  date,
  visitId,
  settings,
}: ReceiptPDFProps) {
  if (!patient) return null;

  const doctorName = settings?.doctorName || "Dr. Amine Vance";
  const specialty = settings?.specialty || "Médecine Générale";
  const clinicName = settings?.clinicName || "Cabinet Médical";
  const address = settings?.address || "120 Boulevard d'Anfa";
  const city = settings?.city || "Casablanca";
  const phone = settings?.phone || "05 22 45 67 89";
  const taxId = settings?.taxId || "ICE: 002938475000012 • IF: 45091823";
  const orderNumber = settings?.orderNumber || "INPE: 045812903 • Ordre: 14209";

  const dateStr = date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const methodLabel: Record<string, string> = {
    cash: "Espèces",
    card: "Carte Bancaire (TPE)",
    check: "Chèque",
    insurance: "Tiers-payant Mutuelle",
    free: "Gracieux / Contrôle",
  };

  return (
    <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[99999] p-12 text-slate-900 w-full min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase text-slate-950 font-serif">
            {doctorName}
          </h1>
          <p className="text-sm font-bold text-teal-800">
            {specialty}
          </p>
          <p className="text-xs text-slate-600 font-medium">
            {clinicName}
          </p>
          <div className="text-[11px] text-slate-500 pt-1 space-y-0.5">
            <p>{address}, {city} • Tél : {phone}</p>
            {orderNumber && <p className="font-mono text-[10px] text-slate-400">{orderNumber}</p>}
            {taxId && <p className="font-mono text-[10px] text-slate-400 font-bold">{taxId}</p>}
          </div>
        </div>

        <div className="text-right text-xs space-y-1">
          <p className="text-slate-800 font-bold">{city}, le {dateStr}</p>
          <p className="font-mono text-[11px] font-bold text-slate-600">
            Reçu N° : REC-{String(visitId).padStart(5, "0")}
          </p>
        </div>
      </div>

      {/* Titre */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-black uppercase tracking-[0.2em] inline-block border-b-2 border-slate-900 pb-1 font-serif">
          NOTE D'HONORAIRES & QUITTANCE DE PAIEMENT
        </h2>
        <p className="text-[11px] text-slate-500 mt-1 italic">
          Valable pour remboursement auprès de la CNSS, CNOPS et organismes d'assurances
        </p>
      </div>

      {/* Patient Box */}
      <div className="mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Bénéficiaire des soins
            </span>
            <span className="text-lg font-black text-slate-900 uppercase">
              {patient.lastName} {patient.firstName}
            </span>
            {patient.cin && (
              <span className="block text-xs font-mono text-slate-600 font-bold mt-0.5">
                CIN : {patient.cin}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Organisme de Couverture
            </span>
            <span className="text-base font-bold text-slate-800">
              {patient.mutuelle || "Règlement direct (Privé)"}
            </span>
          </div>
        </div>
      </div>

      {/* Acte & Montant Table */}
      <table className="w-full mb-10 border border-slate-200 rounded-xl overflow-hidden text-sm">
        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px]">
          <tr>
            <th className="py-3 px-4 text-left">Description de l'Acte Médical</th>
            <th className="py-3 px-4 text-center">Mode de règlement</th>
            <th className="py-3 px-4 text-right">Montant Réglé (DH)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr>
            <td className="py-4 px-4 font-semibold text-slate-800">
              Consultation médicale et examen clinique
            </td>
            <td className="py-4 px-4 text-center font-medium text-slate-600">
              {methodLabel[paymentMethod] || paymentMethod}
            </td>
            <td className="py-4 px-4 text-right font-black text-slate-900 text-base font-mono">
              {amount} DH
            </td>
          </tr>
        </tbody>
        <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black">
          <tr>
            <td colSpan={2} className="py-3 px-4 text-right uppercase text-xs">
              Total des honoraires perçus :
            </td>
            <td className="py-3 px-4 text-right text-lg text-emerald-800 font-mono">
              {amount} DH
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Mentions de certification */}
      <p className="text-xs text-slate-600 italic mb-12">
        Je soussigné(e), {doctorName}, certifie avoir reçu de Monsieur/Madame {patient.lastName} {patient.firstName} la somme de {amount} Dirhams au titre des soins médicaux dispensés ce jour.
      </p>

      {/* Cachet et signature */}
      <div className="flex justify-end mt-12">
        <div className="text-center w-64 space-y-16">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Cachet du Cabinet & Signature
          </p>
          <div className="border-b-2 border-slate-400 w-full" />
        </div>
      </div>
    </div>
  );
}
