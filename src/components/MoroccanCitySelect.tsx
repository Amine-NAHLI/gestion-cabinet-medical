"use client";

import { useState, useRef, useEffect } from "react";
import { searchMoroccanCities, MoroccanCity } from "@/lib/moroccanCities";
import { motion, AnimatePresence } from "framer-motion";

interface MoroccanCitySelectProps {
  value: string;
  onChange: (city: string) => void;
  required?: boolean;
}

export default function MoroccanCitySelect({
  value,
  onChange,
  required = true,
}: MoroccanCitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filteredCities, setFilteredCities] = useState<MoroccanCity[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtrer en direct
  useEffect(() => {
    setFilteredCities(searchMoroccanCities(search));
  }, [search]);

  // Fermer quand on clique à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (cityName: string) => {
    onChange(cityName);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        Ville du Cabinet {required && <span className="text-red-500">*</span>}
      </label>

      {/* Bouton de sélection / Champ d'affichage */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs text-left cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="material-symbols-outlined text-[18px] text-slate-400">location_on</span>
          <span className={value ? "text-slate-900 font-semibold" : "text-slate-400"}>
            {value || "Sélectionnez votre ville (ex: Casablanca, Fès, Tanger...)"}
          </span>
        </div>
        <span className="material-symbols-outlined text-slate-400 text-sm">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {/* Menu déroulant avec recherche rapide */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 overflow-hidden"
          >
            {/* Input de recherche rapide */}
            <div className="relative mb-2">
              <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                autoFocus
                placeholder="Rechercher parmi 150+ villes du Maroc..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 transition"
              />
            </div>

            {/* Villes principales d'accès rapide si recherche vide */}
            {!search && (
              <div className="mb-2 pb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 px-1">
                  Accès rapide :
                </span>
                <div className="flex flex-wrap gap-1 px-1">
                  {["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                        value === c
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Liste complète des villes scrollable */}
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {filteredCities.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  Aucune ville trouvée pour "{search}"
                </div>
              ) : (
                filteredCities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelect(city.name)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition cursor-pointer ${
                      value === city.name
                        ? "bg-slate-900 text-white font-bold"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <span className="font-medium">{city.name}</span>
                    <span
                      className={`text-[10px] ${
                        value === city.name ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {city.region}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
