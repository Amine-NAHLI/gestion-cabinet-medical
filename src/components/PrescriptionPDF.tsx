export default function PrescriptionPDF({ patient, medicines, date }: { patient: any, medicines: any[], date: Date }) {
  if (!patient) return null; // Sécurité si patient n'est pas encore chargé

  return (
    <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[99999] p-12 text-black w-full min-h-screen">
      {/* En-tête du cabinet (Style Ordonnance Classique) */}
      <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-8">
        <div className="text-left">
          <h1 className="text-3xl font-black uppercase tracking-wider text-black">Dr. Amine NAHLI</h1>
          <p className="text-lg font-bold mt-1 text-slate-800">Médecine Générale</p>
          <div className="text-sm mt-3 text-slate-600 font-medium space-y-1">
            <p>123 Avenue de la Santé, Casablanca</p>
            <p>Tél : 05 22 00 00 00</p>
            <p>Email : contact@medicabinet.ma</p>
          </div>
        </div>
        <div className="text-right text-sm font-medium text-slate-600">
          <p>Le <span className="font-bold text-black">{date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span></p>
        </div>
      </div>

      {/* Informations du patient */}
      <div className="mb-12 bg-slate-50 p-6 rounded-lg border border-slate-200">
        <div className="grid grid-cols-2 gap-4">
          <p className="text-lg">
            <span className="font-bold text-slate-500 uppercase text-xs tracking-wider block mb-1">Nom et Prénom</span> 
            <span className="font-bold text-xl uppercase">{patient.lastName} {patient.firstName}</span>
          </p>
          <p className="text-lg text-right">
            <span className="font-bold text-slate-500 uppercase text-xs tracking-wider block mb-1">Âge</span> 
            <span className="font-bold text-xl">{patient.age} ans</span>
          </p>
        </div>
      </div>

      {/* Titre */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black uppercase tracking-[0.3em] inline-block border-b-4 border-black pb-2">Ordonnance</h2>
      </div>

      {/* Liste des Médicaments */}
      <div className="space-y-10 min-h-[400px] pl-4">
        {medicines.map((med, i) => (
          <div key={i} className="flex gap-6 items-start">
            <div className="text-xl font-bold text-slate-400 mt-1">
              {String(i + 1).padStart(2, '0')}.
            </div>
            <div>
              <h3 className="font-bold text-2xl uppercase text-black">{med.name}</h3>
              {med.instructions && (
                <p className="text-lg mt-2 text-slate-700 italic border-l-4 border-slate-300 pl-4 py-1">{med.instructions}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Signature */}
      <div className="mt-24 flex justify-end">
        <div className="text-center w-64">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-20">Signature et Cachet</p>
          <div className="border-b border-black w-full"></div>
        </div>
      </div>
    </div>
  );
}
