"use client";

import { useState, useEffect, useRef } from "react";

export default function MedicalAutocomplete({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [results, setResults] = useState<any[]>([]);
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
    if (!isOpen) return; // Don't fetch if dropdown is closed

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const customMeds = JSON.parse(localStorage.getItem('customMeds') || '[]');
        const filteredCustom = customMeds
          .filter((m: string) => m.toLowerCase().includes(value.toLowerCase()))
          .map((name: string) => ({ name, custom: true }));
        
        const res = await fetch(`https://morocco-medication-api.vercel.app/api/v1/medications?search=${encodeURIComponent(value)}&limit=10`);
        const data = await res.json();
        
        setResults([...filteredCustom, ...(data.data || [])]);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [value, isOpen]);

  function handleSelect(name: string) {
    onChange(name);
    setIsOpen(false);
  }

  function handleCustomSave() {
    const customMeds = JSON.parse(localStorage.getItem('customMeds') || '[]');
    if (!customMeds.includes(value)) {
      localStorage.setItem('customMeds', JSON.stringify([...customMeds, value]));
    }
    handleSelect(value);
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="block text-xs font-semibold text-slate-500 mb-1">Médicament</label>
      <input 
        type="text" 
        value={value} 
        onChange={(e) => { onChange(e.target.value); setIsOpen(true); }} 
        onFocus={() => { if (value.length >= 2) setIsOpen(true); }}
        placeholder="Tapez pour chercher (ex: Doli...)" 
        className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 bg-white text-sm" 
      />
      
      {isOpen && value.length >= 2 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {isLoading && <div className="p-4 text-sm text-slate-500 text-center flex items-center justify-center gap-2"><span className="material-symbols-outlined animate-spin text-sky-500">sync</span> Recherche...</div>}
          
          {!isLoading && results.map((r, i) => (
            <button 
              key={i} 
              type="button"
              onClick={() => handleSelect(r.name)} 
              className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 focus:bg-slate-50 focus:outline-none"
            >
              <div className="font-bold text-slate-800 text-sm">{r.name}</div>
              {r.custom && <div className="text-xs text-emerald-600 font-semibold mt-0.5"><span className="material-symbols-outlined text-[10px]">bookmark</span> Enregistré manuellement</div>}
              {!r.custom && r.form && <div className="text-xs text-slate-500 mt-0.5">{r.form} {r.dosageUnit ? `- ${r.dosageUnit}` : ''}</div>}
            </button>
          ))}

          {!isLoading && results.length === 0 && (
            <div className="p-4 text-center border-b border-slate-100 bg-slate-50">
              <p className="text-sm text-slate-500 mb-2">Aucun médicament trouvé.</p>
              <button 
                type="button"
                onClick={handleCustomSave} 
                className="bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm text-sky-600 text-sm font-semibold hover:border-sky-300 transition-colors"
              >
                Introuvable ? Enregistrer "{value}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
