"use client";

import { useState, useEffect, useRef } from "react";
import { MOROCCAN_COMMON_MEDICATIONS, MedicationItem } from "@/lib/moroccanMedications";

interface MedicalAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelectInstruction?: (instruction: string) => void;
  hideLabel?: boolean;
}

export default function MedicalAutocomplete({
  value,
  onChange,
  onSelectInstruction,
  hideLabel = false,
}: MedicalAutocompleteProps) {
  const [results, setResults] = useState<MedicationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value.length < 2) {
      setResults([]);
      return;
    }
    if (!isOpen) return;

    const query = value.toLowerCase().trim();

    // 1. Recherche instantanée dans la base marocaine locale
    const localMatches = MOROCCAN_COMMON_MEDICATIONS.filter(m =>
      m.name.toLowerCase().includes(query)
    );

    // 2. Recherche dans les médicaments personnalisés enregistrés dans le cabinet
    let customMatches: MedicationItem[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem('customMeds') || '[]');
      customMatches = stored
        .filter((name: string) => name.toLowerCase().includes(query))
        .map((name: string) => ({ name, form: "Personnalisé", defaultInstructions: "" }));
    } catch {
      // Ignorer si localStorage indisponible
    }

    // Déduplication
    const combined = [...localMatches, ...customMatches];
    const unique = combined.filter((item, index, self) =>
      index === self.findIndex((t) => t.name.toLowerCase() === item.name.toLowerCase())
    );

    setResults(unique.slice(0, 8));

    // Optionnel : tentative d'enrichissement via API en arrière-plan sans blocage
    const timeout = setTimeout(async () => {
      if (unique.length < 3) {
        setIsLoading(true);
        try {
          const res = await fetch(`https://morocco-medication-api.vercel.app/api/v1/medications?search=${encodeURIComponent(value)}&limit=6`);
          if (res.ok) {
            const data = await res.json();
            if (data?.data && Array.isArray(data.data)) {
              const apiMeds: MedicationItem[] = data.data.map((item: any) => ({
                name: item.name,
                form: item.form || "",
                dosageUnit: item.dosageUnit || "",
              }));
              setResults(prev => {
                const merged = [...prev, ...apiMeds];
                return merged.filter((item, index, self) =>
                  index === self.findIndex((t) => t.name.toLowerCase() === item.name.toLowerCase())
                ).slice(0, 10);
              });
            }
          }
        } catch {
          // Échec silencieux de l'API externe, la base locale suffit amplement
        } finally {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [value, isOpen]);

  function handleSelect(item: MedicationItem) {
    onChange(item.name);
    if (item.defaultInstructions && onSelectInstruction) {
      onSelectInstruction(item.defaultInstructions);
    }
    setIsOpen(false);
  }

  function handleCustomSave() {
    try {
      const stored = JSON.parse(localStorage.getItem('customMeds') || '[]');
      if (!stored.includes(value)) {
        localStorage.setItem('customMeds', JSON.stringify([...stored, value]));
      }
    } catch {}
    handleSelect({ name: value });
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      {!hideLabel && (
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          Médicament / Spécialité
        </label>
      )}
      <div className="relative">
        <input 
          type="text" 
          value={value} 
          onChange={(e) => { onChange(e.target.value); setIsOpen(true); }} 
          onFocus={() => { if (value.length >= 2) setIsOpen(true); }}
          placeholder="Ex: Doliprane, Augmentin, Inexium..." 
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-gramm="false"
          data-enable-grammarly="false"
          className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:outline-none transition-all shadow-xs" 
        />
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
          medication
        </span>
      </div>
      
      {isOpen && value.length >= 2 && (
        <div className="absolute z-30 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {isLoading && (
            <div className="p-3 text-xs text-slate-400 text-center flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-sky-500 text-sm">sync</span>
              Recherche approfondie...
            </div>
          )}
          
          {results.map((r, i) => (
            <button 
              key={i} 
              type="button"
              onClick={() => handleSelect(r)} 
              className="w-full text-left p-3 hover:bg-sky-50/70 border-b border-slate-100 last:border-0 focus:bg-sky-50 focus:outline-none transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs group-hover:text-sky-700 transition-colors">
                  {r.name}
                </span>
                {r.dosageUnit && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {r.dosageUnit}
                  </span>
                )}
              </div>
              {r.form && (
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Forme : {r.form}
                </div>
              )}
            </button>
          ))}

          {results.length === 0 && !isLoading && (
            <div className="p-4 text-center bg-slate-50">
              <p className="text-xs text-slate-500 mb-2">Non répertorié dans la nomenclature.</p>
              <button 
                type="button"
                onClick={handleCustomSave} 
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-sky-600 text-xs font-bold hover:border-sky-300 hover:bg-sky-50 transition-all cursor-pointer"
              >
                Enregistrer "{value}" pour le cabinet
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
