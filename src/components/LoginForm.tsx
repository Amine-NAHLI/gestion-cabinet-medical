"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface LoginFormProps {
  role: 'doctor' | 'assistant';
  setRole: (role: 'doctor' | 'assistant') => void;
}

export default function LoginForm({ role, setRole }: LoginFormProps) {
  const [email, setEmail] = useState("medecin@cabinet.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const router = useRouter();

  const handleRoleSelect = (selectedRole: 'doctor' | 'assistant') => {
    setRole(selectedRole);
    setError("");
    if (selectedRole === 'doctor') {
      setEmail("medecin@cabinet.com");
      setPassword("password123");
    } else {
      setEmail("assistante@cabinet.com");
      setPassword("password123");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
      setIsLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Sélecteur de Rôle Style iOS / macOS Segmented Control */}
      <div>
        <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => handleRoleSelect('doctor')}
            className={`relative py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === 'doctor'
                ? 'text-slate-900 font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {role === 'doctor' && (
              <motion.div
                layoutId="roleActivePill"
                className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/70"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span
              className={`relative z-10 material-symbols-outlined text-[18px] transition-colors ${
                role === 'doctor' ? 'text-sky-600' : 'text-slate-400'
              }`}
            >
              stethoscope
            </span>
            <span className="relative z-10 tracking-tight">Médecin</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect('assistant')}
            className={`relative py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === 'assistant'
                ? 'text-slate-900 font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {role === 'assistant' && (
              <motion.div
                layoutId="roleActivePill"
                className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/70"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span
              className={`relative z-10 material-symbols-outlined text-[18px] transition-colors ${
                role === 'assistant' ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              assignment_ind
            </span>
            <span className="relative z-10 tracking-tight">Assistante</span>
          </button>
        </div>
      </div>

      {/* 2. Badges Démo Chic & Discrets */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs text-amber-500">bolt</span>
          Accès rapide :
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleRoleSelect('doctor')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all border ${
              role === 'doctor'
                ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Dr. Vance
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('assistant')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all border ${
              role === 'assistant'
                ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Sarah
          </button>
        </div>
      </div>

      {/* Message d'erreur */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium shadow-xs"
          >
            <span className="material-symbols-outlined text-sm text-red-500">error</span>
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulaire */}
      <form className="space-y-3" onSubmit={handleSubmit}>
        {/* Email avec Focus Glow */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="email-field">
            Identifiant
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[18px]">alternate_email</span>
            </div>
            <input
              id="email-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="adresse@cabinet.com"
              required
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-500 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Mot de passe */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500" htmlFor="password-field">
              Mot de passe
            </label>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert("Identifiants par défaut : medecin@cabinet.com ou assistante@cabinet.com / password123");
              }}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition"
            >
              Oublié ?
            </a>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[18px]">lock</span>
            </div>
            <input
              id="password-field"
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-500 transition-all shadow-xs"
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isPasswordVisible ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {/* Checkbox */}
        <div className="flex items-center pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300 focus:ring-slate-900 cursor-pointer"
              defaultChecked
            />
            <span className="text-[11px] text-slate-500 font-medium">Mémoriser la session sur cet appareil</span>
          </label>
        </div>

        {/* Bouton de Connexion Exécutif Chic avec Reflet */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full group relative overflow-hidden flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-white font-bold text-xs tracking-wide shadow-md transition-all duration-200 cursor-pointer disabled:opacity-70 ${
              role === 'doctor'
                ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 shadow-slate-900/20 active:scale-[0.99]'
                : 'bg-gradient-to-b from-teal-900 via-teal-800 to-teal-950 hover:from-teal-800 hover:to-teal-900 shadow-teal-900/20 active:scale-[0.99]'
            }`}
          >
            {/* Liseré supérieur réfléchissant */}
            <div className="absolute inset-x-0 top-0 h-px bg-white/20 pointer-events-none" />

            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                <span>Authentification en cours...</span>
              </>
            ) : (
              <>
                <span>Ouvrir l'Espace {role === 'doctor' ? 'Médecin' : 'Assistante'}</span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
