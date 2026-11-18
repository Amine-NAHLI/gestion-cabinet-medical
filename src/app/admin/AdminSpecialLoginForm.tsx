"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminSpecialLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        redirect: false,
      });

      if (res?.error) {
        setError("Identifiants Super Administrateur invalides.");
        setIsLoading(false);
        return;
      }

      // Redirection immédiate sur le panneau Super Admin
      window.location.href = "/admin";
    } catch {
      setError("Erreur de connexion au serveur.");
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F8F9FB",
        color: "#0f172a",
        padding: "1rem",
      }}
      className="min-h-screen w-full bg-[#F8F9FB] text-slate-900 flex items-center justify-center p-4"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          padding: "2rem",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.06)",
        }}
        className="w-full max-w-[400px] bg-white border border-slate-200/90 rounded-xl p-7 sm:p-8 shadow-[0_1px_3px_rgba(16,24,40,0.06)]"
      >
        {/* En-tête sobre Admin */}
        <div className="mb-6">
          <p className="text-xs font-medium text-slate-500 mb-1">
            Mon<span className="text-sky-700 font-semibold">Cabinet</span> • Administration
          </p>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Connexion administrateur
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Accès réservé à la gestion centrale de la plateforme.
          </p>
        </div>

        {/* Message d'erreur */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-base text-red-500 shrink-0">lock_clock</span>
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulaire spécial Super Admin */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="admin-email">
              Identifiant Super Admin
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
              </div>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nahliamine95@gmail.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700" htmlFor="admin-password">
                Mot de Passe Maître
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Chiffrement AES-256</span>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                <span className="material-symbols-outlined text-[18px]">key</span>
              </div>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wider shadow-md shadow-slate-900/10 transition-all duration-200 cursor-pointer disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  <span>Vérification des accès...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">lock_open</span>
                  <span>Ouvrir la Console Super Admin</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Console réservée à l'administrateur MonCabinet
          </p>
        </div>
      </div>
    </div>
  );
}
