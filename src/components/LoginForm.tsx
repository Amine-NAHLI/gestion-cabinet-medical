"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  role: 'doctor' | 'assistant';
  setRole: (role: 'doctor' | 'assistant') => void;
}

export default function LoginForm({ role, setRole }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const router = useRouter();

  const handleRoleSelect = (selectedRole: 'doctor' | 'assistant') => {
    setRole(selectedRole);
    setEmail("");
    setPassword("");
    setError("");
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
      setError("Identifiants incorrects. Veuillez réessayer.");
      setIsLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="w-full">
      {/* Sleek Segmented Control for Role Selection */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex mb-8 border border-slate-200/50 backdrop-blur-sm relative overflow-hidden">
        <button
          type="button"
          onClick={() => handleRoleSelect('doctor')}
          className={`group flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 relative z-10 ${
            role === 'doctor'
              ? 'bg-white text-sky-700 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          {/* 4. Micro-animations sur les icônes */}
          <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${role === 'doctor' ? 'scale-110' : 'group-hover:scale-110 group-hover:-rotate-6'}`}>stethoscope</span>
          Médecin
        </button>
        <button
          type="button"
          onClick={() => handleRoleSelect('assistant')}
          className={`group flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 relative z-10 ${
            role === 'assistant'
              ? 'bg-white text-teal-700 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${role === 'assistant' ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-6'}`}>assignment_ind</span>
          Assistante
        </button>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="flex items-center gap-3 text-rose-600 bg-rose-50/80 p-4 rounded-xl text-sm font-semibold border border-rose-100 animate-in fade-in slide-in-from-top-2">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        <div className="space-y-1.5 group/field">
          <label className="block text-xs font-bold tracking-wide text-slate-500 uppercase ml-1 transition-colors group-focus-within/field:text-sky-600" htmlFor="email-field">
            Adresse Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/field:text-sky-500 transition-colors z-10">
              <span className="material-symbols-outlined text-[20px]">mail</span>
            </div>
            {/* 3. Effet "Glow" sur les champs de texte : shadow-sky-500/20 */}
            <input 
              id="email-field"
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bonjour@cabinet.com" 
              required 
              className="relative z-0 w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white/70 text-slate-900 text-sm font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/20 focus:shadow-[0_0_15px_rgba(14,165,233,0.15)] transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5 group/field">
          <div className="flex items-center justify-between ml-1">
            <label className="block text-xs font-bold tracking-wide text-slate-500 uppercase transition-colors group-focus-within/field:text-sky-600" htmlFor="password-field">
              Mot de passe
            </label>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline transition-all">
              Oublié ?
            </a>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/field:text-sky-500 transition-colors z-10">
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </div>
            <input 
              id="password-field"
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required 
              className="relative z-0 w-full pl-11 pr-12 py-3.5 rounded-xl border border-slate-200 bg-white/70 text-slate-900 text-sm font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/20 focus:shadow-[0_0_15px_rgba(14,165,233,0.15)] transition-all"
            />
            <button 
              type="button"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-sky-600 transition-colors focus:outline-none z-10"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isPasswordVisible ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full relative overflow-hidden group flex items-center justify-center gap-2 py-4 px-6 rounded-xl text-white text-sm font-bold shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-70 disabled:hover:translate-y-0 ${
              role === 'doctor' 
                ? 'bg-gradient-to-r from-sky-600 to-sky-500 shadow-sky-500/30 hover:shadow-sky-500/40' 
                : 'bg-gradient-to-r from-teal-600 to-teal-500 shadow-teal-500/30 hover:shadow-teal-500/40'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? 'Connexion en cours...' : `Accéder à mon espace`}
              <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                {isLoading ? 'sync' : 'arrow_forward'}
              </span>
            </span>
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 w-full h-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
          </button>
        </div>
      </form>
    </div>
  );
}
