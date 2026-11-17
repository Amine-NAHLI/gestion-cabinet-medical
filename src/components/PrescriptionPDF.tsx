interface PrescriptionPDFProps {
  patient: {
    firstName: string;
    lastName: string;
    age: number;
    phone?: string;
    mutuelle?: string | null;
    cin?: string | null;
  };
  medicines: { name: string; instructions: string }[];
  date: Date;
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

export default function PrescriptionPDF({
  patient,
  medicines,
  date,
  settings,
}: PrescriptionPDFProps) {
  if (!patient) return null;

  const doctorName = settings?.doctorName || "Dr. Amine Vance";
  const specialty = settings?.specialty || "Médecine Générale";
  const clinicName = settings?.clinicName || "Cabinet Médical";
  const address = settings?.address || "120 Boulevard d'Anfa";
  const city = settings?.city || "Casablanca";
  const phone = settings?.phone || "05 22 45 67 89";
  const email = settings?.email || "contact@medicabinet.ma";
  const orderNumber = settings?.orderNumber || "INPE: 045812903 • Ordre: 14209";

  const dateStr = date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[99999] p-12 text-slate-900 w-full min-h-screen">
      {/* En-tête Médical Professionnel */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
        <div className="text-left space-y-1">
          <h1 className="text-2xl font-black uppercase tracking-wider text-slate-950 font-serif">
            {doctorName}
          </h1>
          <p className="text-sm font-bold text-sky-800 tracking-wide">
            {specialty}
          </p>
          <p className="text-xs font-semibold text-slate-600">
            {clinicName}
          </p>
          <div className="text-[11px] text-slate-500 font-medium pt-1 space-y-0.5">
            <p>{address}, {city}</p>
            <p>Tél : {phone} • Email : {email}</p>
            {orderNumber && <p className="font-mono text-[10px] text-slate-400">{orderNumber}</p>}
          </div>
        </div>

        <div className="text-right text-xs font-medium text-slate-600 space-y-1">
          <p className="text-slate-800 font-bold">{city}, le {dateStr}</p>
          <span className="inline-block px-3 py-1 bg-slate-100 rounded-md font-mono text-[10px] text-slate-600 uppercase">
            Document Médical Officiel
          </span>
        </div>
      </div>

      {/* Cartouche Informations Patient */}
      <div className="mb-10 bg-slate-50/90 p-5 rounded-2xl border border-slate-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Patient(e)
            </span>
            <span className="text-lg font-black text-slate-900 uppercase">
              {patient.lastName} {patient.firstName}
            </span>
            {patient.cin && (
              <span className="block text-xs font-mono text-slate-500 font-bold mt-0.5">
                CIN : {patient.cin}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Informations
            </span>
            <span className="text-base font-bold text-slate-800">
              {patient.age} ans
            </span>
            {patient.mutuelle && (
              <span className="block text-xs font-semibold text-sky-700 mt-0.5">
                Couverture : {patient.mutuelle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Titre Ordonnance */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black uppercase tracking-[0.3em] inline-block border-b-2 border-slate-900 pb-1.5 font-serif">
          ORDONNANCE
        </h2>
      </div>

      {/* Liste des Prescriptions */}
      <div className="space-y-7 min-h-[360px] pl-2">
        {medicines.map((med, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="text-sm font-bold font-mono text-slate-400 mt-1">
              {String(i + 1).padStart(2, "0")}.
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-lg uppercase text-slate-900 tracking-tight">
                {med.name}
              </h3>
              {med.instructions && (
                <p className="text-sm mt-1 text-slate-700 italic border-l-2 border-slate-300 pl-3 py-0.5">
                  {med.instructions}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Signature & Cachet Praticien */}
      <div className="mt-16 flex justify-end">
        <div className="text-center w-64 space-y-16">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Signature et Cachet du Médecin
          </p>
          <div className="border-b-2 border-slate-400 w-full" />
        </div>
      </div>

      {/* Mentions Bas de Page */}
      <div className="mt-16 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
        <p>Ordonnance valable 3 mois sauf mention contraire • MediCabinet E-Santé</p>
      </div>
    </div>
  );
}
