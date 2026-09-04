export default function PrescriptionPDF({ patient, medicines, date }: { patient: any, medicines: any[], date: Date }) {
  return (
    <div className="bg-white p-8 max-w-2xl mx-auto text-slate-900 hidden print:block absolute top-0 left-0 w-full h-full z-[100] bg-white">
      {/* En-tête du médecin */}
      <div className="border-b-2 border-slate-900 pb-6 mb-8 text-center">
        <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">Docteur</h1>
        <p className="text-xl font-medium mt-1">Médecine Générale</p>
        <p className="text-sm mt-2">123 Avenue de la Santé, Casablanca</p>
        <p className="text-sm">Tél : 05 22 00 00 00</p>
      </div>

      {/* Infos Patient */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <p className="text-lg">
            <span className="font-semibold">Patient : </span> 
            {patient.lastName} {patient.firstName}
          </p>
          <p className="text-md mt-1">
            <span className="font-semibold">Âge : </span> {patient.age} ans
          </p>
        </div>
        <div className="text-right">
          <p className="text-md">
            Fait le <span className="font-semibold">{date.toLocaleDateString('fr-FR')}</span>
          </p>
        </div>
      </div>

      {/* Titre */}
      <h2 className="text-2xl font-bold text-center mb-10 uppercase tracking-widest border-b border-slate-200 pb-4 inline-block mx-auto">Ordonnance</h2>

      {/* Médicaments */}
      <div className="space-y-8 min-h-[400px]">
        {medicines.map((med, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold shrink-0">
              {i + 1}
            </div>
            <div>
              <h3 className="font-bold text-xl uppercase">{med.name}</h3>
              {med.instructions && (
                <p className="text-lg mt-1 text-slate-700 font-medium">{med.instructions}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Signature */}
      <div className="mt-16 text-right">
        <p className="text-lg font-bold">Signature</p>
        <div className="h-24 w-48 border-b border-dashed border-slate-400 ml-auto mt-4"></div>
      </div>
    </div>
  );
}
